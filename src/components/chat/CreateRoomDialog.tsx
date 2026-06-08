import { useState } from "react";
import { motion } from "framer-motion";
import { X, Camera, Loader2, Users, Lock } from "lucide-react";
import { useRoomActions } from "@/hooks/useRooms";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (roomId: string) => void;
}

export function CreateRoomDialog({ open, onClose, onCreated }: Props) {
  const { createRoom } = useRoomActions();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const reset = () => { setName(""); setDesc(""); setIsPrivate(false); setAvatar(null); setPreview(null); };

  const submit = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    setBusy(true);
    const { error, roomId } = await createRoom({ name, description: desc, is_private: isPrivate, avatar });
    setBusy(false);
    if (error || !roomId) { toast.error(error?.message ?? "Failed"); return; }
    toast.success("Room created");
    reset();
    onCreated(roomId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2">
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md glass-panel border border-glass-border rounded-3xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg gradient-text">Create Room</h2>
          <button onClick={() => { reset(); onClose(); }} className="p-1.5 rounded-full hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex justify-center">
          <label className="relative h-20 w-20 rounded-2xl bg-secondary border border-glass-border flex items-center justify-center overflow-hidden cursor-pointer">
            {preview ? (
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-6 w-6 text-muted-foreground" />
            )}
            <input
              type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setAvatar(f); setPreview(URL.createObjectURL(f));
              }}
            />
          </label>
        </div>

        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name"
          className="w-full px-4 py-3 rounded-xl bg-secondary/40 border border-glass-border text-sm outline-none focus:border-primary/50"
          maxLength={60}
        />
        <textarea
          value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this room about?"
          className="w-full px-4 py-3 rounded-xl bg-secondary/40 border border-glass-border text-sm outline-none focus:border-primary/50 resize-none"
          rows={3} maxLength={200}
        />

        <div className="flex gap-2">
          <button
            onClick={() => setIsPrivate(false)}
            className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm ${!isPrivate ? "bg-primary/15 border-primary/40 text-foreground" : "bg-secondary/30 border-glass-border text-muted-foreground"}`}
          ><Users className="h-4 w-4" />Public</button>
          <button
            onClick={() => setIsPrivate(true)}
            className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm ${isPrivate ? "bg-primary/15 border-primary/40 text-foreground" : "bg-secondary/30 border-glass-border text-muted-foreground"}`}
          ><Lock className="h-4 w-4" />Private</button>
        </div>

        <button
          onClick={submit} disabled={busy || !name.trim()}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Room"}</button>
      </motion.div>
    </div>
  );
}
