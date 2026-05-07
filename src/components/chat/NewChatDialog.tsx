import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, MessageCircle } from "lucide-react";
import { useSearchUsers, useCreateChat } from "@/hooks/useRealtimeChat";
import type { ProfileRow } from "@/hooks/useRealtimeChat";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (chatId: string) => void;
}

export function NewChatDialog({ open, onOpenChange, onChatCreated }: NewChatDialogProps) {
  const [query, setQuery] = useState("");
  const { results, loading } = useSearchUsers(query);
  const createChat = useCreateChat();
  const [creating, setCreating] = useState(false);

  const handleSelect = async (user: ProfileRow) => {
    setCreating(true);
    const chatId = await createChat(user.id);
    if (chatId) onChatCreated(chatId);
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display gradient-text">New Conversation</DialogTitle>
        </DialogHeader>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by username or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full h-10 rounded-xl bg-input/50 border border-border pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        <div className="mt-3 max-h-64 overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 border-2 border-neon border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 && query.length >= 2 ? (
            <p className="text-center text-sm text-muted-foreground py-6">No users found</p>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelect(u)}
                disabled={creating}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-all text-left"
              >
                <div className="relative flex-shrink-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
                      {u.display_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                  {u.is_online && (
                    <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-accent border-2 border-surface" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{u.display_name || u.username || "User"}</p>
                  {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
                </div>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
