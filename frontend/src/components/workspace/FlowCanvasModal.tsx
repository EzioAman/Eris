import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle2, Square, Pencil, X, RotateCcw, ArrowDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { ScheduledTaskItem } from './chatTypes';
import { AnimatedList, AnimatedListItem } from '../magicui/animated-list';

export interface FlowCanvasModalProps {
  isDarkMode: boolean;
  selectedTask: ScheduledTaskItem | null;
  onClose: () => void;
  onRunWorkflow: (task: ScheduledTaskItem) => void;
  onStopWorkflow?: (taskId: string) => void;
  onSkipStep: (taskId: string, stepId: string) => void;
  onEditWorkflow?: (task: ScheduledTaskItem) => void;
}

export const FlowCanvasModal: React.FC<FlowCanvasModalProps> = ({
  isDarkMode,
  selectedTask,
  onClose,
  onRunWorkflow,
  onStopWorkflow,
  onSkipStep,
  onEditWorkflow,
}) => {
  // Escape key to dismiss
  useEffect(() => {
    if (!selectedTask) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTask, onClose]);

  return (
    <AnimatePresence>
      {selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md font-sans"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className={cn(
              'relative w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-2xl border shadow-2xl flex flex-col font-sans',
              isDarkMode
                ? 'border-white/15 bg-[#0F131D] text-white'
                : 'border-slate-200 bg-white text-slate-900'
            )}
          >
            {/* Modal Header */}
            <div
              className={cn(
                'p-5 border-b flex items-center justify-between shrink-0',
                isDarkMode ? 'border-white/10' : 'border-slate-100'
              )}
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-semibold">{selectedTask.title}</h3>
                  {selectedTask.createdBy === 'eris' && (
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                      ERIS
                    </span>
                  )}
                  <span
                    className={cn(
                      'text-[11px] font-mono px-2 py-0.5 rounded font-semibold uppercase',
                      selectedTask.status === 'completed'
                        ? isDarkMode
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : selectedTask.status === 'running'
                          ? isDarkMode
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                            : 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                          : isDarkMode
                            ? 'bg-white/5 text-neutral-400 border border-white/10'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                    )}
                  >
                    {selectedTask.status}
                  </span>
                </div>
                <p
                  className={cn(
                    'text-[12px] mt-1 line-clamp-1',
                    isDarkMode ? 'text-neutral-400' : 'text-slate-500'
                  )}
                >
                  {selectedTask.summary || `${selectedTask.steps.length} steps automation pipeline`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Edit Workflow button */}
                {selectedTask.status !== 'running' && onEditWorkflow && (
                  <button
                    type="button"
                    onClick={() => {
                      onEditWorkflow(selectedTask);
                      onClose();
                    }}
                    className={cn(
                      'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                      isDarkMode
                        ? 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                )}

                {/* Stop running workflow */}
                {selectedTask.status === 'running' && onStopWorkflow && (
                  <button
                    type="button"
                    onClick={() => onStopWorkflow(selectedTask.id)}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-all shadow-sm"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    Stop Execution
                  </button>
                )}

                {/* Run or Re-run workflow */}
                {selectedTask.status !== 'running' && (
                  <button
                    type="button"
                    onClick={() => onRunWorkflow(selectedTask)}
                    className={cn(
                      'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all',
                      selectedTask.status === 'completed'
                        ? isDarkMode
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : isDarkMode
                          ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    )}
                  >
                    {selectedTask.status === 'completed' ? (
                      <>
                        <RotateCcw className="w-3 h-3" />
                        Re-run Pipeline
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        Run Workflow
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors cursor-pointer ml-1',
                    isDarkMode
                      ? 'hover:bg-white/10 text-neutral-400 hover:text-white'
                      : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                  )}
                  title="Close (Escape)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Split Flow Canvas & History */}
            <div className="flex-1 flex overflow-hidden">
              {/* Workflow Step Flow Canvas */}
              <div className="flex-1 p-6 overflow-y-auto relative">
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: isDarkMode
                      ? 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)'
                      : 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                    opacity: 0.4,
                  }}
                />

                <div className="relative z-10 max-w-lg mx-auto py-2">
                  <div className="space-y-0">
                    {selectedTask.steps.map((step, index) => {
                      const isLast = index === selectedTask.steps.length - 1;
                      const isCompleted = step.status === 'completed';
                      const isActive = step.status === 'active';

                      return (
                        <div key={step.id} className="relative">
                          {/* Step Card */}
                          <div
                            className={cn(
                              'w-full p-4 rounded-xl border shadow-sm text-left transition-all duration-200',
                              isDarkMode ? 'bg-[#161B26]' : 'bg-white',
                              isActive
                                ? isDarkMode
                                  ? 'border-indigo-500/60 ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-500/5'
                                  : 'border-blue-500 ring-1 ring-blue-400 shadow-md shadow-blue-500/5'
                                : isCompleted
                                  ? isDarkMode
                                    ? 'border-emerald-500/30 bg-emerald-950/10'
                                    : 'border-emerald-200 bg-emerald-50/30'
                                  : isDarkMode
                                    ? 'border-white/10'
                                    : 'border-slate-200'
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={cn(
                                    'size-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0',
                                    isCompleted
                                      ? 'bg-emerald-500 text-white'
                                      : isActive
                                        ? isDarkMode
                                          ? 'bg-indigo-600 text-white animate-pulse'
                                          : 'bg-blue-600 text-white animate-pulse'
                                        : isDarkMode
                                          ? 'bg-white/10 text-neutral-400'
                                          : 'bg-slate-100 text-slate-500'
                                  )}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                  ) : (
                                    index + 1
                                  )}
                                </span>
                                <span className="text-[13px] font-semibold leading-tight">
                                  {step.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {step.tool && step.tool !== 'auto' && (
                                  <span
                                    className={cn(
                                      'text-xs font-mono px-1.5 py-0.5 rounded border',
                                      isDarkMode
                                        ? 'border-white/10 bg-white/5 text-neutral-300'
                                        : 'border-slate-200 bg-slate-100 text-slate-600'
                                    )}
                                  >
                                    {step.tool}
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    'text-[11px] font-mono px-2 py-0.5 rounded font-semibold uppercase',
                                    isCompleted
                                      ? isDarkMode
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-emerald-100 text-emerald-700'
                                      : isActive
                                        ? isDarkMode
                                          ? 'bg-cyan-500/20 text-cyan-300 animate-pulse'
                                          : 'bg-blue-100 text-blue-700 animate-pulse'
                                        : isDarkMode
                                          ? 'bg-white/5 text-neutral-400'
                                          : 'bg-slate-100 text-slate-500'
                                  )}
                                >
                                  {step.status}
                                </span>
                              </div>
                            </div>

                            {step.detail && (
                              <p
                                className={cn(
                                  'text-xs mt-2 pl-8 leading-relaxed',
                                  isDarkMode ? 'text-neutral-400' : 'text-slate-600'
                                )}
                              >
                                {step.detail}
                              </p>
                            )}

                            {step.status === 'pending' && (
                              <div className="flex items-center justify-end mt-2 pt-1 border-t border-dashed border-white/10">
                                <button
                                  type="button"
                                  onClick={() => onSkipStep(selectedTask.id, step.id)}
                                  className={cn(
                                    'text-xs px-2.5 py-1 rounded cursor-pointer transition-colors font-medium',
                                    isDarkMode
                                      ? 'hover:bg-white/10 text-neutral-400 hover:text-white'
                                      : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                                  )}
                                >
                                  Skip Step →
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Connected Flow Line between nodes */}
                          {!isLast && (
                            <div className="flex flex-col items-center py-2 select-none">
                              <div
                                className={cn(
                                  'w-0.5 h-5 transition-colors',
                                  isCompleted
                                    ? 'bg-emerald-500'
                                    : isActive
                                      ? isDarkMode
                                        ? 'bg-indigo-500/80 animate-pulse'
                                        : 'bg-blue-500 animate-pulse'
                                      : isDarkMode
                                        ? 'bg-white/15'
                                        : 'bg-slate-300'
                                )}
                              />
                              <ArrowDown
                                className={cn(
                                  'w-3.5 h-3.5 -mt-1',
                                  isCompleted
                                    ? 'text-emerald-500'
                                    : isActive
                                      ? isDarkMode
                                        ? 'text-indigo-400 animate-pulse'
                                        : 'text-blue-500 animate-pulse'
                                      : isDarkMode
                                        ? 'text-white/20'
                                        : 'text-slate-300'
                                )}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Task History Timeline Rail */}
              <div
                className={cn(
                  'w-80 p-5 overflow-y-auto border-l space-y-4 shrink-0',
                  isDarkMode
                    ? 'border-white/10 bg-black/40'
                    : 'border-slate-100 bg-slate-50/50'
                )}
              >
                <div>
                  <h4 className="text-[13px] font-semibold">Audit Timeline</h4>
                  <p
                    className={cn(
                      'text-[12px] leading-relaxed mt-0.5',
                      isDarkMode ? 'text-neutral-400' : 'text-slate-400'
                    )}
                  >
                    Live agent execution history and step status.
                  </p>
                </div>

                <div
                  className={cn(
                    'relative pl-4 border-l-2 pt-1',
                    isDarkMode ? 'border-white/15' : 'border-slate-200'
                  )}
                >
                  <AnimatedList delay={100} className="space-y-4">
                    {selectedTask.history && selectedTask.history.length > 0 ? (
                      selectedTask.history.map((hist) => (
                        <AnimatedListItem key={hist.id}>
                          <div className="relative space-y-0.5">
                            <div
                              className={cn(
                                'absolute -left-[21px] top-1 size-2.5 rounded-full border-2',
                                isDarkMode ? 'border-[#0F131D]' : 'border-white',
                                hist.status === 'success'
                                  ? 'bg-emerald-400'
                                  : hist.status === 'failed'
                                    ? 'bg-rose-400'
                                    : hist.status === 'created'
                                      ? 'bg-blue-400'
                                      : 'bg-cyan-400'
                              )}
                            />
                            <p className="text-[12px] font-medium leading-snug">
                              {hist.action}
                            </p>
                            <span
                              className={cn(
                                'text-[11px] font-mono',
                                isDarkMode ? 'text-neutral-500' : 'text-slate-400'
                              )}
                            >
                              {hist.timeAgo}
                            </span>
                          </div>
                        </AnimatedListItem>
                      ))
                    ) : (
                      <p className={cn('text-xs', isDarkMode ? 'text-neutral-500' : 'text-slate-400')}>
                        No execution events recorded yet.
                      </p>
                    )}
                  </AnimatedList>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

