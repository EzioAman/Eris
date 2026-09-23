import React, { useEffect, useRef } from 'react';
import './emil-loading-bar.css';

export interface EmilLoadingBarProps {
  /** Target progress value between 0 and 100 */
  progress: number;
  /** Whether the loading is paused/halted */
  isPaused?: boolean;
  /** Whether all checks/loading steps have completed successfully */
  isCompleted?: boolean;
  /** Whether loading halted due to an error/failure */
  isFailed?: boolean;
  /** Optional container class name */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
}

export const EmilLoadingBar: React.FC<EmilLoadingBarProps> = ({
  progress,
  isPaused = false,
  isCompleted = false,
  isFailed = false,
  className = '',
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const energyRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLSpanElement>(null);
  const glareRef = useRef<HTMLSpanElement>(null);
  const particleWrapRef = useRef<HTMLDivElement>(null);

  // Physics state kept in refs for high-frequency RAF loop
  const physicsRef = useRef({
    ballX: 0,
    ballVel: 0,
    lastTime: 0,
    fadeStartTime: 0,
    targetProgress: progress,
    isCompleted: isCompleted,
    isPaused: isPaused,
    isFailed: isFailed,
    completedTriggered: false,
  });

  // Keep state updated in refs without re-binding RAF loop
  useEffect(() => {
    physicsRef.current.targetProgress = isCompleted ? 100 : Math.max(0, Math.min(100, progress));
    physicsRef.current.isPaused = isPaused;
    physicsRef.current.isCompleted = isCompleted;
    physicsRef.current.isFailed = isFailed;

    // If unpausing, reset lastTime to prevent dt explosion
    if (!isPaused) {
      physicsRef.current.lastTime = 0;
    }
  }, [progress, isPaused, isCompleted, isFailed]);

  // Main physics & animation loop
  useEffect(() => {
    const SPRING = 12;
    const DAMPING = 6;
    const VEL_CAP = 80;
    const BASE = 28;

    let animFrameId: number;

    const getCssVar = (name: string): string => {
      if (!containerRef.current) return '';
      return getComputedStyle(containerRef.current).getPropertyValue(name).trim();
    };

    const spawnParticle = () => {
      const wrap = particleWrapRef.current;
      if (!wrap) return;

      const p = document.createElement('span');
      const sz = Math.random() * 3 + 1;
      const pColor = getCssVar('--active-light') || '#93c5fd';

      Object.assign(p.style, {
        width: `${sz}px`,
        height: `${sz}px`,
        left: '0px',
        top: `${(Math.random() - 0.5) * 20}px`,
        position: 'absolute',
        borderRadius: '50%',
        background: pColor,
        boxShadow: `0 0 8px ${pColor}`,
        pointerEvents: 'none',
      });

      wrap.appendChild(p);

      const dx = -(Math.random() * 40 + 20);
      const dy = (Math.random() - 0.5) * 30;
      const life = Math.random() * 400 + 300;
      const t0 = performance.now();

      function tickParticle(now: number) {
        const f = (now - t0) / life;
        if (f >= 1) {
          if (p.parentNode) p.parentNode.removeChild(p);
          return;
        }
        p.style.transform = `translate(${dx * f}px, ${dy * f}px)`;
        p.style.opacity = (1 - f).toString();
        requestAnimationFrame(tickParticle);
      }

      requestAnimationFrame(tickParticle);
    };

    const resetCoreStyle = () => {
      const core = coreRef.current;
      const glare = glareRef.current;
      const energy = energyRef.current;
      if (!core || !glare || !energy) return;

      core.style.width = `${BASE}px`;
      core.style.height = `${BASE}px`;
      core.style.borderRadius = '50%';
      core.style.background = getCssVar('--active-light');
      core.style.boxShadow = `0 0 12px ${getCssVar('--active-soft')}, 0 0 32px ${getCssVar(
        '--color-active'
      )}, 0 0 64px ${getCssVar('--active-deep')}`;
      core.style.filter = 'blur(2px)';
      glare.style.transform = '';
      energy.style.opacity = '0';
    };

    const updateLoop = (ts: number) => {
      const state = physicsRef.current;
      const bar = barRef.current;
      const energy = energyRef.current;
      const core = coreRef.current;
      const glare = glareRef.current;

      if (!state.fadeStartTime) state.fadeStartTime = ts;
      if (!state.lastTime) state.lastTime = ts;

      const dt = Math.min((ts - state.lastTime) / 1000, 0.05);
      state.lastTime = ts;

      if (!state.isPaused && bar && energy && core && glare) {
        // Target progress spring physics
        const target = state.targetProgress;
        const gap = target - state.ballX;
        const accel = gap * SPRING - state.ballVel * DAMPING;
        state.ballVel += accel * dt;
        state.ballX = Math.max(0, Math.min(100, state.ballX + state.ballVel * dt));

        energy.style.left = `${state.ballX}%`;
        bar.style.width = `${state.ballX}%`;

        // Normalised speed 0→1
        const spd = Math.abs(state.ballVel);
        const t = Math.min(spd / VEL_CAP, 1);
        const dir = state.ballVel >= 0 ? 1 : -1;

        // Deformation: stretch horizontally, compress vertically
        const w = BASE + t * 36;
        const h = Math.max(14, BASE - t * 8);

        // Border-radius: leading round, trailing sliver
        const lead = 50;
        const trail = Math.max(50 - t * 44, 6);
        const [tl, tr, br, bl] =
          dir >= 0
            ? [trail, lead, lead, trail]
            : [lead, trail, trail, lead];

        const gx = dir >= 0 ? 50 + t * 45 : 50 - t * 45;
        const activeLight = getCssVar('--active-light') || '#93c5fd';
        const colorActive = getCssVar('--color-active') || '#2a8cff';
        const activeSoft = getCssVar('--active-soft') || '#60a5fa';
        const activeDeep = getCssVar('--active-deep') || '#1e3a8a';

        core.style.width = `${w}px`;
        core.style.height = `${h}px`;
        core.style.borderRadius = `${tl}% ${tr}% ${br}% ${bl}%`;
        core.style.background =
          `radial-gradient(ellipse at ${gx}% 50%, ` +
          `color-mix(in oklch, ${activeLight} ${(100 - t * 40).toFixed(0)}%, #fff) 0%, ` +
          `${activeLight} ${(30 - t * 25).toFixed(1)}%, ` +
          `color-mix(in oklch, ${colorActive} ${((0.45 - t * 0.38) * 100).toFixed(0)}%, transparent) ${(55 - t * 28).toFixed(1)}%, ` +
          `transparent ${(82 - t * 40).toFixed(1)}%)`;

        const gs = dir * t * 8;
        core.style.boxShadow =
          `${gs.toFixed(1)}px 0 ${(12 + t * 10).toFixed(0)}px color-mix(in oklch, ${activeSoft} ${((1 - t * 0.4) * 100).toFixed(0)}%, transparent), ` +
          `${(gs * 1.5).toFixed(1)}px 0 ${(32 + t * 14).toFixed(0)}px color-mix(in oklch, ${colorActive} ${((0.8 - t * 0.35) * 100).toFixed(0)}%, transparent), ` +
          `${(gs * 2).toFixed(1)}px 0 ${(64 + t * 16).toFixed(0)}px color-mix(in oklch, ${activeDeep} ${((0.6 - t * 0.3) * 100).toFixed(0)}%, transparent)`;

        core.style.filter = `blur(${(2 + t * 2).toFixed(1)}px)`;
        glare.style.transform = `translateX(${(-t * 30).toFixed(0)}px) scaleX(${(1 + t * 0.4).toFixed(2)})`;

        // Particles
        if (spd > 5 && Math.random() < spd / 180) {
          spawnParticle();
        }

        // Fade envelope
        const fadeIn = Math.min((ts - state.fadeStartTime) / 400, 1);
        const fadeOut = state.ballX >= 95 ? (100 - state.ballX) / 5 : 1;
        energy.style.opacity = (fadeIn * fadeOut).toString();

        // Completion transition
        if (state.isCompleted && state.ballX > 99.2 && !state.completedTriggered) {
          state.completedTriggered = true;
          bar.classList.add('done');
          containerRef.current?.classList.add('bloom');
          resetCoreStyle();
        }
      } else if (state.isPaused && bar && energy) {
        // Halted: hold velocity at 0 and freeze ball at current position
        state.ballVel = 0;
        energy.style.left = `${state.ballX}%`;
        bar.style.width = `${state.ballX}%`;
      }

      animFrameId = requestAnimationFrame(updateLoop);
    };

    animFrameId = requestAnimationFrame(updateLoop);

    // Flicker effect
    const flickerInterval = setInterval(() => {
      if (physicsRef.current.isPaused || !energyRef.current) return;
      energyRef.current.style.filter = `brightness(${1 + Math.random() * 0.5}) saturate(${1.3 + Math.random()})`;
    }, 80);

    return () => {
      cancelAnimationFrame(animFrameId);
      clearInterval(flickerInterval);
    };
  }, []);

  return (
    <div
      className={`emil-loader-wrapper ${isFailed ? 'failed' : ''} ${className}`}
      style={style}
    >
      <div className="emil-loader" ref={containerRef}>
        <div className="emil-progress" ref={barRef} />
        <div className="emil-done-flash" />
        <div className="emil-energy" ref={energyRef}>
          <span className="core" ref={coreRef} />
          <span className="glare" ref={glareRef} />
          <div className="emil-particles" ref={particleWrapRef} />
        </div>
      </div>
    </div>
  );
};

export default EmilLoadingBar;
