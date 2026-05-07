import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Smile,
  Paperclip,
  Mic,
  Phone,
  Video,
  MoreVertical,
  Sparkles,
  ChevronDown,
  Check,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  sender: "me" | "them";
  time: string;
  status?: "sent" | "delivered" | "read";
  reaction?: string;
}

const mockMessages: Message[] = [
  { id: "1", text: "hey, have you seen the new update? 👀", sender: "them", time: "10:42 PM" },
  { id: "2", text: "omg yes!! the mood themes are actually insane", sender: "me", time: "10:43 PM", status: "read" },
  { id: "3", text: "right?? the rainy tokyo one hits different at 2am", sender: "them", time: "10:43 PM", reaction: "🔥" },
  { id: "4", text: "bruh i've been using ghost mode all week, it's so cinematic", sender: "me", time: "10:44 PM", status: "read" },
  { id: "5", text: "lmaooo the way messages dissolve is lowkey satisfying", sender: "them", time: "10:44 PM" },
  { id: "6", text: "also the AI smart replies are scary accurate 😭", sender: "them", time: "10:45 PM" },
  { id: "7", text: "it suggested 'that's so real' and i was literally about to type that", sender: "me", time: "10:45 PM", status: "delivered" },
  { id: "8", text: "we are living in the future fr fr", sender: "them", time: "10:46 PM" },
];

const aiReplies = ["that's so real 😤", "no cap 🫡", "lowkey facts", "say less 🤝", "literally me"];

interface ChatWindowProps {
  chatId: string | null;
}

export function ChatWindow({ chatId }: ChatWindowProps) {
  const [messages, setMessages] = useState(mockMessages);
  const [input, setInput] = useState("");
  const [showAiReplies, setShowAiReplies] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "me",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setShowAiReplies(true);
  };

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-neon mx-auto mb-4 animate-pulse-neon" />
          <h2 className="font-display text-xl font-semibold gradient-text">Select a chat</h2>
          <p className="text-sm text-muted-foreground mt-2">Choose a conversation to start vibing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Chat header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-border glass-panel rounded-none flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-lg">🌙</div>
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-accent border-2 border-surface" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Luna K.</h3>
            <p className="text-xs text-accent">online • vibing</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[Phone, Video, MoreVertical].map((Icon, i) => (
            <button key={i} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={cn("flex", msg.sender === "me" ? "justify-end" : "justify-start")}
          >
            <div className="relative max-w-[75%] group">
              <div
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                  msg.sender === "me"
                    ? "bg-primary/20 text-foreground rounded-br-md border border-primary/20"
                    : "glass-panel text-foreground rounded-bl-md"
                )}
              >
                {msg.text}
              </div>
              <div className={cn(
                "flex items-center gap-1 mt-1 text-[10px] text-muted-foreground",
                msg.sender === "me" ? "justify-end" : "justify-start"
              )}>
                <span>{msg.time}</span>
                {msg.sender === "me" && msg.status === "read" && <CheckCheck className="h-3 w-3 text-accent" />}
                {msg.sender === "me" && msg.status === "delivered" && <CheckCheck className="h-3 w-3" />}
                {msg.sender === "me" && msg.status === "sent" && <Check className="h-3 w-3" />}
              </div>
              {msg.reaction && (
                <div className={cn(
                  "absolute -bottom-2 text-xs bg-surface-elevated rounded-full px-1.5 py-0.5 border border-border",
                  msg.sender === "me" ? "left-2" : "right-2"
                )}>
                  {msg.reaction}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* AI Smart Replies */}
      <AnimatePresence>
        {showAiReplies && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 pb-2"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3 w-3 text-neon" />
              <span className="text-[10px] text-neon uppercase tracking-wider font-medium">AI Suggests</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {aiReplies.map((reply) => (
                <button
                  key={reply}
                  onClick={() => {
                    setInput(reply);
                    setShowAiReplies(false);
                  }}
                  className="glass-panel px-3 py-1.5 rounded-full text-xs whitespace-nowrap hover:bg-primary/10 hover:border-primary/30 transition-all flex-shrink-0"
                >
                  {reply}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="p-4 border-t border-border flex-shrink-0">
        <div className="flex items-end gap-2">
          <button className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground flex-shrink-0">
            <Paperclip className="h-5 w-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full rounded-2xl bg-input/50 border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none"
            />
          </div>
          <button className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground flex-shrink-0">
            <Smile className="h-5 w-5" />
          </button>
          {input.trim() ? (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={handleSend}
              className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:shadow-[0_0_20px_var(--neon-glow)] transition-all flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </motion.button>
          ) : (
            <button className="h-10 w-10 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors text-neon flex-shrink-0">
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
