"use client";

import { useState } from "react";
import { useReducedMotion } from "motion/react";

export type CtaVariant = "solid" | "gradient" | "outline" | "soft" | "dark" | "white";
export type CtaSize = "md" | "lg" | "xl";
export type CtaGlyph = "arrow" | "rocket" | "calendar" | "spark";

const SIZE: Record<
  CtaSize,
  { pad: string; icon: string; label: string; sub: string; radius: string; gap: string }
> = {
  md: {
    pad: "px-5 py-3.5",
    icon: "h-9 w-9",
    label: "text-[15px]",
    sub: "text-[11px]",
    radius: "rounded-xl",
    gap: "gap-3",
  },
  lg: {
    pad: "px-6 py-4",
    icon: "h-11 w-11",
    label: "text-base",
    sub: "text-xs",
    radius: "rounded-2xl",
    gap: "gap-3.5",
  },
  xl: {
    pad: "px-7 py-5",
    icon: "h-14 w-14",
    label: "text-lg",
    sub: "text-[13px]",
    radius: "rounded-[1.25rem]",
    gap: "gap-4",
  },
};

export function ArrowGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M5 12h13m0 0-5.5-5.5M18 12l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RocketGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 3c3 1.2 5 4.2 5 8.2 0 1.6-.4 3-1 4.2H8c-.6-1.2-1-2.6-1-4.2C7 7.2 9 4.2 12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="1.7" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8 15.4c-1.6.7-2.4 2-2.6 4 1.9-.2 3.3-.9 4-2.4M16 15.4c1.6.7 2.4 2 2.6 4-1.9-.2-3.3-.9-4-2.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CalendarGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 9.5h17M8 3.5v3M16 3.5v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M7.5 13.5h3v3h-3z" fill="currentColor" />
    </svg>
  );
}

export function SparkGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 3.5c.4 3.6 1.9 5.1 5.5 5.5-3.6.4-5.1 1.9-5.5 5.5-.4-3.6-1.9-5.1-5.5-5.5 3.6-.4 5.1-1.9 5.5-5.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 15c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const VARIANT: Record<
  CtaVariant,
  {
    shell: string;
    iconWrap: string;
    label: string;
    sub: string;
    ring: string;
  }
> = {
  solid: {
    shell:
      "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 hover:shadow-indigo-600/35 active:bg-indigo-700 border border-indigo-500/60",
    iconWrap: "bg-white/15 text-white",
    label: "text-white",
    sub: "text-indigo-100/80",
    ring: "focus-visible:ring-indigo-400 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
  },
  gradient: {
    shell:
      "bg-gradient-to-br from-violet-600 via-indigo-600 to-sky-500 text-white shadow-lg shadow-violet-600/30 hover:brightness-110 active:brightness-95 border border-white/10",
    iconWrap: "bg-white/20 text-white",
    label: "text-white",
    sub: "text-violet-100/85",
    ring: "focus-visible:ring-violet-400 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
  },
  outline: {
    shell:
      "bg-white text-slate-900 border border-slate-300 shadow-sm hover:border-indigo-400 hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-900 dark:text-slate-50 dark:border-slate-700 dark:hover:border-indigo-500 dark:hover:bg-slate-800/70",
    iconWrap:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
    label: "text-slate-900 dark:text-slate-50",
    sub: "text-slate-500 dark:text-slate-400",
    ring: "focus-visible:ring-indigo-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
  },
  soft: {
    shell:
      "bg-indigo-50 text-indigo-950 border border-indigo-100 shadow-sm hover:bg-indigo-100 active:bg-indigo-200/70 dark:bg-indigo-500/10 dark:text-indigo-50 dark:border-indigo-400/20 dark:hover:bg-indigo-500/20",
    iconWrap: "bg-indigo-600 text-white dark:bg-indigo-500",
    label: "text-indigo-950 dark:text-indigo-50",
    sub: "text-indigo-700/70 dark:text-indigo-200/70",
    ring: "focus-visible:ring-indigo-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
  },
  dark: {
    shell:
      "bg-slate-900 text-white border border-slate-800 shadow-lg shadow-black/20 hover:bg-slate-800 active:bg-slate-950 dark:bg-slate-50 dark:text-slate-900 dark:border-slate-200 dark:hover:bg-white",
    iconWrap:
      "bg-white/10 text-white dark:bg-slate-900/10 dark:text-slate-900",
    label: "text-white dark:text-slate-900",
    sub: "text-slate-400 dark:text-slate-500",
    ring: "focus-visible:ring-slate-400 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
  },
  white: {
    shell:
      "bg-white text-slate-950 border border-slate-200/90 shadow-lg shadow-black/20 hover:bg-slate-100 active:bg-slate-200/90",
    iconWrap:
      "bg-slate-100 text-slate-900",
    label: "text-slate-950 font-bold",
    sub: "text-slate-600 font-semibold",
    ring: "focus-visible:ring-slate-400 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
  },
};

function renderGlyph(g: CtaGlyph, className: string) {
  switch (g) {
    case "rocket":
      return <RocketGlyph className={className} />;
    case "calendar":
      return <CalendarGlyph className={className} />;
    case "spark":
      return <SparkGlyph className={className} />;
    default:
      return <ArrowGlyph className={className} />;
  }
}

export interface CtaButtonProps {
  variant: CtaVariant;
  size?: CtaSize;
  glyph?: CtaGlyph;
  sublabel: string;
  label: string;
  onActivate?: () => void;
  loading?: boolean;
  disabled?: boolean;
  reduced?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

export function CtaButton({
  variant,
  size = "lg",
  glyph = "arrow",
  sublabel,
  label,
  onActivate,
  loading = false,
  disabled = false,
  reduced = false,
  className = "",
  type = "button",
}: CtaButtonProps) {
  const s = SIZE[size];
  const v = VARIANT[variant];
  const iconInner = size === "xl" ? "h-6 w-6" : size === "lg" ? "h-5 w-5" : "h-[18px] w-[18px]";

  return (
    <button
      type={type}
      onClick={onActivate}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        "group relative inline-flex w-full items-center overflow-hidden text-left",
        "transition-all duration-200 ease-out outline-none select-none",
        "focus-visible:ring-2 focus-visible:ring-offset-2",
        reduced ? "" : "hover:-translate-y-0.5 active:translate-y-0",
        "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0",
        s.pad,
        s.radius,
        s.gap,
        v.shell,
        v.ring,
        className,
      ].join(" ")}
    >
      {!reduced && (
        <span
          aria-hidden="true"
          className="cta-sheen pointer-events-none absolute inset-y-0 -left-3/4 w-1/2 -skew-x-12 bg-white/20 opacity-0 group-hover:opacity-100"
        />
      )}

      <span
        aria-hidden="true"
        className={[
          "relative grid shrink-0 place-items-center rounded-xl transition-transform duration-300",
          reduced ? "" : "group-hover:scale-105 group-active:scale-95",
          s.icon,
          v.iconWrap,
        ].join(" ")}
      >
        {loading ? (
          <Spinner className={`cta-spin ${iconInner}`} />
        ) : (
          renderGlyph(glyph, iconInner)
        )}
      </span>

      <span className="relative flex min-w-0 flex-1 flex-col leading-tight">
        <span className={`font-medium tracking-wide uppercase ${s.sub} ${v.sub}`}>
          {loading ? "Just a moment" : sublabel}
        </span>
        <span className={`truncate font-semibold ${s.label} ${v.label}`}>{label}</span>
      </span>

      <span
        aria-hidden="true"
        className={[
          "relative shrink-0 opacity-70 transition-transform duration-300",
          reduced ? "" : "group-hover:translate-x-1",
          v.label,
        ].join(" ")}
      >
        <ArrowGlyph className={size === "xl" ? "h-5 w-5" : "h-4 w-4"} />
      </span>
    </button>
  );
}

export interface NavButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  sublabel?: string;
  direction?: "left" | "right" | "none";
  variant?: "glass" | "outline" | "subtle" | "glow";
  glyph?: CtaGlyph;
  size?: "sm" | "md";
}

export function NavButton({
  label,
  sublabel,
  direction = "none",
  variant = "glass",
  glyph,
  size = "sm",
  className = "",
  disabled = false,
  onClick,
  ...props
}: NavButtonProps) {
  const isLeft = direction === "left";
  const isRight = direction === "right";

  const variants = {
    glass:
      "bg-white/[0.05] hover:bg-white/[0.09] active:bg-white/[0.03] border border-white/10 hover:border-white/20 text-neutral-300 hover:text-white backdrop-blur-md shadow-sm",
    outline:
      "bg-black/40 hover:bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 backdrop-blur-md",
    subtle:
      "bg-transparent hover:bg-white/[0.05] border border-transparent hover:border-white/10 text-neutral-400 hover:text-white",
    glow:
      "bg-gradient-to-r from-violet-600/20 to-indigo-600/20 hover:from-violet-600/30 hover:to-indigo-600/30 border border-indigo-500/30 hover:border-indigo-400/50 text-indigo-200 hover:text-white shadow-lg shadow-indigo-500/10",
  };

  const sizes = {
    sm: "px-3 py-2 text-xs rounded-xl gap-2",
    md: "px-4 py-2.5 text-sm rounded-xl gap-2.5",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "group relative inline-flex items-center justify-center font-medium tracking-wide transition-all duration-200 ease-out select-none cursor-pointer outline-none",
        "focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-black",
        "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-40",
        sizes[size],
        variants[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {isLeft && (
        <span className="shrink-0 transition-transform duration-200 group-hover:-translate-x-1 text-neutral-400 group-hover:text-white">
          <ArrowGlyph className="h-3.5 w-3.5 -scale-x-100" />
        </span>
      )}

      {glyph && !isLeft && !isRight && (
        <span className="shrink-0 text-neutral-400 group-hover:text-white transition-transform duration-200 group-hover:scale-110">
          {renderGlyph(glyph, "h-3.5 w-3.5")}
        </span>
      )}

      <span className="flex flex-col items-center justify-center leading-tight truncate">
        {sublabel && (
          <span className="text-[10px] text-neutral-400 group-hover:text-neutral-300 font-normal uppercase tracking-wider">
            {sublabel}
          </span>
        )}
        <span className="truncate">{label}</span>
      </span>

      {isRight && (
        <span className="shrink-0 transition-transform duration-200 group-hover:translate-x-1 text-neutral-400 group-hover:text-white">
          <ArrowGlyph className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
}


export function LargeCtaButtonTemplate() {
  const reduced = useReducedMotion() ?? false;
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);

  function simulate() {
    if (loading) return;
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setCount((c) => c + 1);
    }, 1600);
  }

  return (
    <section className="relative w-full bg-slate-50 px-4 py-16 sm:px-6 sm:py-24 dark:bg-slate-950">
      <style>{`
        @keyframes ctacta_sheen {
          0% { transform: translateX(0) skewX(-12deg); }
          100% { transform: translateX(340%) skewX(-12deg); }
        }
        @keyframes ctacta_spin {
          to { transform: rotate(360deg); }
        }
        .cta-sheen { animation: ctacta_sheen 0.9s ease-in-out; }
        .cta-spin { animation: ctacta_spin 0.8s linear infinite; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) {
          .cta-sheen, .cta-spin { animation: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-4xl">
        <header className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-600 dark:border-indigo-400/25 dark:bg-slate-900 dark:text-indigo-300">
            <SparkGlyph className="h-3.5 w-3.5" />
            Button Presets
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Large CTA Buttons
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600 sm:text-base dark:text-slate-400">
            Tactile marketing calls-to-action with a sublabel, icon and motion — five
            finishes, three sizes, real loading and disabled states.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          <CtaButton
            variant="gradient"
            size="xl"
            glyph="rocket"
            sublabel="No card required"
            label="Start your free trial"
            reduced={reduced}
            onActivate={simulate}
            loading={loading}
          />
          <CtaButton
            variant="solid"
            size="xl"
            glyph="calendar"
            sublabel="30-minute walkthrough"
            label="Book a live demo"
            reduced={reduced}
          />
          <CtaButton
            variant="outline"
            size="lg"
            glyph="spark"
            sublabel="Join 12,000+ teams"
            label="Get the Pro plan"
            reduced={reduced}
          />
          <CtaButton
            variant="soft"
            size="lg"
            glyph="arrow"
            sublabel="From $19 / month"
            label="Compare all plans"
            reduced={reduced}
          />
          <CtaButton
            variant="dark"
            size="md"
            glyph="rocket"
            sublabel="Ships in minutes"
            label="Deploy to production"
            reduced={reduced}
          />
          <CtaButton
            variant="outline"
            size="md"
            glyph="calendar"
            sublabel="Currently unavailable"
            label="Talk to sales"
            disabled
            reduced={reduced}
          />
        </div>

        <p
          className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400"
          aria-live="polite"
        >
          {loading
            ? "Setting up your trial workspace…"
            : count > 0
              ? `Trial started ${count} ${count === 1 ? "time" : "times"} — the button really works.`
              : "Tap “Start your free trial” to see the loading state."}
        </p>
      </div>
    </section>
  );
}

export default LargeCtaButtonTemplate;
