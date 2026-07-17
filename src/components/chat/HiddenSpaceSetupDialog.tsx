import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EyeOff, Lock, ShieldCheck, X, Timer, Bell, KeyRound } from "lucide-react";
import { useHiddenSpace } from "@/hooks/useHiddenSpace";
import { toast } from "sonner";

interface Props { open: boolean; onClose: () => void }

const LOCK_OPTIONS = [
  { v: 0, label: "Immediately" },
  { v: 30, label: "30 seconds" },
  { v: 60, label: "1 minute" },
  { v: 300, label: "5 minutes" },
];

const NOTIF_OPTIONS: { v: "full" | "generic" | "off"; label: string; desc: string }[] = [
  { v: "full", label: "Full", desc: "Show sender & preview" },
  { v: "generic", label: "Generic", desc: '"New private activity"' },
  { v: "off", label: "Off", desc: "No notifications" },
];

export function HiddenSpaceSetupDialog({ open, onClose }: Props) {
  const { configured, settings, setup } = useHiddenSpace();
  const [keyword, setKeyword] = useState("");
  const [confirmKw, setConfirmKw] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [autoLock, setAutoLock] = useState(60);
  const [notif, setNotif] = useState<"full" | "generic" | "off">("generic");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && settings) {
      setEmail(settings.recovery_email ?? "");
      setAutoLock(settings.auto_lock_seconds);
      setNotif(settings.notification_mode);
    }
  }, [open, settings]);

  const submit = async () => {
    if (keyword.trim().length < 3) return toast.error("Keyword must be at least 3 characters");
    if (keyword !== confirmKw) return toast.error("Keywords don't match");
    setSaving(true);
    const { error } = await setup({
      keyword: keyword.trim(),
      recovery_email: email.trim() || undefined,
      pin: pin.trim() || undefined,
      auto_lock_seconds: autoLock,
      notification_mode: notif,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(configured ? "Hidden Space updated" : "Hidden Space activated");
    setKeyword(""); setConfirmKw(""); setPin("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed inset-x-3 top-[5vh] bottom-[5vh] z-[81] rounded-3xl bg-gradient-to-b from-[#0a0a1a] to-black border border-white/10 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-purple-600/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-blue-600/25 blur-3xl" />

            <div className="relative flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500/40 to-blue-500/40 flex items-center justify-center border border-white/10">
                  <EyeOff className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">Hidden Space</p>
                  <p className="text-[10px] text-purple-300/70 uppercase tracking-widest">
                    {configured ? "Update settings" : "First-time setup"}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative flex-1 overflow-y-auto p-5 space-y-5">
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
                <p className="text-[11px] text-purple-300/90 leading-relaxed">
                  Type your secret keyword in the main search bar anytime to open Hidden Space. Wrong keywords behave like normal searches — nobody can tell it exists.
                </p>
              </div>

              <Field label="Secret keyword" icon={KeyRound}>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={configured ? "New keyword (leave blank to keep)" : "e.g. midnight"}
                  autoComplete="off"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </Field>

              <Field label="Confirm keyword">
                <input
                  type="text"
                  value={confirmKw}
                  onChange={(e) => setConfirmKw(e.target.value)}
                  autoComplete="off"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </Field>

              <Field label="Recovery email (optional)">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </Field>

              <Field label="PIN (optional, second factor)" icon={Lock}>
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="4–8 digits"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 tracking-widest"
                />
              </Field>

              <Field label="Auto-lock" icon={Timer}>
                <div className="grid grid-cols-2 gap-2">
                  {LOCK_OPTIONS.map(o => (
                    <button key={o.v} onClick={() => setAutoLock(o.v)}
                      className={`h-11 rounded-xl text-xs font-medium border transition ${autoLock === o.v ? "bg-purple-500/25 border-purple-400/60 text-white" : "bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.06]"}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Notifications" icon={Bell}>
                <div className="space-y-2">
                  {NOTIF_OPTIONS.map(o => (
                    <button key={o.v} onClick={() => setNotif(o.v)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition ${notif === o.v ? "bg-purple-500/20 border-purple-400/60" : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"}`}>
                      <div>
                        <p className="text-sm font-medium text-white">{o.label}</p>
                        <p className="text-[11px] text-white/50">{o.desc}</p>
                      </div>
                      {notif === o.v && <ShieldCheck className="h-4 w-4 text-purple-300" />}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="relative border-t border-white/5 p-4">
              <button onClick={submit} disabled={saving}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold text-sm shadow-[0_10px_40px_-10px_rgba(139,92,246,0.6)] disabled:opacity-60 transition">
                {saving ? "Saving..." : configured ? "Update Hidden Space" : "Activate Hidden Space"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: typeof Lock; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="h-3 w-3 text-purple-300/70" />}
        <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">{label}</label>
      </div>
      {children}
    </div>
  );
}
