"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "motion/react";

export interface ScrollZoomHeroProps {
  onContinue?: () => void;
  title?: string;
  subtitle?: string;
  badgeText?: string;
}

export default function ScrollZoomHero({
  onContinue,
  title = "Build worlds that pull you inward",
  subtitle = "A depth-driven interface that reacts to every pixel you scroll. The scene scales, brightens, and breathes while your words drift toward the horizon.",
  badgeText = "ERIS Subsystems · 2026",
}: ScrollZoomHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smooth = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });

  // Backdrop scales up and brightens as you scroll.
  const bgScale = useTransform(smooth, [0, 1], [1, 1.55]);
  const bgBrightness = useTransform(smooth, [0, 1], [0.72, 1.18]);
  const bgSaturate = useTransform(smooth, [0, 1], [1.05, 1.35]);
  const bgFilter = useTransform(
    [bgBrightness, bgSaturate],
    ([b, s]: number[]) => `brightness(${b}) saturate(${s})`,
  );

  // Secondary mesh layer counter-parallaxes for depth.
  const meshScale = useTransform(smooth, [0, 1], [1.2, 0.9]);
  const meshOpacity = useTransform(smooth, [0, 0.6, 1], [0.9, 0.6, 0.25]);

  // Vignette lifts as the scene brightens.
  const vignetteOpacity = useTransform(smooth, [0, 1], [0.85, 0.2]);

  // Headline parallaxes up and fades.
  const headlineY = useTransform(smooth, [0, 1], [0, -220]);
  const headlineOpacity = useTransform(smooth, [0, 0.55, 0.8], [1, 1, 0]);
  const headlineScale = useTransform(smooth, [0, 1], [1, 0.92]);
  const headlineBlur = useTransform(smooth, [0, 0.7, 1], [0, 0, 8]);
  const headlineFilter = useTransform(
    headlineBlur,
    (b: number) => `blur(${b}px)`,
  );

  const subY = useTransform(smooth, [0, 1], [0, -140]);
  const subOpacity = useTransform(smooth, [0, 0.4, 0.65], [1, 1, 0]);

  // Scroll hint fades almost immediately.
  const hintOpacity = useTransform(smooth, [0, 0.12], [1, 0]);

  // Thin progress bar.
  const progressScaleX = smooth;

  return (
    <section
      ref={containerRef}
      className="relative w-full bg-slate-950 dark:bg-black font-sans"
    >
      <style>{`
        @keyframes szh-hint-bob {
          0%, 100% { transform: translateY(0); opacity: 0.9; }
          50% { transform: translateY(7px); opacity: 0.4; }
        }
        @keyframes szh-drift {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(2%, -2%, 0) rotate(8deg); }
          100% { transform: translate3d(0, 0, 0) rotate(0deg); }
        }
        @keyframes szh-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .szh-anim { animation: none !important; }
        }
      `}</style>

      {/* Tall scroll driver */}
      <div className="relative h-[200vh]">
        {/* Sticky stage */}
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          {/* Full-bleed scaling backdrop */}
          <motion.div
            aria-hidden
            className="absolute inset-0 will-change-transform"
            style={{ scale: bgScale, filter: bgFilter }}
          >
            {/* Base gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_10%,#1e1b4b_0%,#0f172a_45%,#020617_100%)] dark:bg-[radial-gradient(120%_120%_at_50%_10%,#312e81_0%,#0b1020_45%,#000000_100%)]" />

            {/* Aurora blobs */}
            <div className="absolute left-[-10%] top-[-10%] h-[60vh] w-[60vh] rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.55)_0%,transparent_65%)] blur-3xl" />
            <div className="absolute right-[-8%] top-[8%] h-[55vh] w-[55vh] rounded-full bg-[radial-gradient(circle,rgba(217,70,239,0.45)_0%,transparent_65%)] blur-3xl" />
            <div className="absolute bottom-[-14%] left-[28%] h-[65vh] w-[65vh] rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.42)_0%,transparent_65%)] blur-3xl" />
          </motion.div>

          {/* Counter-parallax mesh grid */}
          <motion.div
            aria-hidden
            className="absolute inset-0 will-change-transform"
            style={{ scale: meshScale, opacity: meshOpacity }}
          >
            <div
              className="szh-anim absolute inset-[-20%]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)",
                backgroundSize: "64px 64px",
                maskImage:
                  "radial-gradient(120% 90% at 50% 30%, black 30%, transparent 75%)",
                WebkitMaskImage:
                  "radial-gradient(120% 90% at 50% 30%, black 30%, transparent 75%)",
                animation: "szh-drift 22s ease-in-out infinite",
              }}
            />
          </motion.div>

          {/* Floating orbs for parallax texture */}
          <div aria-hidden className="absolute inset-0">
            <span
              className="szh-anim absolute left-[18%] top-[24%] h-2.5 w-2.5 rounded-full bg-indigo-300/80 shadow-[0_0_24px_6px_rgba(165,180,252,0.55)]"
              style={{ animation: "szh-drift 14s ease-in-out infinite" }}
            />
            <span
              className="szh-anim absolute right-[22%] top-[38%] h-1.5 w-1.5 rounded-full bg-fuchsia-300/80 shadow-[0_0_20px_5px_rgba(240,171,252,0.55)]"
              style={{ animation: "szh-drift 18s ease-in-out infinite reverse" }}
            />
            <span
              className="szh-anim absolute left-[62%] top-[62%] h-2 w-2 rounded-full bg-emerald-300/80 shadow-[0_0_22px_5px_rgba(110,231,183,0.5)]"
              style={{ animation: "szh-drift 16s ease-in-out infinite" }}
            />
          </div>

          {/* Vignette that lifts on brighten */}
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_50%,transparent_35%,rgba(2,6,23,0.9)_100%)]"
            style={{ opacity: vignetteOpacity }}
          />

          {/* Foreground content */}
          <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col items-center justify-center px-6 text-center">
            <motion.div
              style={{ y: subY, opacity: subOpacity }}
              className="mb-6"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-indigo-100 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                {badgeText}
              </span>
            </motion.div>

            <motion.h1
              style={{
                y: headlineY,
                opacity: headlineOpacity,
                scale: headlineScale,
                filter: headlineFilter,
              }}
              className="max-w-4xl text-balance text-5xl font-semibold leading-[0.95] tracking-tight text-white sm:text-7xl lg:text-8xl font-sans"
            >
              {title}
            </motion.h1>

            <motion.p
              style={{ y: subY, opacity: subOpacity }}
              className="mt-7 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg font-sans"
            >
              {subtitle}
            </motion.p>

            <motion.div
              style={{ opacity: subOpacity }}
              className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
            >
              <button
                type="button"
                onClick={onContinue}
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-50 cursor-pointer font-sans"
              >
                <span>Enter Welcome Topology</span>
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </motion.div>
          </div>

          {/* Scroll hint */}
          <motion.div
            style={{ opacity: hintOpacity }}
            className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex flex-col items-center gap-2 text-slate-300"
          >
            <span className="text-[11px] font-medium uppercase tracking-[0.3em] font-sans">
              Scroll to zoom & enter
            </span>
            <div className="flex h-9 w-5 items-start justify-center rounded-full border border-white/25 p-1">
              <span
                className="szh-anim h-2 w-1 rounded-full bg-white/80"
                style={{ animation: "szh-hint-bob 1.6s ease-in-out infinite" }}
              />
            </div>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            aria-hidden
            style={{ scaleX: progressScaleX }}
            className="absolute inset-x-0 bottom-0 z-20 h-1 origin-left bg-[linear-gradient(90deg,#818cf8,#e879f9,#34d399)]"
          />
        </div>
      </div>
    </section>
  );
}

export { ScrollZoomHero };
