import { motion } from "framer-motion";
import { MessageCircle, Compass, Users, Phone, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavTab = "chats" | "stories" | "rooms" | "calls" | "profile";

interface BottomNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  unreadCount?: number;
}

const tabs: { id: NavTab; label: string; icon: typeof MessageCircle }[] = [
  { id: "chats", label: "Chats", icon: MessageCircle },
  { id: "stories", label: "Stories", icon: Compass },
  { id: "rooms", label: "Rooms", icon: Users },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "profile", label: "Profile", icon: User },
];

export function BottomNav({ active, onChange, unreadCount = 0 }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[env(safe-area-inset-bottom,8px)]">
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="mx-auto max-w-lg rounded-2xl glass-panel border border-glass-border px-2 py-1.5 flex items-center justify-around"
        style={{
          boxShadow: "0 -4px 30px oklch(0 0 0 / 40%), 0 0 20px var(--neon-glow)",
        }}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.85 }}
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all",
                isActive ? "text-neon" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-glow"
                  className="absolute inset-0 rounded-xl bg-primary/10 border border-primary/20"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative z-10">
                <tab.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_var(--neon-glow)]")} />
                {tab.id === "chats" && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] font-medium relative z-10", isActive && "text-neon")}>{tab.label}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
