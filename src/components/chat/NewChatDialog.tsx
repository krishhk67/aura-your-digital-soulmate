import { useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MessageCircle, Users, Sparkles, UserPlus, ArrowLeft, X, Check } from "lucide-react";
import { useSearchUsers, useCreateChat } from "@/hooks/useRealtimeChat";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { ProfileRow } from "@/hooks/useRealtimeChat";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChatCreated: (chatId: string) => void;
}

type Tab = "dm" | "group";

export function NewChatDialog({ open, onOpenChange, onChatCreated }: NewChatDialogProps) {
  const [tab, setTab] = useState<Tab>("dm");
  const [query, setQuery] = useState("");
  const { results, loading } = useSearchUsers(query);
  const createChat = useCreateChat();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);

  // Group chat state
  const [selectedUsers, setSelectedUsers] = useState<ProfileRow[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupStep, setGroupStep] = useState<"select" | "details">("select");

  const handleSelectDM = async (target: ProfileRow) => {
    setCreating(true);
    const chatId = await createChat(target.id);
    if (chatId) onChatCreated(chatId);
    setCreating(false);
  };

  const toggleGroupUser = (u: ProfileRow) => {
    setSelectedUsers(prev =>
      prev.find(p => p.id === u.id)
        ? prev.filter(p => p.id !== u.id)
        : [...prev, u]
    );
  };

  const handleCreateGroup = useCallback(async () => {
    if (!user || selectedUsers.length < 2 || !groupName.trim()) return;
    setCreating(true);
    const { data: chat, error } = await supabase
      .from("chats")
      .insert({ created_by: user.id, is_group: true, name: groupName.trim() })
      .select()
      .single();

    if (error || !chat) { setCreating(false); return; }

    await supabase.from("chat_members").insert([
      { chat_id: chat.id, user_id: user.id, role: "admin" },
      ...selectedUsers.map(u => ({ chat_id: chat.id, user_id: u.id })),
    ]);

    onChatCreated(chat.id);
    setCreating(false);
    resetGroup();
  }, [user, selectedUsers, groupName, onChatCreated]);

  const resetGroup = () => {
    setSelectedUsers([]);
    setGroupName("");
    setGroupStep("select");
  };

  const handleClose = (val: boolean) => {
    if (!val) { resetGroup(); setQuery(""); setTab("dm"); }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-panel border-border sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            {tab === "group" && groupStep === "details" ? (
              <button onClick={() => setGroupStep("select")} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <Sparkles className="h-5 w-5 text-neon animate-pulse" />
            )}
            <h2 className="font-display text-lg font-bold gradient-text">
              {tab === "dm" ? "New Conversation" : groupStep === "details" ? "Group Details" : "Create Group"}
            </h2>
            <button onClick={() => handleClose(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-secondary/50 mb-4">
            {([["dm", "Direct", MessageCircle], ["group", "Group", Users]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => { setTab(key); resetGroup(); setQuery(""); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === key ? "bg-primary/20 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Selected users chips for group */}
          {tab === "group" && selectedUsers.length > 0 && groupStep === "select" && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedUsers.map(u => (
                <motion.span
                  key={u.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/20 text-xs font-medium border border-primary/20"
                >
                  {u.display_name || u.username}
                  <button onClick={() => toggleGroupUser(u)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </motion.span>
              ))}
            </div>
          )}

          {/* Search bar - shown on DM and group select step */}
          {(tab === "dm" || (tab === "group" && groupStep === "select")) && (
            <div className="relative mb-2">
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
          )}
        </div>

        {/* Content */}
        <div className="px-5 pb-5">
          <AnimatePresence mode="wait">
            {tab === "group" && groupStep === "details" ? (
              <motion.div
                key="group-details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Group Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Squad Goals 🚀"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    autoFocus
                    className="w-full h-10 rounded-xl bg-input/50 border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">{selectedUsers.length} members selected</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 text-xs">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold">
                            {u.display_name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                        )}
                        {u.display_name || u.username}
                      </div>
                    ))}
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  disabled={!groupName.trim() || creating}
                  onClick={handleCreateGroup}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_20px_var(--neon-glow)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Users className="h-4 w-4" />
                      Create Group Chat
                    </>
                  )}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="user-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-h-72 overflow-y-auto space-y-0.5 -mx-1"
              >
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-5 w-5 border-2 border-neon border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : query.length < 2 ? (
                  <div className="text-center py-8">
                    <UserPlus className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-sm text-muted-foreground">Search for people to {tab === "dm" ? "start a conversation" : "add to your group"}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Type at least 2 characters</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No users found for "{query}"</p>
                  </div>
                ) : (
                  results.map((u) => {
                    const isSelected = selectedUsers.find(s => s.id === u.id);
                    return (
                      <motion.button
                        key={u.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => tab === "dm" ? handleSelectDM(u) : toggleGroupUser(u)}
                        disabled={tab === "dm" && creating}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                          isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary/50"
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-border" />
                          ) : (
                            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-sm font-bold ring-2 ring-border">
                              {u.display_name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          )}
                          {u.is_online && (
                            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-accent border-2 border-surface" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{u.display_name || u.username || "User"}</p>
                          {u.username && <p className="text-[11px] text-neon">@{u.username}</p>}
                          {u.bio && <p className="text-[10px] text-muted-foreground truncate mt-0.5 italic">"{u.bio}"</p>}
                        </div>
                        {tab === "group" ? (
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center border-2 transition-all ${
                            isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                          }`}>
                            {isSelected && <Check className="h-3 w-3" />}
                          </div>
                        ) : (
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </motion.button>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next button for group */}
          {tab === "group" && groupStep === "select" && selectedUsers.length >= 2 && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setGroupStep("details")}
              className="w-full mt-3 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_20px_var(--neon-glow)] transition-all flex items-center justify-center gap-2"
            >
              Next — {selectedUsers.length} selected
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </motion.button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
