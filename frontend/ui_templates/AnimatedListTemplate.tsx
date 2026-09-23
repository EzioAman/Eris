"use client";

import React from "react";
import { cn } from "../src/lib/utils";
import { AnimatedList } from "../src/components/magicui/animated-list";
import { BadgeTemplate } from "./BadgeTemplate";
import { SkeletonTemplate } from "./SkeletonTemplate";
import { BellRing, ShieldCheck, Database, Terminal, CheckCircle2 } from "lucide-react";

export interface AnimatedListItemData {
  name: string;
  description: string;
  time: string;
  icon: string | React.ElementType;
  color: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline" | "success" | "destructive";
}

const notifications: AnimatedListItemData[] = [
  {
    name: "Session Authenticated",
    description: "Operator cryptographic token validated in auth.db keystore.",
    time: "Just now",
    icon: CheckCircle2,
    color: "#10B981",
    badge: "Verified",
    badgeVariant: "success",
  },
  {
    name: "Neural RAG Synced",
    description: "SQLite vector embeddings index refreshed nominal.",
    time: "2m ago",
    icon: Database,
    color: "#6366F1",
    badge: "RAG Vault",
    badgeVariant: "secondary",
  },
  {
    name: "Win32 Sandbox Active",
    description: "Process isolation AST guardrails armed for custom tool execution.",
    time: "5m ago",
    icon: ShieldCheck,
    color: "#38BDF8",
    badge: "Protected",
    badgeVariant: "outline",
  },
  {
    name: "CLI Tools Registry Loaded",
    description: "System pipeline tools indexed and available for autonomous commands.",
    time: "10m ago",
    icon: Terminal,
    color: "#F59E0B",
    badge: "Tools",
    badgeVariant: "default",
  },
  {
    name: "Identity Keystore Nominal",
    description: "Local password bcrypt hashes and session records synchronized.",
    time: "15m ago",
    icon: "🔑",
    color: "#EC4899",
    badge: "Nominal",
    badgeVariant: "success",
  },
];

const loopedNotifications = Array.from({ length: 4 }, () => notifications).flat();

export const NotificationFigure: React.FC<AnimatedListItemData> = ({
  name,
  description,
  icon: Icon,
  color,
  time,
  badge,
  badgeVariant = "secondary",
}) => {
  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full max-w-[400px] cursor-pointer overflow-hidden rounded-2xl p-4",
        // animation styles
        "transition-all duration-200 ease-in-out hover:scale-[103%] select-none",
        // dark / glass styles matching Magic UI specification
        "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        "transform-gpu dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]"
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-2xl shrink-0"
          style={{ backgroundColor: color }}
        >
          {typeof Icon === "string" ? (
            <span className="text-lg">{Icon}</span>
          ) : (
            <Icon className="size-5 text-white" />
          )}
        </div>
        <div className="flex flex-col overflow-hidden text-left flex-1 min-w-0">
          <figcaption className="flex flex-row items-center justify-between whitespace-pre text-sm font-semibold text-white">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-sm sm:text-base font-medium dark:text-white truncate">{name}</span>
              <span className="text-neutral-500 font-normal">·</span>
              <span className="text-xs text-neutral-400 font-normal">{time}</span>
            </div>
            {badge && (
              <BadgeTemplate variant={badgeVariant} className="text-[10px] px-1.5 py-0">
                {badge}
              </BadgeTemplate>
            )}
          </figcaption>
          <p className="text-sm font-normal text-neutral-400 dark:text-white/60 mt-0.5 line-clamp-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </figure>
  );
};

export function AnimatedListPreview() {
  return (
    <div className="relative flex h-[480px] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0d14]/90 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider font-sans">
            Realtime Stream
          </span>
        </div>
        <BadgeTemplate variant="outline" className="font-mono text-[10px]">
          Magic UI
        </BadgeTemplate>
      </div>

      <AnimatedList delay={1400} className="w-full">
        {loopedNotifications.map((item, idx) => (
          <NotificationFigure key={idx} {...item} />
        ))}
      </AnimatedList>

      {/* Radial fade mask overlay at bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0a0d14] to-transparent" />
    </div>
  );
}

export function AnimatedListTemplate() {
  return (
    <section className="relative w-full bg-[#080A10] px-4 py-16 sm:px-6 sm:py-24 font-sans">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-300">
            <BellRing className="h-3.5 w-3.5" />
            Animated Stream Component
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Magic UI Animated List Template
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-neutral-400 sm:text-base leading-relaxed">
            Canonical Magic UI notification stream with spring physics, glassmorphism cards, and integrated BadgeTemplate status tokens.
          </p>
        </header>

        <div className="flex flex-col items-center gap-6">
          <AnimatedListPreview />

          {/* SkeletonTemplate showcase for stream buffering */}
          <div className="w-full max-w-md space-y-2 p-3 rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="flex items-center justify-between text-xs text-neutral-400 px-1 font-sans">
              <span>Stream Buffer Placeholder</span>
              <BadgeTemplate variant="secondary" className="text-[10px]">SkeletonTemplate</BadgeTemplate>
            </div>
            <SkeletonTemplate className="h-8 w-full rounded-xl bg-white/5" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default AnimatedListTemplate;
