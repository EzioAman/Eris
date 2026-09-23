import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { cn } from '../src/lib/utils';
import { Button } from '../src/components/ui/button';

export interface StepCheckItem {
  id?: string;
  before: {
    title: string;
    subtitle: string;
  };
  after: {
    title: string;
    subtitle: string;
  };
  run?: () => Promise<{ ok: boolean; error?: string }>;
}

export interface StepChecklistProps {
  steps: StepCheckItem[];
  title?: string;
  subtitle?: string;
  finishedTitle?: string;
  finishedSubtitle?: string;
  finishedButtonText?: string;
  onFinished?: () => void;
  onProgress?: (progress: number) => void;
  onError?: (error: string | null) => void;
  autoStart?: boolean;
  className?: string;
  splitLayout?: boolean;
  hideCenterCard?: boolean;
}

interface StepProgressContextType {
  finishStepProgress: number;
  setFinishStepProgress: React.Dispatch<React.SetStateAction<number>>;
}

const StepProgressContext = createContext<StepProgressContextType | undefined>(undefined);

const useStepProgress = () => {
  const context = useContext(StepProgressContext);
  if (!context) {
    throw new Error('useStepProgress must be used inside StepProgressContext.Provider');
  }
  return context;
};

export const StepChecklistIconSprites: React.FC = () => (
  <svg width="0" height="0" aria-hidden="true" className="absolute pointer-events-none">
    <symbol id="step-check-circle" viewBox="0 0 16 16">
      <circle fill="currentColor" cx="8" cy="8" r="8" />
      <polyline
        fill="none"
        stroke="#000000"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        points="4 8,7 11,12 5"
      />
    </symbol>
    <symbol id="step-checkmark" viewBox="0 0 16 16">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
        points="2 7,7 11,15 2"
      />
    </symbol>
  </svg>
);

const StepIcon: React.FC<{ icon: 'step-check-circle' | 'step-checkmark'; color?: string; className?: string }> = ({
  icon,
  className,
}) => (
  <svg className={cn('size-4 shrink-0 transition-opacity duration-300', className)} aria-hidden="true">
    <use href={`#${icon}`} />
  </svg>
);

const CircularProgress: React.FC<{ value?: number; className?: string }> = ({ value = 0, className }) => {
  const circumference = 62.83;
  const strokeDash = `${circumference} ${circumference}`;
  const offset = circumference * (1 - clampProgress(value, 0, 1));

  return (
    <svg
      className={cn('size-5 shrink-0 overflow-visible transition-opacity duration-300', className)}
      viewBox="0 0 24 24"
      width="24px"
      height="24px"
      aria-hidden="true"
    >
      <g fill="transparent" strokeLinecap="round" strokeWidth="2.5" transform="rotate(-90,12,12)">
        <circle className="stroke-white/10" cx="12" cy="12" r="10" />
        <circle
          stroke="hsl(163, 90%, 45%)"
          cx="12"
          cy="12"
          r="10"
          strokeDasharray={strokeDash}
          strokeDashoffset={offset}
          className="transition-all duration-75"
        />
      </g>
    </svg>
  );
};

function clampProgress(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

const StepPhase: React.FC<{
  title: string;
  subtitle: string;
  forProgress?: boolean;
  progressActive?: boolean;
}> = ({ title, subtitle, forProgress, progressActive }) => {
  const { finishStepProgress } = useStepProgress();
  const value = progressActive ? finishStepProgress : 0;

  return (
    <div className="flex items-start gap-3.5 text-left">
      <div className="mt-0.5 flex size-5 items-center justify-center shrink-0">
        {forProgress ? (
          <CircularProgress value={value} />
        ) : (
          <StepIcon icon="step-checkmark" className="text-emerald-400" />
        )}
      </div>
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold tracking-tight text-white">{title}</h3>
        <p className="text-xs text-neutral-400 font-normal leading-relaxed mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
};

const StepRow: React.FC<{
  step: StepCheckItem;
  phase: 'waiting' | 'current' | 'done' | 'failed';
  error?: string;
  onRetry?: () => void;
}> = ({ step, phase, error, onRetry }) => {
  const isDone = phase === 'done';
  const isCurrent = phase === 'current';
  const isFailed = phase === 'failed';

  return (
    <div
      className={cn(
        'relative rounded-2xl border p-4 transition-all duration-300 backdrop-blur-md',
        isDone && 'border-emerald-500/30 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.06)]',
        isCurrent && 'border-white/20 bg-white/[0.04] shadow-lg',
        isFailed && 'border-rose-500/50 bg-rose-950/30 shadow-[0_0_25px_rgba(244,63,94,0.15)]',
        phase === 'waiting' && 'border-white/5 bg-white/[0.01] opacity-50'
      )}
    >
      {isDone ? (
        <StepPhase title={step.after.title} subtitle={step.after.subtitle} />
      ) : isFailed ? (
        <div className="flex items-start gap-3.5 text-left">
          <div className="mt-0.5 flex size-5 items-center justify-center shrink-0 text-rose-400">
            <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="8" r="7" />
              <line x1="5" y1="5" x2="11" y2="11" />
              <line x1="11" y1="5" x2="5" y2="11" />
            </svg>
          </div>
          <div className="flex flex-col flex-1">
            <h3 className="text-sm font-semibold tracking-tight text-rose-200">{step.before.title}</h3>
            <p className="text-xs text-rose-400/90 font-normal leading-relaxed mt-0.5">
              {error || 'Subsystem check failed'}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 self-start text-[11px] font-semibold text-rose-300 hover:text-white underline cursor-pointer"
              >
                Retry Check
              </button>
            )}
          </div>
        </div>
      ) : (
        <StepPhase
          title={step.before.title}
          subtitle={step.before.subtitle}
          forProgress
          progressActive={isCurrent}
        />
      )}
    </div>
  );
};

export const StepChecklist: React.FC<StepChecklistProps> = ({
  steps,
  title,
  subtitle,
  finishedTitle = 'All system verified & ready!',
  finishedSubtitle,
  finishedButtonText = 'Enter Workspace',
  onFinished,
  onProgress,
  onError,
  autoStart = true,
  className,
  splitLayout,
  hideCenterCard: _hideCenterCard = false,
}) => {
  const [currentStep, setCurrentStep] = useState(autoStart ? 0 : -1);
  const [finishStepProgress, setFinishStepProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [failedStep, setFailedStep] = useState<{ index: number; error: string } | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const stepIndexRef = useRef(currentStep);
  stepIndexRef.current = currentStep;

  const retryCurrentStep = () => {
    setFailedStep(null);
    onError?.(null);
    setFinishStepProgress(0);
    setRetryTrigger((prev) => prev + 1);
  };

  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  useEffect(() => {
    if (currentStep < 0 || currentStep >= steps.length) return;

    let animFrame: number;
    let cancelled = false;

    const runCurrentStep = async () => {
      const step = stepsRef.current[currentStep];
      if (!step) return;
      const startTime = performance.now();
      const minDuration = 800; // deliberate readable pace

      const executePromise = step.run ? step.run() : Promise.resolve({ ok: true });

      // Animate circular progress
      const tick = (now: number) => {
        if (cancelled) return;
        const elapsed = now - startTime;
        const p = Math.min(elapsed / minDuration, 0.95);
        setFinishStepProgress(p);
        const overall = Math.round(((currentStep + p) / steps.length) * 100);
        onProgress?.(overall);

        if (elapsed < minDuration) {
          animFrame = requestAnimationFrame(tick);
        }
      };
      animFrame = requestAnimationFrame(tick);

      let runResult: { ok: boolean; error?: string } = { ok: true };
      try {
        const [res] = await Promise.all([
          executePromise,
          new Promise((r) => setTimeout(r, minDuration)),
        ]);
        if (res && typeof res.ok === 'boolean') {
          runResult = res;
        }
      } catch (err: any) {
        console.warn('Check step probe error:', err);
        runResult = { ok: false, error: err?.message || String(err) };
      }

      if (cancelled) return;

      // If probe failed, halt progress!
      if (!runResult.ok) {
        setFailedStep({
          index: currentStep,
          error: runResult.error || 'Subsystem check failed',
        });
        onError?.(runResult.error || 'Subsystem check failed');
        return; // Halt immediately!
      }

      // Successful probe
      setFailedStep(null);
      onError?.(null);
      setFinishStepProgress(1);
      const stepDoneProgress = Math.round(((currentStep + 1) / steps.length) * 100);
      onProgress?.(stepDoneProgress);

      // Transition to next step after brief pause
      setTimeout(() => {
        if (cancelled) return;
        if (currentStep + 1 < steps.length) {
          setFinishStepProgress(0);
          setCurrentStep(currentStep + 1);
        } else {
          setIsCompleted(true);
          onProgress?.(100);
          onFinished?.();
        }
      }, 400);
    };

    runCurrentStep();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrame);
    };
  }, [currentStep, retryTrigger]);

  const isSplit = splitLayout ?? steps.length >= 6;
  const splitPoint = Math.ceil(steps.length / 2);
  const leftSteps = isSplit ? steps.slice(0, splitPoint) : steps;
  const rightSteps = isSplit ? steps.slice(splitPoint) : [];

  return (
    <StepProgressContext.Provider value={{ finishStepProgress, setFinishStepProgress }}>
      <StepChecklistIconSprites />
      <div className={cn('relative w-full select-none font-sans', className)}>
        {/* Header */}
        {(title || subtitle) && !isCompleted && (
          <div className="mb-6 text-center space-y-1">
            {title && <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>}
            {subtitle && <p className="text-xs text-neutral-400 leading-relaxed">{subtitle}</p>}
          </div>
        )}

        {isSplit ? (
          /* Flanking Layout pushed outward: Left Cards, Open Middle, Right Cards */
          <div className="w-full flex flex-col lg:flex-row justify-between items-center gap-6 lg:gap-10">
            {/* Left Column (3 cards) pushed to the left */}
            <div className="flex flex-col gap-3.5 w-full lg:w-[330px] xl:w-[370px] shrink-0">
              {leftSteps.map((step, idx) => {
                const originalIdx = idx;
                let phase: 'waiting' | 'current' | 'done' | 'failed' = 'waiting';
                if (failedStep?.index === originalIdx) phase = 'failed';
                else if (originalIdx < currentStep || isCompleted) phase = 'done';
                else if (originalIdx === currentStep) phase = 'current';

                return (
                  <StepRow
                    key={step.id || idx}
                    step={step}
                    phase={phase}
                    error={failedStep?.index === originalIdx ? failedStep.error : undefined}
                    onRetry={retryCurrentStep}
                  />
                );
              })}
            </div>

            {/* Middle Area: Wide open and untouched for WebGL Strands */}
            <div className="hidden lg:flex flex-1 min-w-[200px] h-full pointer-events-none" />

            {/* Right Column (3 cards) pushed to the right */}
            <div className="flex flex-col gap-3.5 w-full lg:w-[330px] xl:w-[370px] shrink-0">
              {rightSteps.map((step, idx) => {
                const originalIdx = idx + splitPoint;
                let phase: 'waiting' | 'current' | 'done' | 'failed' = 'waiting';
                if (failedStep?.index === originalIdx) phase = 'failed';
                else if (originalIdx < currentStep || isCompleted) phase = 'done';
                else if (originalIdx === currentStep) phase = 'current';

                return (
                  <StepRow
                    key={step.id || idx}
                    step={step}
                    phase={phase}
                    error={failedStep?.index === originalIdx ? failedStep.error : undefined}
                    onRetry={retryCurrentStep}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          /* Single Column Fallback */
          <div className="max-w-lg mx-auto">
            {!isCompleted ? (
              <div className="flex flex-col gap-3 transition-all duration-300">
                {steps.map((step, idx) => {
                  let phase: 'waiting' | 'current' | 'done' | 'failed' = 'waiting';
                  if (failedStep?.index === idx) phase = 'failed';
                  else if (idx < currentStep) phase = 'done';
                  else if (idx === currentStep) phase = 'current';

                  return (
                    <StepRow
                      key={step.id || idx}
                      step={step}
                      phase={phase}
                      error={failedStep?.index === idx ? failedStep.error : undefined}
                      onRetry={retryCurrentStep}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl border border-emerald-500/30 bg-[#0a0d14]/95 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-400">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <StepIcon icon="step-check-circle" className="size-8 text-emerald-400" />
                </div>

                <h2 className="text-2xl font-bold text-white tracking-tight mb-6 font-sans">
                  {finishedTitle}
                </h2>

                {finishedSubtitle ? (
                  <p className="text-sm text-neutral-400 max-w-sm mb-6 leading-relaxed font-sans">
                    {finishedSubtitle}
                  </p>
                ) : null}

                <Button
                  size="lg"
                  onClick={onFinished}
                  className="h-12 px-8 rounded-2xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 cursor-pointer shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 transition-all font-sans"
                >
                  {finishedButtonText}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </StepProgressContext.Provider>
  );
};

export default StepChecklist;
