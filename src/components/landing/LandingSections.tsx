import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  MessageCircle,
  Sparkles,
  Shield,
  Zap,
  Globe,
  Brain,
  Music,
  Ghost,
  Users,
  Palette,
  ArrowRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import heroMockup from "@/assets/hero-mockup.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const features = [
  { icon: Brain, title: "AI Smart Replies", desc: "Context-aware suggestions — funny, savage, romantic, or chill." },
  { icon: Sparkles, title: "Mood Detection", desc: "AI reads the vibe and shifts your theme to match the energy." },
  { icon: Ghost, title: "Ghost Mode", desc: "Messages dissolve with cinematic effects. No trace left behind." },
  { icon: Music, title: "Live Music Presence", desc: "Share what you're listening to in real time with your squad." },
  { icon: Shield, title: "Vault Privacy", desc: "Hidden chats, app lock, disappearing messages, decoy mode." },
  { icon: Globe, title: "Global Rooms", desc: "Join themed public spaces — anime, coding, midnight talks." },
  { icon: Users, title: "Multiple Personas", desc: "Switch between gamer, professional, anonymous, or private mode." },
  { icon: Palette, title: "7 Cinematic Themes", desc: "Midnight Neon, Rainy Tokyo, AMOLED Black, Dream Purple & more." },
];

const testimonials = [
  { name: "Luna K.", handle: "@lunakay", text: "Aurix literally changed how I talk to people. The vibe is unmatched.", avatar: "🌙" },
  { name: "Dev R.", handle: "@devraz", text: "Ghost mode + AI replies = I'm never going back to boring chats.", avatar: "⚡" },
  { name: "Mia Chen", handle: "@miavibes", text: "The mood themes are insane. It feels like my chat is alive.", avatar: "🎭" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 pt-20">
      {/* Gradient orbs */}
      <div className="absolute top-1/4 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-[120px] animate-float" style={{ animationDelay: "3s" }} />

      <div className="relative z-10 max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <motion.div initial="hidden" animate="visible" className="text-center lg:text-left">
          <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 glass-panel px-4 py-2 text-sm text-muted-foreground mb-6">
            <Sparkles className="h-4 w-4 text-neon" />
            <span>The future of conversation</span>
          </motion.div>

          <motion.h1 variants={fadeUp} custom={1} className="text-5xl sm:text-6xl lg:text-7xl font-bold font-display tracking-tight leading-[1.1]">
            <span className="gradient-text">Aurix</span>
            <br />
            <span className="text-foreground">Chat that feels</span>
            <br />
            <span className="neon-text">alive.</span>
          </motion.h1>

          <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
            AI-powered messaging with mood detection, cinematic themes, ghost mode, and vibes that evolve with your conversations.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link to="/chat">
              <Button variant="hero" size="xl">
                Enter Aurix <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="neon" size="xl">
                Sign In
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex justify-center"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl animate-pulse-neon" />
            <img
              src={heroMockup}
              alt="Aurix chat app interface"
              width={1024}
              height={1024}
              className="relative rounded-3xl max-w-sm lg:max-w-md w-full shadow-2xl"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section className="py-32 px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-20"
        >
          <motion.p variants={fadeUp} custom={0} className="text-sm uppercase tracking-widest text-neon mb-3">
            Features
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl font-bold font-display">
            Not just a chat app.
            <br />
            <span className="gradient-text">An experience.</span>
          </motion.h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}
              custom={i}
              whileHover={{ y: -6, scale: 1.02 }}
              className="glass-panel p-6 rounded-2xl group cursor-default"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="h-6 w-6 text-neon" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section className="py-32 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-16">
          <motion.p variants={fadeUp} custom={0} className="text-sm uppercase tracking-widest text-neon mb-3">
            Community
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-4xl font-bold font-display">
            People are <span className="gradient-text">feeling it.</span>
          </motion.h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="glass-panel p-6 rounded-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{t.avatar}</span>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.handle}</p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-3 w-3 fill-neon text-neon" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FooterSection() {
  return (
    <footer className="border-t border-border/50 py-12 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-neon" />
          <span className="font-display font-bold text-xl gradient-text">Aura</span>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 Aura. The social app from 2030.
        </p>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span className="hover:text-foreground transition-colors cursor-pointer">Privacy</span>
          <span className="hover:text-foreground transition-colors cursor-pointer">Terms</span>
          <span className="hover:text-foreground transition-colors cursor-pointer">Contact</span>
        </div>
      </div>
    </footer>
  );
}
