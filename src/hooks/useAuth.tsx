import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { checkRateLimit, resetRateLimit, rateLimitMessage, logSecurityEvent, getClientFingerprint } from "@/lib/security/rateLimiter";

/** Generic, enumeration-safe error copy. */
const GENERIC_LOGIN_ERROR = "Invalid credentials. Please check and try again.";


interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: Error | null }>;
  signIn: (identifier: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Update online status — respect ghost_mode
      if (session?.user) {
        const uid = session.user.id;
        setTimeout(async () => {
          const { data: prof } = await supabase.from("profiles").select("ghost_mode").eq("id", uid).maybeSingle();
          const ghost = (prof as { ghost_mode?: boolean } | null)?.ghost_mode;
          if (!ghost) {
            await supabase.from("profiles").update({ is_online: true, last_seen: new Date().toISOString() }).eq("id", uid);
          }
        }, 0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);


  // Set offline on window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        supabase.from("profiles").update({ is_online: false, last_seen: new Date().toISOString() }).eq("id", user.id);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [user]);

  const signUp = useCallback(async (email: string, password: string, username?: string) => {
    const emailKey = email.trim().toLowerCase();
    // Rate limit: per-email AND per-device fingerprint (cheap IP substitute)
    const guardId = await checkRateLimit("signupAttempts", emailKey);
    if (!guardId.allowed) {
      return { error: new Error(rateLimitMessage("signupAttempts", guardId.retryAfter)) };
    }
    const guardFp = await checkRateLimit("signupAttempts", `fp:${getClientFingerprint()}`);
    if (!guardFp.allowed) {
      return { error: new Error(rateLimitMessage("signupAttempts", guardFp.retryAfter)) };
    }

    // Pre-check username uniqueness if provided
    if (username) {
      const clean = username.trim();
      if (!/^[a-zA-Z0-9_]{3,32}$/.test(clean)) {
        return { error: new Error("Username must be 3-32 chars: letters, numbers, underscore.") };
      }
      const rpc = supabase.rpc as unknown as (
        fn: "is_username_available", args: { _username: string }
      ) => Promise<{ data: boolean | null; error: { message: string } | null }>;
      const { data: available, error: chkErr } = await rpc("is_username_available", { _username: clean });
      if (chkErr) return { error: new Error(chkErr.message) };
      if (!available) return { error: new Error("Username already taken") };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: username ? { username: username.trim() } : undefined,
      },
    });
    if (error) {
      void logSecurityEvent("signupAttempts", "suspicious_signup", emailKey, { reason: error.message });
      return { error: new Error(error.message) };
    }
    void resetRateLimit("signupAttempts", emailKey);
    return { error: null };
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    const idKey = identifier.trim().toLowerCase();
    // Rate limit BEFORE hitting Supabase — protects against brute force
    const guard = await checkRateLimit("loginAttempts", idKey);
    if (!guard.allowed) {
      void logSecurityEvent("loginAttempts", "account_locked", idKey, { retry_after: guard.retryAfter });
      return { error: new Error(rateLimitMessage("loginAttempts", guard.retryAfter)) };
    }
    const guardFp = await checkRateLimit("loginAttempts", `fp:${getClientFingerprint()}`);
    if (!guardFp.allowed) {
      return { error: new Error(rateLimitMessage("loginAttempts", guardFp.retryAfter)) };
    }

    let email = identifier.trim();
    if (!EMAIL_RE.test(email)) {
      // Treat as username; look up email. Use generic error to prevent enumeration.
      const rpc = supabase.rpc as unknown as (
        fn: "get_email_for_username", args: { _username: string }
      ) => Promise<{ data: string | null; error: { message: string } | null }>;
      const { data, error } = await rpc("get_email_for_username", { _username: email });
      if (error || !data) {
        void logSecurityEvent("loginAttempts", "failed_login", idKey, { stage: "username_lookup" });
        return { error: new Error(GENERIC_LOGIN_ERROR) };
      }
      email = data;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      void logSecurityEvent("loginAttempts", "failed_login", idKey);
      return { error: new Error(GENERIC_LOGIN_ERROR) };
    }
    void resetRateLimit("loginAttempts", idKey);
    void resetRateLimit("loginAttempts", `fp:${getClientFingerprint()}`);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (user) {
      await supabase.from("profiles").update({ is_online: false }).eq("id", user.id);
    }
    await supabase.auth.signOut();
  }, [user]);

  const resetPassword = useCallback(async (email: string) => {
    const emailKey = email.trim().toLowerCase();
    const guard = await checkRateLimit("passwordResets", emailKey);
    if (!guard.allowed) {
      return { error: new Error(rateLimitMessage("passwordResets", guard.retryAfter)) };
    }
    // Always resolve success-shape to prevent email enumeration.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: null };
  }, []);


  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
