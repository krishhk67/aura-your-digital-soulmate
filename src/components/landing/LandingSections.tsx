import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useMotionValue,
  useSpring,
  type Variants,
} from "framer-motion";
import {
  MessageCircle,
  Sparkles,
  Shield,
  Zap,
  Globe,
  Brain,
  Ghost,
  Users,
  Palette,
  ArrowRight,
  Star,
  Lock,
  Video,
  Phone,
  Mic,
  BookOpen,
  Eye,
  ArrowUpRight,
  Check,
  Apple,
  Github,
  Monitor,
  Terminal,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroMockup from "@/assets/hero-mockup.jpg";

/* ────────────────────────────────────────────────────────────────
   Shared motion helpers
   ──────────────────────────────────────────────────────────────── */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.06, duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  }),
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

/* ────────────────────────────────────────────────────────────────
   Global animated background — aurora + grid + particles
   ──────────────────────────────────────────────────────────────── */

export function AmbientBackground() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse at 50% 0%, black 20%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 0%, black 20%, transparent 70%)",
        }}
      />
      {/* Aurora blobs */}
      {!reduce && (
        <>
          <motion.div
            className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(52,211,153,0.35), transparent 60%)" }}
            animate={{ x: [0, 80, 0], y: [0, 40, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/3 -right-40 h-[36rem] w-[36rem] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(34,211,238,0.28), transparent 60%)" }}
            animate={{ x: [0, -60, 0], y: [0, -40, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-0 left-1/3 h-[32rem] w-[32rem] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(167,139,250,0.22), transparent 60%)" }}
            animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.85))]" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Hero
   ──────────────────────────────────────────────────────────────── */

const HERO_STATS = [
  { label: "End-to-End Encrypted", icon: Lock },
  { label: "Realtime Messaging", icon: Zap },
  { label: "Lightning Fast", icon: Sparkles },
  { label: "Cross Platform", icon: Globe },
];

export function HeroSection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.4]);

  // Mockup parallax tilt
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-50, 50], [8, -8]), { stiffness: 120, damping: 12 });
  const ry = useSpring(useTransform(mx, [-50, 50], [-8, 8]), { stiffness: 120, damping: 12 });

  return (
    <section
      ref={ref}
      className="relative min-h-[100svh] flex items-center px-4 sm:px-6 pt-28 pb-16"
    >
      <motion.div style={{ y, opacity }} className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        {/* Copy */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="lg:col-span-6 text-center lg:text-left"
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur px-3 py-1 text-xs text-white/70"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Aurix v2 · now in preview
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-6 font-display font-semibold tracking-[-0.03em] leading-[0.95] text-[clamp(2.6rem,7vw,5.5rem)]"
          >
            <span className="block bg-gradient-to-b from-white via-white to-white/60 bg-clip-text text-transparent">
              Messaging.
            </span>
            <span className="block bg-gradient-to-r from-emerald-300 via-cyan-200 to-violet-300 bg-clip-text text-transparent">
              Reimagined.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 text-base sm:text-lg text-white/60 max-w-xl mx-auto lg:mx-0 leading-relaxed"
          >
            A private, beautiful, instant chat experience — with cinematic themes,
            on-device AI, and vault-grade privacy. Built for the way we talk in 2026.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <Link to="/chat">
              <Button
                size="lg"
                className="group rounded-full bg-white text-black hover:bg-white/90 shadow-[0_10px_40px_-10px_rgba(52,211,153,0.6)] font-medium h-12 px-6"
              >
                Open App
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <a href="#features">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06] hover:text-white h-12 px-6"
              >
                Learn More
              </Button>
            </a>
          </motion.div>

          <motion.ul
            variants={fadeUp}
            className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto lg:mx-0"
          >
            {HERO_STATS.map((s) => (
              <li
                key={s.label}
                className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 text-[11px] text-white/60"
              >
                <s.icon className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                <span className="leading-tight">{s.label}</span>
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 relative flex justify-center"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            mx.set(e.clientX - r.left - r.width / 2);
            my.set(e.clientY - r.top - r.height / 2);
          }}
          onMouseLeave={() => {
            mx.set(0);
            my.set(0);
          }}
        >
          <motion.div
            style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
            animate={reduce ? undefined : { y: [0, -14, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            {/* Glow */}
            <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-emerald-500/30 via-cyan-500/20 to-violet-500/30 blur-3xl" />
            {/* Card */}
            <div className="relative rounded-[2.2rem] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-2 backdrop-blur-xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]">
              <div className="relative overflow-hidden rounded-[1.8rem]">
                <img
                  src={heroMockup}
                  alt="Aurix chat interface preview"
                  width={640}
                  height={800}
                  loading="eager"
                  className="w-[280px] sm:w-[340px] lg:w-[380px] h-auto object-cover"
                />
                {/* Reflection */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent mix-blend-overlay" />
              </div>
            </div>

            {/* Floating badges */}
            <motion.div
              animate={reduce ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-6 top-16 hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-black/60 backdrop-blur-xl px-3 py-1.5 text-xs text-white/80 shadow-xl"
            >
              <Lock className="h-3 w-3 text-emerald-300" /> Encrypted
            </motion.div>
            <motion.div
              animate={reduce ? undefined : { y: [0, 8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-8 bottom-24 hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-black/60 backdrop-blur-xl px-3 py-1.5 text-xs text-white/80 shadow-xl"
            >
              <Sparkles className="h-3 w-3 text-cyan-300" /> AI ready
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Logo cloud / trust
   ──────────────────────────────────────────────────────────────── */

export function TrustStrip() {
  const items = ["Postgres", "Realtime", "WebRTC", "E2EE", "Edge", "WebGL"];
  return (
    <section className="relative py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-center text-[11px] uppercase tracking-[0.25em] text-white/40 mb-6">
          Powered by modern web infrastructure
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {items.map((i) => (
            <span key={i} className="font-mono text-sm text-white/40 hover:text-white/70 transition">
              {i}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Features — bento
   ──────────────────────────────────────────────────────────────── */

const FEATURES = [
  { icon: MessageCircle, title: "Realtime Messaging", desc: "Sub-100ms delivery with presence, typing and read receipts." },
  { icon: Users, title: "Groups", desc: "Roles, permissions, invites and moderation baked in." },
  { icon: BookOpen, title: "Stories", desc: "24-hour vertical stories with reactions and replies." },
  { icon: Phone, title: "Voice Calls", desc: "Crystal-clear low-latency 1:1 and group calls." },
  { icon: Video, title: "Video Calls", desc: "HD video with adaptive bitrate on any network." },
  { icon: Brain, title: "AI Assistant", desc: "Smart replies, rewrite, summaries, mood detection." },
  { icon: Ghost, title: "Hidden Space", desc: "PIN-locked vault for private conversations." },
  { icon: Mic, title: "Voice Notes", desc: "Liquid waveform playback, transcripts and search." },
  { icon: Palette, title: "Themes", desc: "Seven cinematic themes that adapt to your mood." },
  { icon: Shield, title: "Privacy", desc: "E2E encryption, disappearing messages, decoy mode." },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <SectionHeader
          eyebrow="Features"
          title={<>Not just a chat app.<br /><span className="bg-gradient-to-r from-emerald-300 to-cyan-200 bg-clip-text text-transparent">An experience.</span></>}
          subtitle="Every surface of Aurix is designed to feel considered, quiet and alive."
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: (typeof FEATURES)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 20 });
  const sry = useSpring(ry, { stiffness: 200, damping: 20 });

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      custom={index}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 800 }}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        rx.set(-py * 6);
        ry.set(px * 6);
      }}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
      className="group relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 backdrop-blur-xl overflow-hidden"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,0.15),transparent_60%)]" />
      <div className="relative">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] group-hover:border-emerald-400/30 transition-colors">
          <feature.icon className="h-4.5 w-4.5 text-emerald-300" />
        </div>
        <h3 className="font-display text-[15px] font-medium text-white">{feature.title}</h3>
        <p className="mt-1.5 text-[13px] text-white/50 leading-relaxed">{feature.desc}</p>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Showcase — alternating
   ──────────────────────────────────────────────────────────────── */

export function ShowcaseSection() {
  return (
    <section className="relative py-32 px-4 sm:px-6 space-y-32">
      <ShowcaseRow
        eyebrow="Voice"
        title="Voice notes that flow like water."
        desc="Real-time liquid waveforms, transcripts you can search, and playback that never stutters. Voice notes finally feel first-class."
        media={<WaveformVisual />}
      />
      <ShowcaseRow
        eyebrow="AI"
        title="An assistant that reads the room."
        desc="Smart replies, tone rewrite, grammar polish, summaries, and mood-aware theming — all on request, never in your way."
        media={<AiVisual />}
        reverse
      />
      <ShowcaseRow
        eyebrow="Themes"
        title="Seven cinematic themes."
        desc="Midnight Neon, Rainy Tokyo, AMOLED, Dream Purple — Aurix adapts to whatever the conversation feels like."
        media={<ThemesVisual />}
      />
    </section>
  );
}

function ShowcaseRow({
  eyebrow,
  title,
  desc,
  media,
  reverse,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  media: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      <motion.div
        initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={reverse ? "lg:order-2" : ""}
      >
        <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-300/80 mb-3">{eyebrow}</p>
        <h3 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-tight">
          {title}
        </h3>
        <p className="mt-4 text-white/60 leading-relaxed max-w-lg">{desc}</p>
        <a
          href="#features"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white group"
        >
          Explore <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={reverse ? "lg:order-1" : ""}
      >
        {media}
      </motion.div>
    </div>
  );
}

/* Waveform SVG animation */
function WaveformVisual() {
  const reduce = useReducedMotion();
  const bars = 48;
  return (
    <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-8 backdrop-blur-xl overflow-hidden">
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="relative flex items-center gap-3">
        <button
          aria-label="Play voice note"
          className="h-11 w-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 ml-0.5"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
        </button>
        <div className="flex-1 flex items-center gap-[3px] h-12">
          {Array.from({ length: bars }).map((_, i) => (
            <motion.span
              key={i}
              className="w-[3px] rounded-full bg-gradient-to-t from-emerald-400/70 to-cyan-300/70"
              animate={reduce ? { height: 12 } : { height: [6, 6 + Math.abs(Math.sin(i * 0.4)) * 34, 6] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: (i % 12) * 0.06 }}
            />
          ))}
        </div>
        <span className="font-mono text-xs text-white/60 tabular-nums">0:12</span>
      </div>
    </div>
  );
}

/* AI visual */
function AiVisual() {
  const chips = ["Smart Replies", "Rewrite", "Grammar", "Summarize", "Mood"];
  return (
    <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 backdrop-blur-xl overflow-hidden">
      <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="relative space-y-3">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <Brain className="h-3.5 w-3.5 text-violet-300" /> Aurix AI
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm text-white/80">
          "Wanna grab coffee tomorrow at 3?"
        </div>
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <span key={c} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/70">
              {c}
            </span>
          ))}
        </div>
        <div className="grid gap-2">
          {["Sounds good — 3 works.", "Can we push it to 4?", "Yes! Same place?"].map((r, i) => (
            <motion.div
              key={r}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i }}
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-sm text-white/90"
            >
              {r}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Themes visual */
function ThemesVisual() {
  const themes = [
    { name: "Midnight Neon", grad: "from-emerald-500 via-cyan-500 to-violet-500" },
    { name: "Rainy Tokyo", grad: "from-slate-400 via-blue-400 to-indigo-500" },
    { name: "AMOLED", grad: "from-neutral-800 via-neutral-900 to-black" },
    { name: "Dream Purple", grad: "from-fuchsia-500 via-violet-500 to-indigo-600" },
    { name: "Sunset", grad: "from-amber-400 via-rose-500 to-fuchsia-600" },
    { name: "Forest", grad: "from-emerald-500 via-teal-600 to-slate-800" },
  ];
  return (
    <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 backdrop-blur-xl overflow-hidden">
      <div className="grid grid-cols-3 gap-3">
        {themes.map((t) => (
          <div key={t.name} className="group">
            <div className={`aspect-[3/4] rounded-2xl bg-gradient-to-br ${t.grad} shadow-lg group-hover:scale-[1.02] transition-transform`} />
            <p className="mt-2 text-[11px] text-white/60 text-center">{t.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Security
   ──────────────────────────────────────────────────────────────── */

const SECURITY_ITEMS = [
  { title: "End-to-End Encryption", desc: "Messages are encrypted on your device. Nobody in the middle can read them." },
  { title: "Vault Privacy", desc: "PIN-locked Hidden Space, decoy mode, disappearing messages." },
  { title: "No Ads. No Tracking.", desc: "We don't sell your data. There is no ad network. Ever." },
  { title: "Secure Authentication", desc: "Passkeys, OAuth, magic links, and hardware key support." },
];

export function SecuritySection() {
  return (
    <section id="security" className="relative py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative aspect-square max-w-md mx-auto"
        >
          {/* Rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-emerald-400/20"
              style={{ padding: `${i * 30}px` }}
              animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
              transition={{ duration: 30 + i * 10, repeat: Infinity, ease: "linear" }}
            >
              <div className="w-full h-full rounded-full border border-emerald-400/10" />
            </motion.div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 blur-3xl" />
              <div className="relative h-32 w-32 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl flex items-center justify-center shadow-2xl">
                <Lock className="h-12 w-12 text-emerald-300" />
              </div>
            </div>
          </div>
        </motion.div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-300/80 mb-3">Security</p>
          <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-[1.05]">
            Private by design.<br />
            <span className="bg-gradient-to-r from-emerald-300 to-cyan-200 bg-clip-text text-transparent">Yours by default.</span>
          </h2>
          <div className="mt-8 space-y-4">
            {SECURITY_ITEMS.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4"
              >
                <div className="mt-0.5 h-8 w-8 shrink-0 rounded-lg border border-emerald-400/20 bg-emerald-400/5 flex items-center justify-center">
                  <Check className="h-4 w-4 text-emerald-300" />
                </div>
                <div>
                  <h4 className="font-medium text-white text-sm">{s.title}</h4>
                  <p className="mt-1 text-[13px] text-white/55 leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Testimonials — carousel
   ──────────────────────────────────────────────────────────────── */

const TESTIMONIALS = [
  { name: "Luna K.", handle: "@lunakay", text: "Aurix literally changed how I talk to people. The vibe is unmatched.", avatar: "🌙" },
  { name: "Dev R.", handle: "@devraz", text: "Ghost mode + AI replies = I'm never going back to boring chats.", avatar: "⚡" },
  { name: "Mia Chen", handle: "@miavibes", text: "The mood themes are insane. It feels like my chat is alive.", avatar: "🎭" },
  { name: "Kai T.", handle: "@kaitanaka", text: "The voice notes are art. Waveforms that actually feel good.", avatar: "🎧" },
  { name: "Sana M.", handle: "@sanamx", text: "Privacy without the ugly UI. Finally.", avatar: "🛡️" },
  { name: "Noel A.", handle: "@noelayo", text: "Feels like the messaging app I've been waiting a decade for.", avatar: "✨" },
];

export function TestimonialsSection() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <section id="community" className="relative py-32 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <SectionHeader
          eyebrow="Community"
          title={<>People are <span className="bg-gradient-to-r from-emerald-300 to-cyan-200 bg-clip-text text-transparent">feeling it.</span></>}
        />

        <div className="mt-16 relative">
          {/* Marquee row (desktop) */}
          <div className="hidden md:block relative">
            <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-black to-transparent" />
            <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-black to-transparent" />
            <div className="flex gap-4 overflow-hidden">
              <motion.div
                className="flex gap-4 shrink-0"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              >
                {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                  <TestimonialCard key={i} t={t} />
                ))}
              </motion.div>
            </div>
          </div>

          {/* Mobile single-card */}
          <div className="md:hidden">
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <TestimonialCard t={TESTIMONIALS[index]} />
            </motion.div>
            <div className="mt-4 flex justify-center gap-1.5">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Testimonial ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-1.5 bg-white/30"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ t }: { t: (typeof TESTIMONIALS)[number] }) {
  return (
    <div className="w-[320px] shrink-0 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 backdrop-blur-xl">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{t.avatar}</span>
        <div>
          <p className="font-medium text-sm text-white">{t.name}</p>
          <p className="text-[11px] text-white/40">{t.handle}</p>
        </div>
        <div className="ml-auto flex gap-0.5">
          {[...Array(5)].map((_, j) => (
            <Star key={j} className="h-3 w-3 fill-emerald-300 text-emerald-300" />
          ))}
        </div>
      </div>
      <p className="text-sm text-white/70 leading-relaxed">"{t.text}"</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Download
   ──────────────────────────────────────────────────────────────── */

const PLATFORMS = [
  { name: "Android", icon: ChevronRight, status: "Available" },
  { name: "iOS", icon: Apple, status: "Coming Soon" },
  { name: "macOS", icon: Apple, status: "Available" },
  { name: "Windows", icon: Monitor, status: "Available" },
  { name: "Linux", icon: Terminal, status: "Available" },
];

export function DownloadSection() {
  return (
    <section id="download" className="relative py-32 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent p-8 sm:p-14 backdrop-blur-xl overflow-hidden">
          <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-violet-500/15 blur-3xl" />

          <div className="relative text-center">
            <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-300/80 mb-3">Download</p>
            <h2 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-[1.05]">
              Aurix, everywhere you are.
            </h2>
            <p className="mt-4 text-white/60 max-w-lg mx-auto">
              One account. All your devices. Continue conversations seamlessly across platforms.
            </p>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {PLATFORMS.map((p) => (
                <button
                  key={p.name}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:bg-white/[0.05] hover:border-white/20 transition"
                >
                  <p.icon className="h-6 w-6 text-white/80 group-hover:text-emerald-300 transition" />
                  <span className="text-sm font-medium text-white">{p.name}</span>
                  <span className={`text-[10px] uppercase tracking-wider ${p.status === "Available" ? "text-emerald-300/80" : "text-white/40"}`}>
                    {p.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Footer
   ──────────────────────────────────────────────────────────────── */

export function FooterSection() {
  return (
    <footer id="about" className="relative border-t border-white/5 py-16 px-4 sm:px-6 mt-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-emerald-300" />
              <span className="font-display font-semibold text-xl bg-gradient-to-r from-emerald-200 to-cyan-200 bg-clip-text text-transparent">
                Aurix
              </span>
            </div>
            <p className="mt-4 text-sm text-white/50 max-w-sm leading-relaxed">
              The social app from 2030. Private, beautiful, instant.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
            {[
              { title: "Product", links: ["Features", "Security", "Download"] },
              { title: "Company", links: ["About", "Blog", "Careers"] },
              { title: "Resources", links: ["Docs", "Support", "Status"] },
              { title: "Legal", links: ["Privacy", "Terms", "Contact"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-3">{col.title}</p>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-white/60 hover:text-white transition">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">© 2026 Aurix. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:text-white transition"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Docs"
              className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 hover:text-white transition"
            >
              <Eye className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────────────
   Shared: SectionHeader
   ──────────────────────────────────────────────────────────────── */

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={stagger}
      className="text-center max-w-2xl mx-auto"
    >
      <motion.p variants={fadeUp} className="text-[11px] uppercase tracking-[0.25em] text-emerald-300/80 mb-4">
        {eyebrow}
      </motion.p>
      <motion.h2
        variants={fadeUp}
        className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.05]"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p variants={fadeUp} className="mt-4 text-white/55 leading-relaxed">
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
