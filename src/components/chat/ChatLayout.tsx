import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatSidebar } from "./ChatSidebar";
import { ChatWindow } from "./ChatWindow";
import { Menu, X } from "lucide-react";

export function ChatLayout() {
  const [selectedChat, setSelectedChat] = useState<string | null>("1");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 w-80 lg:w-80
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <ChatSidebar
          selectedChat={selectedChat}
          onSelectChat={(id) => {
            setSelectedChat(id);
            setSidebarOpen(false);
          }}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center h-14 px-4 border-b border-border glass-panel rounded-none">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 font-display font-semibold gradient-text">Aura</span>
        </div>

        <ChatWindow chatId={selectedChat} />
      </div>
    </div>
  );
}
