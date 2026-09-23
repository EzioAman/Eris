import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../src/lib/utils';

export interface StepItem {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'current' | 'upcoming';
}

export interface ProgressStepsTemplateProps {
  steps: StepItem[];
  onStepClick?: (step: StepItem, index: number) => void;
  orientation?: 'horizontal' | 'vertical';
  isDarkMode?: boolean;
  className?: string;
}

export const ProgressStepsTemplate: React.FC<ProgressStepsTemplateProps> = ({
  steps,
  onStepClick,
  orientation = 'horizontal',
  isDarkMode = true,
  className,
}) => {
  if (orientation === 'vertical') {
    return (
      <div className={cn('space-y-6 font-sans select-none', className)}>
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';

          return (
            <div
              key={step.id}
              onClick={() => onStepClick?.(step, idx)}
              className={cn(
                'flex items-start gap-3.5 relative group',
                onStepClick && 'cursor-pointer'
              )}
            >
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-4 top-8 bottom-[-24px] w-0.5 transition-colors',
                    isCompleted
                      ? 'bg-blue-600 dark:bg-blue-500'
                      : isDarkMode
                      ? 'bg-neutral-800'
                      : 'bg-slate-200'
                  )}
                />
              )}

              <div
                className={cn(
                  'size-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all z-10',
                  isCompleted
                    ? 'bg-blue-600 text-white'
                    : isCurrent
                    ? 'border-2 border-blue-600 text-blue-600 bg-white dark:bg-[#0F131D] dark:text-blue-400 dark:border-blue-400 shadow-sm shadow-blue-500/20'
                    : isDarkMode
                    ? 'border border-neutral-800 text-neutral-500 bg-neutral-900'
                    : 'border border-slate-300 text-slate-400 bg-white'
                )}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-3" /> : idx + 1}
              </div>

              <div className="pt-1 min-w-0">
                <p
                  className={cn(
                    'text-xs font-semibold leading-none',
                    isCurrent
                      ? isDarkMode
                        ? 'text-white'
                        : 'text-slate-900'
                      : isCompleted
                      ? isDarkMode
                        ? 'text-neutral-200'
                        : 'text-slate-700'
                      : isDarkMode
                      ? 'text-neutral-500'
                      : 'text-slate-400'
                  )}
                >
                  {step.title}
                </p>
                {step.description && (
                  <p
                    className={cn(
                      'text-[11px] mt-1',
                      isDarkMode ? 'text-neutral-400' : 'text-slate-500'
                    )}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal orientation
  return (
    <div className={cn('w-full flex items-center font-sans select-none', className)}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const isCompleted = step.status === 'completed';
        const isCurrent = step.status === 'current';

        return (
          <React.Fragment key={step.id}>
            <div
              onClick={() => onStepClick?.(step, idx)}
              className={cn(
                'flex items-center gap-2.5 shrink-0 group',
                onStepClick && 'cursor-pointer'
              )}
            >
              <div
                className={cn(
                  'size-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all',
                  isCompleted
                    ? 'bg-blue-600 text-white'
                    : isCurrent
                    ? 'border-2 border-blue-600 text-blue-600 bg-white dark:bg-[#0F131D] dark:text-blue-400 dark:border-blue-400'
                    : isDarkMode
                    ? 'border border-neutral-800 text-neutral-500 bg-neutral-900'
                    : 'border border-slate-300 text-slate-400 bg-white'
                )}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-3" /> : idx + 1}
              </div>
              <span
                className={cn(
                  'text-xs font-semibold truncate',
                  isCurrent
                    ? isDarkMode
                      ? 'text-white'
                      : 'text-slate-900'
                    : isCompleted
                    ? isDarkMode
                      ? 'text-neutral-300'
                      : 'text-slate-700'
                    : isDarkMode
                    ? 'text-neutral-500'
                    : 'text-slate-400'
                )}
              >
                {step.title}
              </span>
            </div>

            {!isLast && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-3 transition-colors',
                  isCompleted
                    ? 'bg-blue-600 dark:bg-blue-500'
                    : isDarkMode
                    ? 'bg-neutral-800'
                    : 'bg-slate-200'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ProgressStepsTemplate;
