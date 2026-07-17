import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Eye, Trash2, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCreateChat, useSendMessage } from "@/hooks/useRealtimeChat";
import { useDeleteStory, useReactToStory, useRecordStoryView, useStoryAudience, type StoryGroup } from "@/hooks/useStories";
import { formatDistanceToNow } from "date-fns";

const REACTIONS = ["❤️", "🔥", "😂", "😍", "👏"];
const IMAGE_DURATION = 5000;

interface Props {
  open: boolean;
  groups: StoryGroup[]; // each group = one author
  startGroupIndex: number;
  onClose: () => void;
}

export function StoryViewer({ open, groups, startGroupIndex, onClose }: Props) {
  const { user } = useAuth();
  const [groupIdx, setGroupIdx] = useState(startGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [, forceProgressReset] = useState(0);
  const [holdPaused, setHoldPaused] = useState(false);
  const [reply, setReply] = useState("");
  const [showViewers, setShowViewers] = useState(false);
  const [sending, setSending] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeBarRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);

  const recordView = useRecordStoryView();
  const react = useReactToStory();
  const del = useDeleteStory();
  const createChat = useCreateChat();
  const sendMessage = useSendMessage();

  useEffect(() => { if (open) { setGroupIdx(startGroupIndex); setStoryIdx(0); } }, [open, startGroupIndex]);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];
  const isOwner = !!user && story?.user_id === user.id;

  const { viewers, reactions } = useStoryAudience(story?.id ?? null, isOwner && open);

  // Any overlay opened on top of the viewer must pause the whole story lifecycle
  // (timers, progress, media, auto-next, gestures). Add future overlays to this list.
  const overlayOpen = showViewers;
  const paused = holdPaused || overlayOpen;

  const next = () => {
    if (!group) return;
    if (storyIdx + 1 < group.stories.length) setStoryIdx(i => i + 1);
    else if (groupIdx + 1 < groups.length) { setGroupIdx(i => i + 1); setStoryIdx(0); }
    else onClose();
  };
  const prev = () => {
    if (storyIdx > 0) setStoryIdx(i => i - 1);
    else if (groupIdx > 0) { setGroupIdx(i => i - 1); setStoryIdx((groups[groupIdx - 1]?.stories.length ?? 1) - 1); }
  };

  // Direct DOM writer — avoids re-rendering the whole viewer every animation frame.
  const writeProgress = (p: number) => {
    const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
    progressRef.current = clamped;
    if (activeBarRef.current) activeBarRef.current.style.width = `${clamped * 100}%`;
  };

  // record view + reset progress on story change
  useEffect(() => {
    if (!open || !story) return;
    recordView(story.id);
    writeProgress(0);
    elapsedRef.current = 0;
    setShowViewers(false);
    forceProgressReset(v => v + 1);
  }, [open, story?.id, recordView]);

  // Unified RAF loop: drives both image timers and video progress at 60fps
  // by reading directly from the video element each frame (never depending on
  // the coarse `timeupdate` event).
  useEffect(() => {
    if (!open || !story || paused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const isVideo = story.media_type === "video";
    startRef.current = performance.now();

    const tick = (now: number) => {
      let p = 0;
      if (isVideo) {
        const v = videoRef.current;
        if (v && v.duration > 0 && !v.paused && v.readyState >= 2) {
          p = v.currentTime / v.duration;
        } else {
          p = progressRef.current; // buffering / not ready — freeze
        }
      } else {
        const elapsed = elapsedRef.current + (now - startRef.current);
        p = Math.min(1, elapsed / IMAGE_DURATION);
      }
      writeProgress(p);
      if (p >= 1) { next(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (!isVideo) elapsedRef.current += performance.now() - startRef.current;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, story?.id, paused]);

  // video playback pause/resume
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) v.pause(); else v.play().catch(() => {});
  }, [paused, story?.id]);


  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 3) prev(); else next();
  };

  const handleReact = async (emoji: string) => {
    if (!story) return;
    const { error } = await react(story.id, emoji);
    if (error) toast.error(error.message); else toast.success(`Reacted ${emoji}`);
  };

  const handleSendReply = async () => {
    if (!story || !reply.trim()) return;
    setSending(true);
    const { chatId, error } = await createChat(story.user_id);
    if (error || !chatId) { toast.error(error?.message ?? "Could not reply"); setSending(false); return; }
    const replyText = `↪︎ Replied to your story: ${reply.trim()}`;
    const { error: sendErr } = await sendMessage(chatId, replyText);
    setSending(false);
    if (sendErr) toast.error(sendErr.message);
    else { toast.success("Reply sent"); setReply(""); }
  };

  const handleDelete = async () => {
    if (!story) return;
    if (!confirm("Delete this story?")) return;
    const { error } = await del(story.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    next();
  };

  const reactionCounts = useMemo(() => {
    const m = new Map<string, number>();
    reactions.forEach(r => m.set(r.reaction, (m.get(r.reaction) ?? 0) + 1));
    return m;
  }, [reactions]);

  if (!open || !group || !story) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="story-viewer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        drag={overlayOpen ? false : "y"}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.4}
        onDragEnd={(_, info) => { if (!overlayOpen && info.offset.y > 120) onClose(); }}
        className="fixed inset-0 z-[90] bg-black flex flex-col"
      >
        {/* progress bars */}
        <div className="absolute top-0 inset-x-0 z-20 flex gap-1 px-3 pt-[env(safe-area-inset-top,12px)] pt-3">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: `${i < storyIdx ? 100 : i === storyIdx ? progress * 100 : 0}%`, transition: i === storyIdx ? "none" : undefined }}
              />
            </div>
          ))}
        </div>

        {/* header */}
        <div className="absolute top-0 inset-x-0 z-20 px-4 pt-[calc(env(safe-area-inset-top,12px)+18px)] flex items-center gap-3">
          {group.user.avatar_url ? (
            <img src={group.user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-primary-foreground">
              {(group.user.display_name ?? "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{group.user.display_name ?? group.user.username ?? "User"}</p>
            <p className="text-white/70 text-[11px]">{formatDistanceToNow(new Date(story.created_at), { addSuffix: true })}</p>
          </div>
          {isOwner && (
            <button onClick={handleDelete} className="h-9 w-9 rounded-full flex items-center justify-center bg-white/10 text-white">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button onClick={onClose} className="h-9 w-9 rounded-full flex items-center justify-center bg-white/10 text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* media + tap zones */}
        <div
          className="flex-1 relative select-none"
          onPointerDown={() => !overlayOpen && setHoldPaused(true)}
          onPointerUp={() => setHoldPaused(false)}
          onPointerLeave={() => setHoldPaused(false)}
          onClick={overlayOpen ? undefined : handleTap}
        >
          {story.media_type === "video" ? (
            <video
              ref={videoRef}
              src={story.media_url}
              className="absolute inset-0 h-full w-full object-contain"
              autoPlay
              playsInline
              onTimeUpdate={handleVideoTime}
              onEnded={next}
            />
          ) : (
            <img src={story.media_url} alt="" className="absolute inset-0 h-full w-full object-contain" />
          )}
          {story.caption && (
            <div className="absolute bottom-24 inset-x-0 px-6 pointer-events-none">
              <p className="text-white text-base text-center drop-shadow-lg">{story.caption}</p>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="absolute bottom-0 inset-x-0 z-20 px-4 pb-[env(safe-area-inset-bottom,12px)] pb-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
          {isOwner ? (
            <button
              onClick={() => setShowViewers(true)}
              className="w-full py-3 rounded-2xl bg-white/10 backdrop-blur text-white text-sm font-medium flex items-center justify-center gap-2"
            >
              <Eye className="h-4 w-4" /> {viewers.length} {viewers.length === 1 ? "view" : "views"}
              {reactions.length > 0 && <span className="ml-2">· {reactions.length} ❤</span>}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-center gap-3">
                {REACTIONS.map(r => (
                  <motion.button
                    key={r}
                    whileTap={{ scale: 1.3 }}
                    onClick={() => handleReact(r)}
                    className="h-11 w-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-xl"
                  >
                    {r}
                  </motion.button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onFocus={() => setHoldPaused(true)}
                  onBlur={() => setHoldPaused(false)}
                  placeholder={`Reply to ${group.user.display_name ?? "story"}…`}
                  className="flex-1 h-11 rounded-2xl bg-white/15 backdrop-blur px-4 text-sm text-white placeholder:text-white/60 focus:outline-none"
                />
                <button
                  onClick={handleSendReply}
                  disabled={!reply.trim() || sending}
                  className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Viewers sheet (owner) */}
        <AnimatePresence>
          {showViewers && isOwner && (
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 top-1/3 z-30 bg-background rounded-t-3xl border-t border-glass-border flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <p className="font-semibold text-sm">Viewers · {viewers.length}</p>
                <button onClick={() => setShowViewers(false)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-secondary">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {viewers.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">No views yet</p>}
                {viewers.map(v => {
                  const userReactions = reactions.filter(r => r.user_id === v.viewer_id).map(r => r.reaction);
                  return (
                    <div key={v.viewer_id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary/40">
                      {v.profile?.avatar_url ? (
                        <img src={v.profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-xs font-bold">
                          {(v.profile?.display_name ?? "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{v.profile?.display_name ?? v.profile?.username ?? "User"}</p>
                        <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(v.viewed_at), { addSuffix: true })}</p>
                      </div>
                      {userReactions.length > 0 && <span className="text-base">{userReactions.join("")}</span>}
                    </div>
                  );
                })}
                {reactionCounts.size > 0 && (
                  <div className="mt-4 px-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Reactions</p>
                    <div className="flex flex-wrap gap-2">
                      {[...reactionCounts.entries()].map(([r, c]) => (
                        <span key={r} className="px-3 py-1 rounded-full bg-secondary text-sm">{r} {c}</span>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={() => handleReact("❤️")} className="hidden"><Heart /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
