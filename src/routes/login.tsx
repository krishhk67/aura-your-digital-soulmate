import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MessageCircle, Mail, Lock, ArrowRight, Eye, EyeOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { TurnstileWidget, useTurnstile } from "@/components/security/TurnstileWidget";
import { TURNSTILE } from "@/lib/security/config";


export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Aurix" },
      { name: "description", content: "Sign in to Aurix to start chatting." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [identifier, setIdentifier] = useState(""); // username or email (login) / email (signup)
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const { signUp, signIn, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const turnstile = useTurnstile();

  // Redirect if already logged in
  if (user) {
    navigate({ to: "/chat" });
    return null;
  }

  /** Turnstile guard — no-op unless site key is configured. */
  const needsTurnstile = TURNSTILE.enabled && (
    (isSignUp && TURNSTILE.requiredFor.signup) ||
    (resetMode && TURNSTILE.requiredFor.passwordReset) ||
    (!isSignUp && !resetMode && TURNSTILE.requiredFor.login)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || (!resetMode && !password)) return;
    if (needsTurnstile && !turnstile.token) {
      toast.error("Please complete the security check");
      return;
    }
    setLoading(true);

    if (resetMode) {
      const { error } = await resetPassword(identifier);
      if (error) toast.error(error.message);
      else toast.success("If an account exists, a reset link has been sent.");
      turnstile.reset();
      setLoading(false);
      return;
    }


    if (isSignUp) {
      if (!username.trim()) { toast.error("Please choose a username"); setLoading(false); return; }
      const { error } = await signUp(identifier, password, username);
      if (error) toast.error(error.message);
      else toast.success("Account created! Check your email to verify.");
    } else {
      const { error } = await signIn(identifier, password);
      if (error) toast.error(error.message);
      else navigate({ to: "/chat" });
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/chat" });
  };

  // ⚠️ DEV-ONLY: temporary test account login. Remove before production.
  // To remove: delete this handler and the button below (search "DEV-ONLY").
  const handleDevLogin = async () => {
    setLoading(true);
    const { error } = await signIn("krystladmin@dev.aurix.local", "krystl@500");
    if (error) toast.error(error.message);
    else navigate({ to: "/chat" });
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/3 -left-40 h-80 w-80 rounded-full bg-primary/15 blur-[100px] animate-float" />
      <div className="absolute bottom-1/3 -right-40 h-80 w-80 rounded-full bg-accent/15 blur-[100px] animate-float" style={{ animationDelay: "3s" }} />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="glass-panel rounded-3xl p-8 sm:p-10">
          <div className="flex items-center justify-center gap-2 mb-8">
            <MessageCircle className="h-8 w-8 text-neon" />
            <span className="font-display font-bold text-2xl gradient-text">Aurix</span>
          </div>

          <h1 className="text-2xl font-display font-bold text-center mb-2">
            {resetMode ? "Reset password" : isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            {resetMode ? "We'll send you a reset link" : isSignUp ? "Join the future of conversation" : "Enter the vibe"}
          </p>

          {!resetMode && (
            <>
              <Button variant="glass" size="lg" className="w-full mb-4 rounded-xl" onClick={handleGoogleSignIn} type="button">
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>

              <div className="flex items-center gap-3 my-6">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isSignUp && !resetMode && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 rounded-xl bg-input/50 border border-border pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={isSignUp || resetMode ? "email" : "text"}
                placeholder={isSignUp || resetMode ? "Email" : "Username or Email"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete={isSignUp ? "email" : "username"}
                className="w-full h-12 rounded-xl bg-input/50 border border-border pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
            </div>
            {!resetMode && (
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-12 rounded-xl bg-input/50 border border-border pl-11 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}

            {!isSignUp && !resetMode && (
              <button type="button" onClick={() => setResetMode(true)} className="text-xs text-neon hover:underline">
                Forgot password?
              </button>
            )}

            <TurnstileWidget innerRef={turnstile.widgetRef} />

            <Button variant="hero" size="lg" className="w-full rounded-xl" type="submit" disabled={loading || (needsTurnstile && !turnstile.token)}>
              {loading ? "Loading..." : resetMode ? "Send Reset Link" : isSignUp ? "Create Account" : "Sign In"}{" "}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>

          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {resetMode ? (
              <button onClick={() => setResetMode(false)} className="text-neon hover:underline">
                Back to sign in
              </button>
            ) : (
              <>
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button onClick={() => setIsSignUp(!isSignUp)} className="text-neon hover:underline">
                  {isSignUp ? "Sign in" : "Sign up"}
                </button>
              </>
            )}
          </p>

          {/* ⚠️ DEV-ONLY: temporary developer login. Remove this block before production. */}
          <div className="mt-4 pt-4 border-t border-dashed border-amber-500/30">
            <Button
              variant="glass"
              size="lg"
              type="button"
              onClick={handleDevLogin}
              disabled={loading}
              className="w-full rounded-xl border-amber-500/40 text-amber-300 hover:text-amber-200"
            >
              🛠️ Developer Login (Temporary)
            </Button>
            <p className="text-[10px] text-center text-amber-500/60 mt-2 uppercase tracking-wider">
              Temporary — remove before production
            </p>
          </div>

        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/" className="hover:text-foreground transition-colors">
            ← Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
