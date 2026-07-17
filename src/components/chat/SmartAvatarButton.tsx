import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive, ArchiveRestore, BellOff, Bell, Pin, PinOff, User as UserIcon, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCalls } from "@/hooks/useCalls";
import type { ProfileRow } from "@/hooks/useRealtimeChat";
import type { StoryGroup } from "@/hooks/useStories";
import { StoryViewer } from "./StoryViewer";
import { ProfilePhotoPreview } from "./ProfilePhotoPreview";
import { ChatProfileSheet } from "./ChatProfileSheet";
import { cn } from "@/lib/utils";

interface Chat {
  id: string;
  is_group: boolean;
  is_pinned?: boolean;
  is_muted?: boolean;
  is_archived?: boolean;
}

interface Props {
  chat: Chat;
  displayName: string;
  avatarUrl: string | null;
  isOnline?: boolean;
  otherUser: ProfileRow | null; // null for groups
  storyGroup?: StoryGroup;      // undefined if user has no active story
  onOpenChat: () => void;       // navigate to chat window (Message action)
}

const LONG_PRESS_MS = 450;

/**
 * Smart profile avatar for the chat list.
 *
 *  - Tap with unviewed story  -> open StoryViewer at first unviewed
 *  - Tap without/viewed story -> open ProfilePhotoPreview (WhatsApp-style)
 *  - Long-press                -> quick actions sheet
 *  - Group avatars keep tap == open chat (no preview / story surface)
 */
export function SmartAvatarButton({
  chat, displayName, avatarUrl, isOnline, otherUser, storyGroup, onOpenChat,
}: Props) {
  const { user } = useAuth();
  const { startCall } = useCalls();
  const [storyOpen, setStoryOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const hasStory = !!storyGroup;
  const hasUnviewed = !!storyGroup?.has_unviewed;

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const onPointerDown = () => {
    longPressed.current = false;
    clearTimer();
    timer.current = setTimeout(() => {
      longPressed.current = true;
      // haptic hint on supported devices
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { (navigator as Navigator & { vibrate: (p: number) => boolean }).vibrate(10); } catch { /* noop */ }
      }
      setActionsOpen(true);
    }, LONG_PRESS_MS);
  };

  const onPointerUpOrLeave = () => clearTimer();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    // Group avatars: tap opens the chat directly (no personal profile surface)
    if (chat.is_group || !otherUser) {
      onOpenChat();
      return;
    }
    if (hasUnviewed) {
      setStoryOpen(true);
    } else {
      setPreviewOpen(true);
    }
  };

  const updateMember = useCallback(async (patch: Record<string, boolean>) => {
    if (!user) return;
    const { error } = await supabase
      .from("chat_members")
      .update(patch)
      .eq("chat_id", chat.id)
      .eq("user_id", user.id);
    if (error) toast.error(error.message);
    else window.dispatchEvent(new CustomEvent("aurix:chat-member-updated", { detail: { chatId: chat.id, patch } }));
  }, [chat.id, user]);

  const callVoice = async () => {
    if (!otherUser) return;
    try { await startCall(otherUser.id, "voice", chat.id); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Call failed"); }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUpOrLeave}
        onPointerLeave={onPointerUpOrLeave}
        onPointerCancel={onPointerUpOrLeave}
        onContextMenu={(e) => { e.preventDefault(); }}
        className="relative flex-shrink-0 outline-none select-none touch-manipulation"
      >
        <motion.div whileTap={{ scale: 0.94 }} className="relative">
          {hasUnviewed ? (
            <div className="h-14 w-14 rounded-full p-[2px] bg-gradient-to-tr from-primary via-accent to-primary">
              <div className="h-full w-full rounded-full bg-background p-[2px]">
                <div className="h-full w-full rounded-full overflow-hidden">
                  <AvatarInner avatar={avatarUrl} label={displayName} isGroup={chat.is_group} />
                </div>
              </div>
            </div>
          ) : (
            <div className={cn(
              "h-14 w-14 rounded-full overflow-hidden",
              hasStory && "ring-2 ring-border/70",
            )}>
              <AvatarInner avatar={avatarUrl} label={displayName} isGroup={chat.is_group} />
            </div>
          )}
          {isOnline && (
            <div className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-accent border-2 border-background" />
          )}
        </motion.div>
      </div>

      {/* Story viewer */}
      {storyOpen && storyGroup && (
        <StoryViewer
          open={storyOpen}
          groups={[storyGroup]}
          startGroupIndex={0}
          onClose={() => setStoryOpen(false)}
        />
      )}

      {/* WhatsApp-style photo preview */}
      <ProfilePhotoPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        profile={otherUser}
        onMessage={onOpenChat}
        onCall={callVoice}
        onViewProfile={() => setProfileOpen(true)}
      />

      {/* Full profile sheet */}
      <ChatProfileSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        partner={otherUser}
        chatId={chat.id}
      />

      {/* Long-press quick actions */}
      <QuickActionsSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title={displayName}
        canViewStory={hasStory && !chat.is_group}
        chat={chat}
        onViewProfile={() => { setActionsOpen(false); setProfileOpen(true); }}
        onViewStory={() => { setActionsOpen(false); setStoryOpen(true); }}
        onToggleMute={() => { setActionsOpen(false); updateMember({ is_muted: !chat.is_muted }); }}
        onTogglePin={() => { setActionsOpen(false); updateMember({ is_pinned: !chat.is_pinned }); }}
        onToggleArchive={() => { setActionsOpen(false); updateMember({ is_archived: !chat.is_archived }); }}
      />
    </>
  );
}

function AvatarInner({ avatar, label, isGroup }: { avatar: string | null; label: string; isGroup: boolean }) {
  if (avatar && avatar.startsWith("http")) {
    return <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" loading="lazy" decoding="async" />;
  }
  return (
    <div className="h-full w-full rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-lg font-bold">
      {isGroup ? "👥" : (label?.charAt(0)?.toUpperCase() || "?")}
    </div>
  );
}

interface QuickActionsProps {
  open: boolean;
  onClose: () => void;
  title: string;
  canViewStory: boolean;
  chat: Chat;
  onViewProfile: () => void;
  onViewStory: () => void;
  onToggleMute: () => void;
  onTogglePin: () => void;
  onToggleArchive: () => void;
}

function QuickActionsSheet({
  open, onClose, title, canViewStory, chat,
  onViewProfile, onViewStory, onToggleMute, onTogglePin, onToggleArchive,
}: QuickActionsProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-[81] pb-[max(env(safe-area-inset-bottom),16px)] rounded-t-3xl bg-background border-t border-glass-border"
          >
            <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-border" />
            <div className="px-5 pt-2 pb-1 text-sm font-semibold text-muted-foreground truncate">{title}</div>
            <div className="px-2 pb-3">
              {!chat.is_group && (
                <QuickRow icon={<UserIcon className="h-5 w-5" />} label="View Profile" onClick={onViewProfile} />
              )}
              {canViewStory && (
                <QuickRow icon={<Eye className="h-5 w-5" />} label="View Story" onClick={onViewStory} />
              )}
              <QuickRow
                icon={chat.is_muted ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                label={chat.is_muted ? "Unmute" : "Mute"}
                onClick={onToggleMute}
              />
              <QuickRow
                icon={chat.is_pinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
                label={chat.is_pinned ? "Unpin Chat" : "Pin Chat"}
                onClick={onTogglePin}
              />
              <QuickRow
                icon={chat.is_archived ? <ArchiveRestore className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
                label={chat.is_archived ? "Unarchive" : "Archive"}
                onClick={onToggleArchive}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function QuickRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 h-12 rounded-2xl text-left text-[15px] font-medium hover:bg-secondary/60 active:bg-secondary/80 transition-colors"
    >
      <span className="h-9 w-9 rounded-full bg-primary/10 text-neon flex items-center justify-center">{icon}</span>
      {label}
    </motion.button>
  );
}
