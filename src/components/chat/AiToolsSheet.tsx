import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wand2, FileText, Smile, Loader2, Copy, Check, SpellCheck, Minimize2, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import {
  smartReplies, rewriteTone, summarizeChat, detectMood,
  fixGrammar, shortenMessage, expandMessage,
} from "@/lib/ai-chat.functions";
import type { MessageRow, ProfileRow } from "@/hooks/useRealtimeChat";

interface Props {
  open: boolean;
  onClose: () => void;
  messages: (MessageRow & { sender?: ProfileRow })[];
  currentUserId: string | undefined;
  draft: string;
  onUseReply: (text: string) => void;
  onUseRewrite: (text: string) => void;
}

type Tab = "replies" | "rewrite" | "grammar" | "shorten" | "expand" | "summary" | "mood";
type Tone = "friendly" | "professional" | "flirty" | "concise" | "funny" | "supportive" | "formal" | "confident" | "genz";

const TONES: { id: Tone; label: string }[] = [
  { id: "friendly", label: "Friendly" },
  { id: "professional", label: "Professional" },
  { id: "formal", label: "Formal" },
  { id: "confident", label: "Confident" },
  { id: "funny", label: "Funny" },
  { id: "flirty", label: "Flirty" },
  { id: "supportive", label: "Supportive" },
  { id: "concise", label: "Concise" },
  { id: "genz", label: "Gen-Z" },
];

export function AiToolsSheet({ open, onClose, messages, currentUserId, draft, onUseReply, onUseRewrite }: Props) {
  const [tab, setTab] = useState<Tab>("replies");
  const [loading, setLoading] = useState(false);
  const [replies, setReplies] = useState<string[]>([]);
  const [rewrite, setRewrite] = useState<string>("");
  const [tone, setTone] = useState<Tone>("friendly");
  const [summary, setSummary] = useState<string>("");
  const [mood, setMood] = useState<{ mood: string; emoji: string; summary: string } | null>(null);
  const [singleOut, setSingleOut] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);

  const fnReplies = useServerFn(smartReplies);
  const fnRewrite = useServerFn(rewriteTone);
  const fnSummary = useServerFn(summarizeChat);
  const fnMood = useServerFn(detectMood);
  const fnGrammar = useServerFn(fixGrammar);
  const fnShorten = useServerFn(shortenMessage);
  const fnExpand = useServerFn(expandMessage);

  const transcript = messages.slice(-20)
    .filter((m) => (m.message_type === "text" || !m.message_type) && m.content)
    .map((m) => ({
      sender: m.sender_id === currentUserId ? "Me" : (m.sender?.display_name ?? "Them"),
      content: m.content as string,
    }));

  const run = async (which: Tab) => {
    if (loading) return;
    try {
      setLoading(true);
      if (which === "replies") {
        if (!transcript.length) { toast.error("No messages yet to analyze."); return; }
        const r = await fnReplies({ data: { messages: transcript } });
        setReplies(r.replies);
        if (!r.replies.length) toast("No replies suggested.");
      } else if (which === "rewrite") {
        if (!draft.trim()) { toast.error("Type a draft message first."); return; }
        const r = await fnRewrite({ data: { text: draft, tone } });
        setRewrite(r.text);
      } else if (which === "summary") {
        if (!transcript.length) { toast.error("No messages yet to summarize."); return; }
        const r = await fnSummary({ data: { messages: transcript } });
        setSummary(r.summary);
      } else if (which === "mood") {
        if (!transcript.length) { toast.error("No messages yet to analyze."); return; }
        const r = await fnMood({ data: { messages: transcript } });
        setMood(r);
      } else if (which === "grammar" || which === "shorten" || which === "expand") {
        if (!draft.trim()) { toast.error("Type a draft message first."); return; }
        const fn = which === "grammar" ? fnGrammar : which === "shorten" ? fnShorten : fnExpand;
        const r = await fn({ data: { text: draft } });
        setSingleOut(r.text);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1200);
  };

  const tabs: { id: Tab; icon: typeof Sparkles; label: string }[] = [
    { id: "replies", icon: Sparkles, label: "Replies" },
    { id: "rewrite", icon: Wand2, label: "Rewrite" },
    { id: "grammar", icon: SpellCheck, label: "Grammar" },
    { id: "shorten", icon: Minimize2, label: "Shorten" },
    { id: "expand", icon: Maximize2, label: "Expand" },
    { id: "summary", icon: FileText, label: "Summary" },
    { id: "mood", icon: Smile, label: "Mood" },
  ];

  const runLabel: Record<Tab, string> = {
    replies: "Suggest replies",
    rewrite: "Rewrite my draft",
    grammar: "Fix grammar",
    shorten: "Shorten message",
    expand: "Expand message",
    summary: "Summarize chat",
    mood: "Analyze mood",
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-background border-t border-glass-border max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom,12px)]"
          >
            <div className="flex justify-center pt-2 pb-1"><div className="h-1 w-10 rounded-full bg-muted-foreground/30" /></div>
            <div className="px-4 pb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-neon" />
              <p className="text-sm font-semibold">AI tools</p>
              <span className="text-[10px] text-muted-foreground ml-auto">Powered by Lovable AI</span>
            </div>

            <div className="px-3 flex gap-1 mb-3 overflow-x-auto scrollbar-none">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-medium transition-colors min-w-[64px] ${tab === t.id ? "bg-primary/20 text-neon" : "text-muted-foreground hover:bg-secondary/60"}`}>
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="px-4 pb-6 space-y-3">
              {tab === "rewrite" && (
                <div className="flex flex-wrap gap-1.5">
                  {TONES.map((t) => (
                    <button key={t.id} onClick={() => setTone(t.id)}
                      className={`px-3 py-1 rounded-full text-[11px] border transition-colors ${tone === t.id ? "bg-primary/20 border-primary/40 text-neon" : "border-border text-muted-foreground hover:bg-secondary/60"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {(tab === "rewrite" || tab === "grammar" || tab === "shorten" || tab === "expand") && (
                <div className="text-[11px] text-muted-foreground">
                  Draft: <span className="text-foreground">{draft.trim() ? `"${draft.trim().slice(0, 80)}${draft.length > 80 ? "…" : ""}"` : "(empty — type in the input first)"}</span>
                </div>
              )}

              <button onClick={() => run(tab)} disabled={loading}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:shadow-[0_0_15px_var(--neon-glow)] transition-all">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Thinking..." : runLabel[tab]}
              </button>

              {tab === "replies" && replies.length > 0 && (
                <div className="space-y-2">
                  {replies.map((r, i) => (
                    <div key={i} className="glass-panel rounded-2xl p-3 border border-glass-border">
                      <p className="text-sm mb-2">{r}</p>
                      <div className="flex gap-2">
                        <button onClick={() => { onUseReply(r); onClose(); }}
                          className="flex-1 h-8 rounded-lg bg-primary/20 text-neon text-xs font-medium hover:bg-primary/30">Use</button>
                        <button onClick={() => copy(r)}
                          className="h-8 px-3 rounded-lg bg-secondary text-xs hover:bg-secondary/80 flex items-center gap-1">
                          {copied === r ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "rewrite" && rewrite && (
                <ResultCard text={rewrite} copied={copied} onCopy={copy} onUse={() => { onUseRewrite(rewrite); onClose(); }} useLabel="Use rewrite" />
              )}

              {(tab === "grammar" || tab === "shorten" || tab === "expand") && singleOut && (
                <ResultCard text={singleOut} copied={copied} onCopy={copy} onUse={() => { onUseRewrite(singleOut); onClose(); }} useLabel="Use in input" />
              )}

              {tab === "summary" && summary && (
                <div className="glass-panel rounded-2xl p-3 border border-glass-border">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{summary}</p>
                  <button onClick={() => copy(summary)}
                    className="mt-2 h-8 px-3 rounded-lg bg-secondary text-xs hover:bg-secondary/80 flex items-center gap-1">
                    {copied === summary ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} Copy
                  </button>
                </div>
              )}

              {tab === "mood" && mood && (
                <div className="glass-panel rounded-2xl p-4 border border-glass-border text-center">
                  <div className="text-5xl mb-2">{mood.emoji}</div>
                  <p className="text-sm font-semibold capitalize">{mood.mood}</p>
                  {mood.summary && <p className="text-xs text-muted-foreground mt-1">{mood.summary}</p>}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ResultCard({ text, copied, onCopy, onUse, useLabel }: {
  text: string; copied: string | null;
  onCopy: (t: string) => void; onUse: () => void; useLabel: string;
}) {
  return (
    <div className="glass-panel rounded-2xl p-3 border border-glass-border">
      <p className="text-sm mb-2 whitespace-pre-wrap">{text}</p>
      <div className="flex gap-2">
        <button onClick={onUse}
          className="flex-1 h-8 rounded-lg bg-primary/20 text-neon text-xs font-medium hover:bg-primary/30">{useLabel}</button>
        <button onClick={() => onCopy(text)}
          className="h-8 px-3 rounded-lg bg-secondary text-xs hover:bg-secondary/80 flex items-center gap-1">
          {copied === text ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}
