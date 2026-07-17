import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatSidebar } from "./ChatSidebar";
import { ChatWindow } from "./ChatWindow";
import { NewChatDialog } from "./NewChatDialog";
import { BottomNav, type NavTab } from "./BottomNav";
import { SettingsPanel } from "./SettingsPanel";
import { RoomsView } from "./RoomsView";
import { ProfileView } from "./ProfileView";
import { StoriesView } from "./StoriesView";
import { HiddenSpaceView } from "./HiddenSpaceView";
import { CallProvider } from "@/hooks/useCalls";
import { CallOverlay } from "@/components/calls/CallOverlay";
import { CallsHistoryView } from "@/components/calls/CallsHistoryView";
import { HiddenSpaceProvider, useHiddenSpace } from "@/hooks/useHiddenSpace";
import { useAuth } from "@/hooks/useAuth";

export function ChatLayout() {
  return (
    <HiddenSpaceProvider>
      <ChatLayoutInner />
    </HiddenSpaceProvider>
  );
}

function ChatLayoutInner() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>("chats");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user } = useAuth();

  const handleSelectChat = useCallback((id: string) => {
    setSelectedChat(id);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedChat(null);
  }, []);

  const handleTabChange = useCallback((tab: NavTab) => {
    setActiveTab(tab);
    if (tab !== "chats") setSelectedChat(null);
    if (tab === "profile") setSettingsOpen(true);
  }, []);

  if (!user) return null;

  // Mobile: show either chat list or chat window (not both)
  const showChatWindow = activeTab === "chats" && selectedChat;

  return (
    <CallProvider>
      <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Main content area */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {showChatWindow ? (
            <motion.div
              key="chat-window"
              initial={{ x: "100%", opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute inset-0 z-10"
            >
              <ChatWindow key={selectedChat} chatId={selectedChat} onBack={handleBack} />
            </motion.div>
          ) : activeTab === "rooms" ? (
            <motion.div
              key="rooms"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0"
            >
              <RoomsView />
            </motion.div>
          ) : activeTab === "stories" ? (
            <motion.div
              key="stories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0"
            >
              <StoriesView />
            </motion.div>
          ) : activeTab === "calls" ? (
            <motion.div
              key="calls"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0"
            >
              <CallsHistoryView />
            </motion.div>
          ) : (
            <motion.div
              key="chat-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <ChatSidebar
                selectedChat={selectedChat}
                onSelectChat={handleSelectChat}
                onNewChat={() => setNewChatOpen(true)}
                onOpenSettings={() => setSettingsOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom nav - hide when chat is open */}
      {!showChatWindow && (
        <BottomNav active={activeTab} onChange={handleTabChange} />
      )}

      {/* Safe area spacer for bottom nav */}
      {!showChatWindow && <div className="h-[72px]" />}

      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        onChatCreated={(id) => { setSelectedChat(id); setNewChatOpen(false); setActiveTab("chats"); }}
      />

        <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      </div>
      <CallOverlay />
      <HiddenSpaceOverlay />
    </CallProvider>
  );
}

function HiddenSpaceOverlay() {
  const hs = useHiddenSpace();
  return (
    <AnimatePresence>
      {hs.unlocked && <HiddenSpaceView key="hs" onClose={() => hs.lock()} />}
    </AnimatePresence>
  );
}
