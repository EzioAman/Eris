"use client";

import React, { forwardRef, useRef, useState } from "react";
import { cn } from "../src/lib/utils";
import { AnimatedBeam } from "../src/components/magicui/animated-beam";
import {
  Bot,
  Database,
  Terminal,
  Shield,
  Layers,
  Sparkles,
  Key,
} from "lucide-react";

export const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode; label?: string }
>(({ className, children, label }, ref) => {
  return (
    <div className="flex flex-col items-center gap-1.5 z-10">
      <div
        ref={ref}
        className={cn(
          "flex size-12 sm:size-14 items-center justify-center rounded-2xl border border-white/15 bg-neutral-900/80 p-3 text-white shadow-[0_0_25px_-5px_rgba(139,92,246,0.3)] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-violet-500/50 hover:shadow-[0_0_35px_rgba(139,92,246,0.5)]",
          className
        )}
      >
        {children}
      </div>
      {label && (
        <span className="text-[11px] font-mono font-medium text-neutral-400 select-none">
          {label}
        </span>
      )}
    </div>
  );
});

Circle.displayName = "Circle";

export function AnimatedBeamDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const div1Ref = useRef<HTMLDivElement>(null);
  const div2Ref = useRef<HTMLDivElement>(null);
  const div3Ref = useRef<HTMLDivElement>(null);
  const div4Ref = useRef<HTMLDivElement>(null);
  const div5Ref = useRef<HTMLDivElement>(null);
  const div6Ref = useRef<HTMLDivElement>(null);
  const div7Ref = useRef<HTMLDivElement>(null);

  const [bidirectional, setBidirectional] = useState(true);
  const [curvature, setCurvature] = useState(40);

  return (
    <div className="relative flex w-full max-w-4xl flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#0A0D16]/90 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 w-full border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h3 className="text-base sm:text-lg font-semibold text-white tracking-wide">
              Magic UI Animated Beam — Local-First Architecture
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Dynamic SVG light paths animating data flow between decoupled system agents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBidirectional((b) => !b)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-colors cursor-pointer"
          >
            Flow: {bidirectional ? "Bidirectional" : "Inbound Only"}
          </button>
          <button
            type="button"
            onClick={() => setCurvature((c) => (c === 40 ? 0 : c === 0 ? -40 : 40))}
            className="px-3 py-1.5 rounded-lg text-xs font-mono border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors cursor-pointer"
          >
            Curvature: {curvature}px
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex h-[360px] sm:h-[400px] w-full items-center justify-between p-4 sm:p-8"
      >
        {/* Left Column: Client Inputs */}
        <div className="flex flex-col justify-between h-full gap-6">
          <Circle ref={div1Ref} label="Auth TPM">
            <Key className="w-5 h-5 text-amber-400" />
          </Circle>
          <Circle ref={div2Ref} label="SQLite Vault">
            <Database className="w-5 h-5 text-emerald-400" />
          </Circle>
          <Circle ref={div3Ref} label="Job Sandbox">
            <Shield className="w-5 h-5 text-sky-400" />
          </Circle>
        </div>

        {/* Center: Core Engine */}
        <div className="flex flex-col justify-center">
          <Circle
            ref={div4Ref}
            label="ERIS Kernel"
            className="size-16 sm:size-20 border-violet-500/60 bg-violet-950/40 shadow-[0_0_40px_rgba(139,92,246,0.6)]"
          >
            <Bot className="w-8 h-8 text-violet-300 animate-pulse" />
          </Circle>
        </div>

        {/* Right Column: Execution Providers */}
        <div className="flex flex-col justify-between h-full gap-6">
          <Circle ref={div5Ref} label="Gemini 2.5">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </Circle>
          <Circle ref={div6Ref} label="Tool Dispatch">
            <Terminal className="w-5 h-5 text-cyan-400" />
          </Circle>
          <Circle ref={div7Ref} label="Vector Memory">
            <Layers className="w-5 h-5 text-pink-400" />
          </Circle>
        </div>

        {/* Inbound Beams (Left to Center) */}
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={div1Ref}
          toRef={div4Ref}
          curvature={curvature}
          gradientStartColor="#F59E0B"
          gradientStopColor="#8B5CF6"
          duration={3.5}
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={div2Ref}
          toRef={div4Ref}
          curvature={0}
          gradientStartColor="#10B981"
          gradientStopColor="#8B5CF6"
          duration={3.0}
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={div3Ref}
          toRef={div4Ref}
          curvature={-curvature}
          gradientStartColor="#0EA5E9"
          gradientStopColor="#8B5CF6"
          duration={4.0}
        />

        {/* Outbound Beams (Center to Right) */}
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={div4Ref}
          toRef={div5Ref}
          curvature={curvature}
          gradientStartColor="#8B5CF6"
          gradientStopColor="#C084FC"
          duration={3.2}
          reverse={bidirectional}
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={div4Ref}
          toRef={div6Ref}
          curvature={0}
          gradientStartColor="#8B5CF6"
          gradientStopColor="#06B6D4"
          duration={2.8}
          reverse={bidirectional}
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={div4Ref}
          toRef={div7Ref}
          curvature={-curvature}
          gradientStartColor="#8B5CF6"
          gradientStopColor="#EC4899"
          duration={3.7}
          reverse={bidirectional}
        />
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-[11px] font-mono text-neutral-400 border-t border-white/5 pt-4 w-full">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Live SVG Path Calculations
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-400" />
          GPU-Accelerated Gradients
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          ResizeObserver Sync
        </span>
      </div>
    </div>
  );
}

export function AnimatedBeamTemplate() {
  return (
    <section className="relative w-full bg-[#080A10] px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-medium text-violet-300">
            <Sparkles className="h-3.5 w-3.5" />
            Magic UI Component
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Animated Beam Template
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-400 sm:text-base">
            Visualize reactive inter-process connections, service integrations, and network topologies
            with customizable curvature and bi-directional gradient pulses.
          </p>
        </header>

        <div className="flex justify-center">
          <AnimatedBeamDemo />
        </div>
      </div>
    </section>
  );
}

export default AnimatedBeamTemplate;
