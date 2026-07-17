import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCheck, Clock, Eye, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { MessageRow, ProfileRow } from "@/hooks/useRealtimeChat";

interface Props {
  message: MessageRow | null;
  onClose: () => void;
  isGroup?: boolean;
}

interface Receipt {
  user_id: string;
  delivered_at: string | null;
  read_at: string | null;
  profile?: ProfileRow;
}

type RpcCall = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;

export function MessageInfoSheet({ message, onClose, isGroup }: Props) {
  const [rows, setRows] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!message) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await (supabase.rpc as unknown as RpcCall)(
        "get_message_receipts",
        { _message_id: message.id },
      );
      const list = (data as Receipt[] | null) ?? [];
      if (list.length) {
        const ids = list.map((r) => r.user_id);
        const { data: profs } = await supabase.from("profiles").select("*").in("id", ids);
        const map = new Map((profs ?? []).map((p) => [p.id, p as ProfileRow]));
        list.forEach((r) => { r.profile = map.get(r.user_id); });
      }
      if (!cancelled) { setRows(list); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [message]);

  const fmt = (v: string | null) => v ? format(new Date(v), "MMM d, h:mm a") : null;

  const anyDelivered = rows.some((r) => !!r.delivered_at);
  const anyRead = rows.some((r) => !!r.read_at);
  const allRead = rows.length > 0 && rows.every((r) => !!r.read_at);
  const singleRow = !isGroup && rows[0];

  return (
    <AnimatePresence>
      {message && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed inset-x-0 bottom-0 z-50 glass-panel rounded-t-3xl border-t border-glass-border p-5 pb-[calc(env(safe-area-inset-bottom,12px)+16px)] max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg">Message info</h3>
              <button onClick={onClose} className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-[13px] leading-relaxed p-3 rounded-2xl bg-primary/10 border border-primary/20 mb-5 max-h-32 overflow-y-auto">
              {message.content || <span className="text-muted-foreground italic">[{message.message_type}]</span>}
            </div>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="h-5 w-5 border-2 border-neon border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {!isGroup ? (
                  <>
                    <Row icon={<Clock className="h-4 w-4" />} label="Sent" value={fmt(message.created_at)} tone="muted" />
                    <Row
                      icon={<CheckCheck className="h-4 w-4" />}
                      label="Delivered"
                      value={singleRow?.delivered_at ? fmt(singleRow.delivered_at) : "Not delivered yet"}
                      tone={singleRow?.delivered_at ? "muted" : "off"}
                    />
                    <Row
                      icon={<Eye className="h-4 w-4" />}
                      label="Read"
                      value={singleRow?.read_at ? fmt(singleRow.read_at) : "Not read yet"}
                      tone={singleRow?.read_at ? "accent" : "off"}
                    />
                  </>
                ) : (
                  <>
                    <Row icon={<Clock className="h-4 w-4" />} label="Sent" value={fmt(message.created_at)} tone="muted" />
                    <Row
                      icon={<CheckCheck className="h-4 w-4" />}
                      label={anyDelivered ? `Delivered to ${rows.filter(r => r.delivered_at).length}/${rows.length}` : "Delivered"}
                      value={anyDelivered ? "" : "Not delivered yet"}
                      tone={anyDelivered ? "muted" : "off"}
                    />
                    <Row
                      icon={<Eye className="h-4 w-4" />}
                      label={anyRead ? `Read by ${rows.filter(r => r.read_at).length}/${rows.length}` : "Read"}
                      value={allRead ? "All members" : (anyRead ? "" : "Not read yet")}
                      tone={anyRead ? "accent" : "off"}
                    />

                    <div className="pt-4 mt-2 border-t border-border">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Recipients</p>
                      <ul className="space-y-2">
                        {rows.map((r) => (
                          <li key={r.user_id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/40">
                            {r.profile?.avatar_url ? (
                              <img src={r.profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
                                {r.profile?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium truncate">{r.profile?.display_name ?? "Member"}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {r.read_at ? `Read ${fmt(r.read_at)}` : r.delivered_at ? `Delivered ${fmt(r.delivered_at)}` : "Not delivered"}
                              </p>
                            </div>
                            {r.read_at ? <CheckCheck className="h-4 w-4 text-sky-400" /> :
                              r.delivered_at ? <CheckCheck className="h-4 w-4 text-muted-foreground/70" /> :
                              <Check className="h-4 w-4 text-muted-foreground/50" />}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | null; tone: "muted" | "accent" | "off" }) {
  const color = tone === "accent" ? "text-sky-400" : tone === "off" ? "text-muted-foreground/50" : "text-foreground/80";
  return (
    <div className="flex items-center gap-3">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center bg-secondary/50 ${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        {value && <p className="text-[11px] text-muted-foreground">{value}</p>}
      </div>
    </div>
  );
}
