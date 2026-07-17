import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { useStoriesFeed, type StoryGroup } from "@/hooks/useStories";
import { useAuth } from "@/hooks/useAuth";
import { StoryComposer } from "./StoryComposer";
import { StoryViewer } from "./StoryViewer";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";


export function StoriesView() {
  const { user } = useAuth();
  const { groups, myStories, loading } = useStoriesFeed();
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerGroups, setViewerGroups] = useState<StoryGroup[] | null>(null);
  const [viewerStart, setViewerStart] = useState(0);

  const openViewer = (gs: StoryGroup[], idx: number) => {
    setViewerGroups(gs);
    setViewerStart(idx);
  };

  const openMyStories = () => {
    if (!user || myStories.length === 0) {
      setComposerOpen(true);
      return;
    }
    openViewer(
      [{
        user: {
          id: user.id,
          username: null, display_name: "Your Story", avatar_url: null,
          bio: null, status_text: null, is_online: true, last_seen: new Date().toISOString(),
        },
        stories: myStories,
        has_unviewed: false,
      }],
      0,
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-5 pt-[env(safe-area-inset-top,12px)] pb-2">
        <div className="flex items-center gap-2 py-3">
          <Sparkles className="h-6 w-6 text-neon" />
          <span className="font-display font-bold text-2xl gradient-text">Stories</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">Moments that disappear in 24 hours</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-3">
        {/* Your Story */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl glass-panel border border-glass-border p-4 flex items-center gap-3"
        >
          <button onClick={openMyStories} className="relative flex-shrink-0">
            <div className={cn(
              "h-14 w-14 rounded-full p-[2px]",
              myStories.length > 0 ? "bg-gradient-to-tr from-primary via-accent to-primary animate-pulse-neon" : "bg-secondary",
            )}>
              <div className="h-full w-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url as string} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-bold">{(user?.email ?? "?").charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background">
              <Plus className="h-3.5 w-3.5" />
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Your Story</p>
            <p className="text-xs text-muted-foreground">
              {myStories.length > 0
                ? `${myStories.length} active · tap to view, + to add`
                : "Tap to share a photo or video"}
            </p>
          </div>
          <button
            onClick={() => setComposerOpen(true)}
            className="px-3 py-2 rounded-xl bg-primary/15 text-neon text-xs font-semibold border border-primary/20"
          >
            New
          </button>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-neon" /></div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 px-6">
            <p className="text-sm text-muted-foreground">No stories from others yet. Be the first to share.</p>
          </div>
        ) : (
          groups.map((g, i) => {
            const latest = g.stories[g.stories.length - 1];
            return (
              <motion.button
                key={g.user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openViewer(groups, i)}
                className="w-full rounded-2xl glass-panel border border-glass-border p-3 flex items-center gap-3 text-left"
              >
                <div className={cn(
                  "h-14 w-14 rounded-full p-[2px] flex-shrink-0",
                  g.has_unviewed
                    ? "bg-gradient-to-tr from-primary via-accent to-primary animate-pulse-neon"
                    : "bg-border",
                )}>
                  <div className="h-full w-full rounded-full bg-background overflow-hidden">
                    {g.user.avatar_url ? (
                      <img src={g.user.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-lg font-bold">
                        {(g.user.display_name ?? "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] truncate">{g.user.display_name ?? g.user.username ?? "User"}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.stories.length} {g.stories.length === 1 ? "story" : "stories"} · {formatDistanceToNow(new Date(latest.created_at), { addSuffix: true })}
                  </p>
                </div>
                {g.user.is_online && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
              </motion.button>
            );
          })
        )}
      </div>

      <StoryComposer open={composerOpen} onClose={() => setComposerOpen(false)} />
      {viewerGroups && (
        <StoryViewer
          open={!!viewerGroups}
          groups={viewerGroups}
          startGroupIndex={viewerStart}
          onClose={() => setViewerGroups(null)}
        />
      )}
    </div>
  );
}
