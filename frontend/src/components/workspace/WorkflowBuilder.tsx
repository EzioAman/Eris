import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Settings2, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Workflow, WorkflowStep } from './chatTypes';

export interface WorkflowBuilderProps {
  isDarkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSave: (workflow: Workflow) => void;
  onRun: (workflow: Workflow) => void;
  initialWorkflow?: Workflow | null;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  isDarkMode,
  isOpen,
  onClose,
  onSave,
  onRun,
  initialWorkflow,
}) => {
  const [name, setName] = useState(initialWorkflow?.name || '');
  const [goal, setGoal] = useState(initialWorkflow?.goal || '');
  const [steps, setSteps] = useState<WorkflowStep[]>(
    initialWorkflow?.steps && initialWorkflow.steps.length > 0
      ? initialWorkflow.steps
      : [
          {
            id: crypto.randomUUID(),
            name: '',
            instructions: '',
            tool: 'auto',
            status: 'pending',
          },
        ]
  );
  const [executionMode, setExecutionMode] = useState<'speed' | 'accuracy'>(
    initialWorkflow?.executionMode || 'accuracy'
  );
  const [autoApprove, setAutoApprove] = useState(
    initialWorkflow?.autoApprove ?? false
  );

  // Sync state whenever the modal opens or initialWorkflow changes
  useEffect(() => {
    if (!isOpen) return;
    if (initialWorkflow) {
      setName(initialWorkflow.name || '');
      setGoal(initialWorkflow.goal || '');
      setSteps(
        initialWorkflow.steps && initialWorkflow.steps.length > 0
          ? initialWorkflow.steps.map(s => ({ ...s }))
          : [
              {
                id: crypto.randomUUID(),
                name: '',
                instructions: '',
                tool: 'auto',
                status: 'pending',
              },
            ]
      );
      setExecutionMode(initialWorkflow.executionMode || 'accuracy');
      setAutoApprove(initialWorkflow.autoApprove ?? false);
    } else {
      setName('');
      setGoal('');
      setSteps([
        {
          id: crypto.randomUUID(),
          name: '',
          instructions: '',
          tool: 'auto',
          status: 'pending',
        },
      ]);
      setExecutionMode('accuracy');
      setAutoApprove(false);
    }
  }, [isOpen, initialWorkflow]);

  // Escape key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        id: crypto.randomUUID(),
        name: `Step ${steps.length + 1}`,
        instructions: '',
        tool: 'auto',
        status: 'pending',
      },
    ]);
  };

  const handleRemoveStep = (id: string) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((s) => s.id !== id));
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    const newSteps = [...steps];
    const [removed] = newSteps.splice(index, 1);
    newSteps.splice(targetIndex, 0, removed);
    setSteps(newSteps);
  };

  const handleUpdateStep = (id: string, updates: Partial<WorkflowStep>) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleSaveOrRun = (action: 'save' | 'run') => {
    const sanitizedSteps: WorkflowStep[] = steps.map((s, idx) => ({
      ...s,
      name: s.name.trim() || `Step ${idx + 1}`,
      instructions: s.instructions.trim(),
    }));

    const workflow: Workflow = {
      id: initialWorkflow?.id || crypto.randomUUID(),
      name: name.trim() || 'Untitled Workflow',
      goal: goal.trim(),
      steps: sanitizedSteps,
      executionMode,
      autoApprove,
      status: 'draft',
      createdBy: initialWorkflow?.createdBy || 'user',
      createdAt: initialWorkflow?.createdAt || new Date().toISOString(),
    };

    if (action === 'save') onSave(workflow);
    else onRun(workflow);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md font-sans"
          onClick={onClose}
        >
          <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border shadow-2xl flex flex-col font-sans',
            isDarkMode
              ? 'border-white/15 bg-[#0F131D] text-white'
              : 'border-slate-200 bg-white text-slate-900'
          )}
        >
          {/* Header */}
          <div
            className={cn(
              'p-5 border-b flex items-center justify-between shrink-0',
              isDarkMode ? 'border-white/10' : 'border-slate-100'
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'size-8 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm',
                  isDarkMode
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-blue-100 text-blue-600 border border-blue-200'
                )}
              >
                ❖
              </div>
              <div>
                <h3 className="text-base font-semibold">
                  {initialWorkflow ? 'Edit Workflow' : 'Create Workflow'}
                </h3>
                <p
                  className={cn(
                    'text-xs mt-0.5',
                    isDarkMode ? 'text-neutral-400' : 'text-slate-500'
                  )}
                >
                  Define a multi-step workflow for ERIS to execute.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'p-2 rounded-lg transition-colors cursor-pointer',
                isDarkMode
                  ? 'hover:bg-white/10 text-neutral-400 hover:text-white'
                  : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Workflow Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Scan workspace files"
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors',
                    isDarkMode
                      ? 'bg-black/40 border-white/10 focus:border-indigo-500/50 text-white placeholder:text-neutral-600'
                      : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900 placeholder:text-slate-400'
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Goal Description
                </label>
                <textarea
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="What should this workflow achieve?"
                  rows={2}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg border text-sm outline-none transition-colors resize-none',
                    isDarkMode
                      ? 'bg-black/40 border-white/10 focus:border-indigo-500/50 text-white placeholder:text-neutral-600'
                      : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900 placeholder:text-slate-400'
                  )}
                />
              </div>
            </div>

            {/* Steps Builder */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold">Workflow Steps</h4>
                <span className={cn('text-xs font-mono', isDarkMode ? 'text-neutral-500' : 'text-slate-400')}>
                  {steps.length} steps defined
                </span>
              </div>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={cn(
                      'p-4 rounded-xl border flex gap-4 transition-colors',
                      isDarkMode
                        ? 'border-white/10 bg-[#161B26]'
                        : 'border-slate-200 bg-white shadow-sm'
                    )}
                  >
                    <div className="flex flex-col items-center gap-1 pt-1 select-none">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => handleMoveStep(index, 'up')}
                        title="Move step up"
                        className={cn(
                          'p-1 rounded transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed',
                          isDarkMode ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                        )}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <span className={cn('text-xs font-mono font-bold px-1.5 py-0.5 rounded', isDarkMode ? 'bg-white/5 text-indigo-300' : 'bg-slate-100 text-blue-600')}>
                        #{index + 1}
                      </span>
                      <button
                        type="button"
                        disabled={index === steps.length - 1}
                        onClick={() => handleMoveStep(index, 'down')}
                        title="Move step down"
                        className={cn(
                          'p-1 rounded transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed',
                          isDarkMode ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                        )}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold mb-1 opacity-70">Step Name</label>
                          <input
                            type="text"
                            value={step.name}
                            onChange={(e) => handleUpdateStep(step.id, { name: e.target.value })}
                            placeholder={`e.g., Step ${index + 1}`}
                            className={cn(
                              'w-full px-3 py-1.5 rounded-md border text-sm outline-none transition-colors',
                              isDarkMode
                                ? 'bg-black/40 border-white/10 focus:border-indigo-500/50 text-white placeholder:text-neutral-600'
                                : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900 placeholder:text-slate-400'
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-semibold mb-1 opacity-70">Tool</label>
                            <select
                              value={step.tool}
                              onChange={(e) => handleUpdateStep(step.id, { tool: e.target.value as any })}
                              className={cn(
                                'w-full px-2 py-1.5 rounded-md border text-xs outline-none transition-colors appearance-none cursor-pointer',
                                isDarkMode
                                  ? 'bg-black/40 border-white/10 text-white'
                                  : 'bg-slate-50 border-slate-200 text-slate-900'
                              )}
                            >
                              <option value="auto">Let ERIS decide</option>
                              <option value="READ_FILE">READ_FILE (Read file)</option>
                              <option value="WRITE_FILE">WRITE_FILE (Write/edit)</option>
                              <option value="LIST_DIR">LIST_DIR (List files)</option>
                              <option value="RUN_COMMAND">RUN_COMMAND (Terminal)</option>
                              <option value="CALL_TOOL">CALL_TOOL (Custom)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1 opacity-70">MCP Server</label>
                            <select
                              value={step.mcpServer || 'none'}
                              onChange={(e) => handleUpdateStep(step.id, { mcpServer: e.target.value === 'none' ? undefined : e.target.value })}
                              className={cn(
                                'w-full px-2 py-1.5 rounded-md border text-xs outline-none transition-colors appearance-none cursor-pointer',
                                isDarkMode
                                  ? 'bg-black/40 border-white/10 text-white'
                                  : 'bg-slate-50 border-slate-200 text-slate-900'
                              )}
                            >
                              <option value="none">None (Local)</option>
                              <option value="github">github-mcp</option>
                              <option value="postgres">postgres-mcp</option>
                              <option value="filesystem">filesystem-mcp</option>
                              <option value="brave-search">brave-search</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1 opacity-70">Instructions for ERIS</label>
                        <textarea
                          value={step.instructions}
                          onChange={(e) => handleUpdateStep(step.id, { instructions: e.target.value })}
                          placeholder="What exactly should ERIS do in this step?"
                          rows={2}
                          className={cn(
                            'w-full px-3 py-2 rounded-md border text-sm outline-none transition-colors resize-y',
                            isDarkMode
                              ? 'bg-black/40 border-white/10 focus:border-indigo-500/50 text-white placeholder:text-neutral-600'
                              : 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900 placeholder:text-slate-400'
                          )}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveStep(step.id)}
                      disabled={steps.length === 1}
                      className={cn(
                        'p-2 rounded-lg h-fit transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
                        isDarkMode
                          ? 'text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10'
                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddStep}
                  className={cn(
                    'w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-semibold transition-colors cursor-pointer',
                    isDarkMode
                      ? 'border-white/10 text-neutral-400 hover:text-neutral-200 hover:border-white/20 hover:bg-white/5'
                      : 'border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <Plus className="w-4 h-4" />
                  Add Step
                </button>
              </div>
            </div>

            {/* Advanced Settings */}
            <div
              className={cn(
                'p-5 rounded-xl border space-y-4',
                isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className={cn('w-4 h-4', isDarkMode ? 'text-indigo-300' : 'text-blue-500')} />
                <h4 className="text-sm font-semibold">Execution Rules</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold mb-2 opacity-80">Execution Mode</label>
                  <div className="flex gap-2 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={executionMode === 'accuracy'}
                        onChange={() => setExecutionMode('accuracy')}
                        className="accent-blue-500"
                      />
                      <span>Accuracy (Careful)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer ml-4">
                      <input
                        type="radio"
                        checked={executionMode === 'speed'}
                        onChange={() => setExecutionMode('speed')}
                        className="accent-indigo-500"
                      />
                      <span>Speed (Fast)</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2 opacity-80">Auto-Approve Tool Calls</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={autoApprove}
                      onChange={(e) => setAutoApprove(e.target.checked)}
                      className={cn('w-4 h-4 rounded', isDarkMode ? 'accent-indigo-500' : 'accent-blue-500')}
                    />
                    <span>Skip manual approval prompts</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div
            className={cn(
              'p-4 border-t flex items-center justify-end gap-3 shrink-0',
              isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
            )}
          >
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer border',
                isDarkMode
                  ? 'border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSaveOrRun('save')}
              disabled={!name.trim() || steps.length === 0}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed',
                isDarkMode
                  ? 'border-white/10 bg-white/10 text-white hover:bg-white/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              )}
            >
              {initialWorkflow ? 'Update Workflow' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={() => handleSaveOrRun('run')}
              disabled={!name.trim() || steps.length === 0}
              className={cn(
                'px-5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
                isDarkMode
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              )}
            >
              {initialWorkflow ? 'Save & Run' : 'Run Workflow'}
            </button>
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
