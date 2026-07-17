import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, GitBranch, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Security", href: "#security" },
  { label: "Download", href: "#download" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={[
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "backdrop-blur-xl bg-background/60 border-b border-white/5"
          : "backdrop-blur-md bg-background/20 border-b border-transparent",
      ].join(" ")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" aria-label="Aurix home">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-emerald-400/40 blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
            <MessageCircle className="relative h-6 w-6 text-emerald-300" />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">
            <span className="bg-gradient-to-r from-emerald-200 via-cyan-200 to-violet-200 bg-clip-text text-transparent">
              Aurix
            </span>
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-1 rounded-full border border-white/5 bg-white/[0.02] px-2 py-1">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="relative px-3 py-1.5 text-[13px] text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/[0.04]"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:bg-white/[0.06] transition"
          >
            <GitBranch className="h-4 w-4" />
          </a>
          <Link to="/login" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
              Sign In
            </Button>
          </Link>
          <Link to="/chat">
            <Button
              size="sm"
              className="relative rounded-full bg-white text-black hover:bg-white/90 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_10px_40px_-10px_rgba(52,211,153,0.5)] font-medium"
            >
              Open App
            </Button>
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="lg:hidden ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden overflow-hidden border-t border-white/5 bg-background/80 backdrop-blur-xl"
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/[0.04]"
                >
                  {l.label}
                </a>
              ))}
              <Link to="/login" onClick={() => setOpen(false)}>
                <span className="block px-3 py-2.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/[0.04]">
                  Sign In
                </span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
