import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Image as ImageIcon, Film, MessageSquareText } from "lucide-react";
import { fetchStoryById, type StoryMessageMeta } from "@/hooks/useStories";
import { supabase } from "@/integrations/supabase/client";
import { StoryViewer } from "./StoryViewer";
import type { ProfileRow } from "@/hooks/useRealtimeChat";
import { cn } from "@/lib/utils";

interface Props {
  meta: StoryMessageMeta;
  isMe: boolean;
  isOwnerRecipient: boolean; // recipient is the story owner
  replyText?: string | null;
  ownerName?: string | null;
}

/**
 * WhatsApp-style rich story-reply card. Renders a compact preview of the
 * original story above the reply / reaction. Tap to open the original story.
 */
export function StoryReplyCard({ meta, isMe, isOwnerRecipient, replyText, ownerName }: Props) {
  const [opening, setOpening] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroup, setViewerGroup] = useState<{
    user: ProfileRow;
    stories: Array<{ id: string; user_id: string; media_url: string; media_type: string; caption: string | null; created_at: string; expires_at: string }>;
    has_unviewed: boolean;
  } | null>(null);

  const isReaction = meta.kind === "story_reaction";
  const isVideo = meta.media_type === "video";
  const isImage = meta.media_type === "image";

  const openStory = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const story = await fetchStoryById(meta.story_id);
      if (!story) {
        toast("This story is no longer available.");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles").select("*").eq("id", story.user_id).maybeSingle();
      if (!profile) {
        toast.error("Story author unavailable");
        return;
      }
      setViewerGroup({
        user: profile as ProfileRow,
        stories: [story],
        has_unviewed: false,
      });
      setViewerOpen(true);
    } finally {
      setOpening(false);
    }
  };

  const previewLabel = isVideo
    ? "🎥 Video"
    : isImage
    ? "📷 Photo"
    : meta.caption
    ? `💬 ${meta.caption.slice(0, 30)}${meta.caption.length > 30 ? "…" : ""}`
    : "Story";

  const ownerLabel = isMe
    ? (isOwnerRecipient ? `${ownerName ?? "You"} · Story` : "Story")
    : `${ownerName ?? "You"} · Story`;

  return (
    <>
      <div className={cn(
        "flex flex-col gap-1.5 min-w-[200px]",
      )}>
        {isReaction && (
          <p className={cn(
            "text-[11px] font-medium",
            isMe ? "text-primary-foreground/70" : "text-muted-foreground",
          )}>
            {meta.reaction} Reacted to {isOwnerRecipient ? "your" : "the"} story
          </p>
        )}

        {/* Rich preview card */}
        <motion.button
          onClick={openStory}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className={cn(
            "flex items-stretch gap-2 rounded-xl overflow-hidden text-left",
            "bg-black/25 backdrop-blur border border-white/10",
            "hover:bg-black/35 transition-colors",
          )}
        >
          {/* accent line */}
          <span className="w-[3px] flex-shrink-0 bg-gradient-to-b from-primary via-accent to-primary" />

          <div className="flex-1 py-2 pr-2 min-w-0">
            <p className="text-[11px] font-semibold text-neon truncate">
              {ownerLabel}
            </p>
            <p className="text-[12px] text-foreground/85 truncate mt-0.5 flex items-center gap-1">
              {isVideo ? <Film className="h-3 w-3" /> : isImage ? <ImageIcon className="h-3 w-3" /> : <MessageSquareText className="h-3 w-3" />}
              <span className="truncate">{previewLabel}</span>
            </p>
          </div>

          {/* thumbnail */}
          <div className="relative w-16 h-16 flex-shrink-0 rounded-[10px] overflow-hidden m-1 bg-secondary">
            {meta.media_url && isImage && (
              <img src={meta.media_url} alt="" className="h-full w-full object-cover" />
            )}
            {meta.media_url && isVideo && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={meta.media_url} muted playsInline className="h-full w-full object-cover" preload="metadata" />
            )}
            {!meta.media_url && (
              <div className="h-full w-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-white text-xs font-bold">
                {meta.caption?.slice(0, 2) ?? "•"}
              </div>
            )}
          </div>
        </motion.button>

        {/* Bottom section: reaction emoji or reply text */}
        {isReaction ? (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.05 }}
            className="text-3xl leading-none pl-1 pt-0.5"
          >
            {meta.reaction}
          </motion.div>
        ) : (
          replyText && (
            <p className="text-[14px] leading-relaxed pt-0.5">
              {replyText}
            </p>
          )
        )}
      </div>

      {viewerOpen && viewerGroup && (
        <StoryViewer
          open={viewerOpen}
          groups={[viewerGroup]}
          startGroupIndex={0}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}
