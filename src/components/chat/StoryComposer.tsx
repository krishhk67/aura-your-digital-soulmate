import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ImagePlus, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { usePostStory } from "@/hooks/useStories";

interface Props { open: boolean; onClose: () => void }

export function StoryComposer({ open, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const post = usePostStory();

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (f: File) => {
    if (f.size > 25 * 1024 * 1024) {
      toast.error("File too large (max 25MB)");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) return;
    setPosting(true);
    const { error } = await post(file, caption);
    setPosting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Story posted ✨");
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-md z-[80]" onClick={handleClose} />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 top-12 z-[81] flex flex-col rounded-t-3xl glass-panel border-t border-glass-border overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <span className="font-display font-bold text-base gradient-text">New Story</span>
              <button onClick={handleClose} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-secondary text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center justify-center">
              {!preview ? (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full max-w-sm aspect-[9/14] rounded-3xl border-2 border-dashed border-primary/40 bg-secondary/20 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center">
                    <ImagePlus className="h-8 w-8 text-neon" />
                  </div>
                  <p className="font-display font-semibold">Pick a photo or video</p>
                  <p className="text-xs text-muted-foreground">Up to 25MB · expires in 24h</p>
                </button>
              ) : (
                <div className="w-full max-w-sm space-y-3">
                  <div className="aspect-[9/14] rounded-3xl overflow-hidden bg-black relative">
                    {file?.type.startsWith("video/") ? (
                      <video src={preview} className="h-full w-full object-cover" autoPlay loop muted playsInline />
                    ) : (
                      <img src={preview} alt="" className="h-full w-full object-cover" />
                    )}
                    {caption && (
                      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-white text-sm">{caption}</p>
                      </div>
                    )}
                  </div>
                  <input
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder="Add a caption…"
                    maxLength={200}
                    className="w-full px-4 py-3 rounded-2xl bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button onClick={() => { reset(); fileRef.current?.click(); }} className="text-xs text-muted-foreground underline">
                    Pick a different file
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {preview && (
              <div className="p-4 border-t border-border">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={submit}
                  disabled={posting}
                  className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_var(--neon-glow)] transition-all disabled:opacity-60"
                >
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {posting ? "Posting…" : "Share to your story"}
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
