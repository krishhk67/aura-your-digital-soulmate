import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface Props {
  onDone: () => void;
}

/**
 * Anonymous Space entry — gravity appears inside the chat.
 *
 * The chat surface stays put; every visible element inside it (header,
 * avatars, message bubbles, floating cards, composer) is pulled toward
 * the center of the viewport with slightly different speeds, rotations
 * and blur — like debris falling into a singularity. When the last
 * pieces reach the center, the screen briefly darkens, a single point
 * of light lingers, then the Anonymous Space rebuilds via an iris.
 *
 * No page scale. No fade-out of the whole surface. Individual elements
 * dissolve independently.
 */
export function EnterTransition({ onDone }: Props) {
  const reduce = useReducedMotion();
  const [fast, setFast] = useState(false);
  const [phase, setPhase] = useState<1 | 2 | 3>(1); // 1 pulling, 2 dark point, 3 iris out
  const startRef = useRef<number>(performance.now());
  const doneRef = useRef(false);
  const animationsRef = useRef<Animation[]>([]);

  const TOTAL = reduce ? 320 : 950;

  // Kick off per-element gravity on mount.
  useEffect(() => {
    if (reduce) {
      document.body.classList.add("aurix-gravity");
      return () => document.body.classList.remove("aurix-gravity");
    }

    document.body.classList.add("aurix-gravity");

    const surface = document.querySelector<HTMLElement>("[data-chat-surface]");
    const targets: HTMLElement[] = [];
    if (surface) {
      const topKids = Array.from(surface.children).filter(
        (n): n is HTMLElement => n instanceof HTMLElement && n.offsetParent !== null,
      );
      topKids.forEach((k) => {
        targets.push(k);
        // Descend one level into the likely-scrollable middle region so
        // individual message rows / cards animate independently.
        const scroller =
          k.querySelector<HTMLElement>(
            '[class*="overflow-y"], [class*="overflow-auto"], [class*="overflow-scroll"]',
          ) ?? k;
        Array.from(scroller.children).forEach((c) => {
          if (c instanceof HTMLElement && c !== k && c.offsetParent !== null) {
            targets.push(c);
            // One more level for wrapped message rows.
            Array.from(c.children).forEach((cc) => {
              if (cc instanceof HTMLElement && cc.getBoundingClientRect().height > 8) {
                targets.push(cc);
              }
            });
          }
        });
      });
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = vw / 2;
    const cy = vh / 2;
    const maxDist = Math.hypot(vw, vh) / 2;

    const anims: Animation[] = [];
    targets.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const ex = r.left + r.width / 2;
      const ey = r.top + r.height / 2;
      const dx = cx - ex;
      const dy = cy - ey;
      const dist = Math.hypot(dx, dy);
      const norm = dist / maxDist; // 0 near center, ~1 at corners
      // Farther pieces drift first (feel of gravity reaching outward),
      // closer pieces snap last into the singularity.
      const delay = Math.round(60 + (1 - norm) * 180 + (i % 5) * 6);
      const duration = Math.round(520 + norm * 160);
      const spin = (dx >= 0 ? 1 : -1) * (6 + norm * 10);

      el.style.willChange = "transform, filter, opacity";
      el.style.transformOrigin = "50% 50%";

      const anim = el.animate(
        [
          {
            transform: "translate(0px,0px) rotate(0deg) scale(1)",
            filter: "blur(0px) brightness(1)",
            opacity: 1,
          },
          {
            transform: `translate(${dx * 0.28}px, ${dy * 0.28}px) rotate(${spin * 0.4}deg) scale(0.72)`,
            filter: "blur(2px) brightness(0.75)",
            opacity: 0.85,
            offset: 0.55,
          },
          {
            transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(0.02)`,
            filter: "blur(20px) brightness(0.25)",
            opacity: 0,
          },
        ],
        {
          duration,
          delay,
          easing: "cubic-bezier(0.6, 0.02, 0.78, 0)",
          fill: "forwards",
        },
      );
      anims.push(anim);
    });
    animationsRef.current = anims;

    return () => {
      document.body.classList.remove("aurix-gravity");
      document.body.classList.remove("aurix-gravity-fast");
      anims.forEach((a) => {
        try { a.cancel(); } catch { /* noop */ }
      });
      // Restore the surface element styles we mutated.
      targets.forEach((el) => {
        el.style.willChange = "";
        el.style.transformOrigin = "";
      });
    };
  }, [reduce]);

  // Phase clock: gravity → dark point → iris reveal.
  useEffect(() => {
    try { navigator.vibrate?.(8); } catch { /* noop */ }
    const t2 = window.setTimeout(() => setPhase(2), reduce ? 140 : 640);
    const t3 = window.setTimeout(() => setPhase(3), reduce ? 220 : 800);
    const tEnd = window.setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onDone(); }
    }, TOTAL);
    return () => {
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(tEnd);
    };
  }, [TOTAL, onDone, reduce]);

  // Tap-to-accelerate: shorten the remaining time smoothly.
  useEffect(() => {
    if (!fast || doneRef.current) return;
    document.body.classList.add("aurix-gravity-fast");
    animationsRef.current.forEach((a) => {
      try { a.playbackRate = 2.4; } catch { /* noop */ }
    });
    const elapsed = performance.now() - startRef.current;
    const remaining = Math.max(0, TOTAL - elapsed);
    const shortened = Math.min(remaining, 240);
    const t = window.setTimeout(() => {
      if (!doneRef.current) { doneRef.current = true; onDone(); }
    }, shortened);
    return () => window.clearTimeout(t);
  }, [fast, TOTAL, onDone]);

  const speed = fast ? 0.45 : 1;

  return (
    <motion.div
      onClick={() => setFast(true)}
      initial={{ opacity: 1 }}
      className="fixed inset-0 z-[80] cursor-pointer overflow-hidden pointer-events-auto"
      aria-hidden
    >
      {/* Subtle lens ripple sitting over the imploding content — this is
          the only overlay decoration during gravity; it hints at a warp
          without upstaging the content that's actually being pulled. */}
      <motion.div
        initial={{ opacity: 0, scale: 1.2 }}
        animate={
          phase === 1
            ? { opacity: [0, 0.22, 0], scale: [1.2, 0.4, 0.05] }
            : { opacity: 0 }
        }
        transition={{ duration: 0.68 * speed, ease: [0.6, 0.02, 0.78, 0] }}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[620px] w-[620px] rounded-full"
        style={{
          background:
            "conic-gradient(from 210deg, rgba(255,255,255,0.06), rgba(255,255,255,0) 30%, rgba(255,255,255,0.09) 62%, rgba(255,255,255,0) 100%)",
          filter: "blur(18px)",
          mixBlendMode: "screen",
        }}
      />

      {/* Brief darkness after everything has been swallowed. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.12 * speed, ease: "easeOut" }}
        className="absolute inset-0 bg-black"
      />

      {/* Singular point of light in the darkness. */}
      <motion.span
        initial={{ opacity: 0, scale: 0 }}
        animate={phase >= 2 ? { opacity: [0, 1, 1, 0.9], scale: [0, 1, 1, 1.15] } : { opacity: 0, scale: 0 }}
        transition={{ duration: 0.24 * speed, ease: "easeOut" }}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 4,
          height: 4,
          background: "white",
          boxShadow:
            "0 0 12px 2px rgba(255,255,255,0.85), 0 0 44px 8px rgba(255,255,255,0.35), 0 0 110px 24px rgba(180,167,255,0.2)",
        }}
      />

      {/* Iris reveal — the Anonymous Space rebuilds outward from the point. */}
      <motion.div
        initial={{ clipPath: "circle(100% at 50% 50%)" }}
        animate={phase >= 3 ? { clipPath: "circle(0% at 50% 50%)" } : { clipPath: "circle(100% at 50% 50%)" }}
        transition={{ duration: 0.32 * speed, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 bg-black"
      />
    </motion.div>
  );
}
