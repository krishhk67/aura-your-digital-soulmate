import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, User as UserIcon, Lock, Loader2, Check, X as XIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Shown once after a Google sign-in when the user has no username set
 * or no email/password identity attached. Forces them to pick a unique
 * username and set an Aurix login password so they can later sign in
 * with either method.
 */
export function AccountOnboardingDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const hasUsername = !!(prof as { username?: string | null } | null)?.username;
      const hasPasswordIdentity = (user.identities ?? []).some(
        (i) => i.provider === "email",
      );
      const missUser = !hasUsername;
      const missPass = !hasPasswordIdentity;
      setNeedsUsername(missUser);
      setNeedsPassword(missPass);
      setOpen(missUser || missPass);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Live username availability check
  useEffect(() => {
    if (!needsUsername) return;
    const clean = username.trim();
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(clean)) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      const rpc = supabase.rpc as unknown as (
        fn: "is_username_available",
        args: { _username: string },
      ) => Promise<{ data: boolean | null; error: unknown }>;
      const { data } = await rpc("is_username_available", { _username: clean });
      setAvailable(!!data);
      setChecking(false);
    }, 350);
    return () => clearTimeout(t);
  }, [username, needsUsername]);

  const submit = async () => {
    if (!user) return;
    if (needsUsername && !available) {
      toast.error("Pick an available username");
      return;
    }
    if (needsPassword && password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      if (needsUsername) {
        const rpc = supabase.rpc as unknown as (
          fn: "set_my_username",
          args: { _username: string },
        ) => Promise<{ error: { message: string } | null }>;
        const { error } = await rpc("set_my_username", { _username: username.trim() });
        if (error) throw new Error(error.message);
      }
      if (needsPassword) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw new Error(error.message);
      }
      toast.success("Account set up! You can now sign in with either method.");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-md z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div className="glass-panel rounded-3xl p-6 sm:p-8 w-full max-w-md">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-neon" />
                <h2 className="font-display font-bold text-lg gradient-text">
                  Finish setting up
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {needsUsername && needsPassword
                  ? "Pick a username and set a password so you can sign in with either Google or your username."
                  : needsUsername
                    ? "Pick a unique username so people can find you."
                    : "Set an Aurix password so you can sign in without Google."}
              </p>

              <div className="space-y-4">
                {needsUsername && (
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">
                      Username
                    </label>
                    <div className="mt-1 relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="unique_username"
                        maxLength={32}
                        autoFocus
                        className="w-full h-12 rounded-xl bg-input/50 border border-border pl-11 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {checking ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : available === true ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : available === false ? (
                          <XIcon className="h-4 w-4 text-destructive" />
                        ) : null}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      3–32 chars, letters/numbers/underscore.
                    </p>
                  </div>
                )}

                {needsPassword && (
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">
                      Aurix password
                    </label>
                    <div className="mt-1 relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        minLength={6}
                        className="w-full h-12 rounded-xl bg-input/50 border border-border pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={submit}
                disabled={busy}
                className="mt-6 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_20px_var(--neon-glow)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {busy ? "Saving..." : "Continue"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
