import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import type { MessageRow, ProfileRow } from "@/hooks/useRealtimeChat";

interface Props {
  open: boolean;
  onClose: () => void;
  messages: (MessageRow & { sender?: ProfileRow })[];
  onJump: (messageId: string) => void;
}

export function ChatSearchOverlay({ open, onClose, messages, onJump }: Props) {
  const [q, setQ] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 80); else { setQ(""); setIndex(0); } }, [open]);

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return messages.filter(m => (m.content ?? "").toLowerCase().includes(term));
  }, [q, messages]);

  useEffect(() => { setIndex(0); }, [q]);
  useEffect(() => {
    if (matches[index]) onJump(matches[index].id);
  }, [matches, index, onJump]);

  const highlight = (text: string) => {
    const term = q.trim();
    if (!term) return text;
    const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
    const parts = text.split(re);
    return parts.map((p, i) =>
      re.test(p) ? <mark key={i} className="bg-neon/40 text-foreground rounded px-0.5">{p}</mark> : <span key={i}>{p}</span>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
          className="absolute inset-x-0 top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border"
          style={{ paddingTop: "env(safe-area-inset-top, 8px)" }}
        >
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search in chat…"
                className="w-full h-10 rounded-xl bg-secondary/60 border border-border pl-9 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              {q && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                  {matches.length ? `${index + 1}/${matches.length}` : "0"}
                </span>
              )}
            </div>
            <button disabled={!matches.length} onClick={() => setIndex(i => (i - 1 + matches.length) % matches.length)}
              className="h-9 w-9 rounded-full hover:bg-secondary flex items-center justify-center disabled:opacity-40"><ChevronUp className="h-4 w-4" /></button>
            <button disabled={!matches.length} onClick={() => setIndex(i => (i + 1) % matches.length)}
              className="h-9 w-9 rounded-full hover:bg-secondary flex items-center justify-center disabled:opacity-40"><ChevronDown className="h-4 w-4" /></button>
            <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-secondary flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>
          {q && (
            <div className="max-h-64 overflow-y-auto border-t border-border/60">
              {matches.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No matches</p>
              ) : matches.map((m, i) => (
                <button key={m.id} onClick={() => { setIndex(i); onJump(m.id); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-secondary/60 ${i === index ? "bg-primary/10" : ""}`}>
                  <div className="text-[11px] text-neon font-medium">{m.sender?.display_name ?? "User"}</div>
                  <div className="text-[13px] truncate">{highlight(m.content ?? "")}</div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
