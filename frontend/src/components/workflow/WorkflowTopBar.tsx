import React, { useState } from 'react';
import {
  FileCode,
  Pencil,
  Share2,
  Save,
  Play,
  ChevronRight,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { WorkflowPipeline } from './workflowTypes';

export interface WorkflowTopBarProps {
  pipeline: WorkflowPipeline;
  isDarkMode: boolean;
  activeTab: 'canvas' | 'runs' | 'logs' | 'versions' | 'settings';
  onTabChange: (tab: 'canvas' | 'runs' | 'logs' | 'versions' | 'settings') => void;
  onUpdateTitle: (newTitle: string) => void;
  onRunWorkflow: () => void;
  onSaveWorkflow: () => void;
  onReturnToWorkspace?: () => void;
  isRunning?: boolean;
}

export const WorkflowTopBar: React.FC<WorkflowTopBarProps> = ({
  pipeline,
  isDarkMode,
  activeTab,
  onTabChange,
  onUpdateTitle,
  onRunWorkflow,
  onSaveWorkflow,
  onReturnToWorkspace,
  isRunning = false,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(pipeline.title);

  const handleFinishEditing = () => {
    if (titleInput.trim()) {
      onUpdateTitle(titleInput.trim());
    } else {
      setTitleInput(pipeline.title);
    }
    setIsEditingTitle(false);
  };

  const tabs: Array<{ id: 'canvas' | 'runs' | 'logs' | 'versions' | 'settings'; label: string }> = [
    { id: 'canvas', label: 'Canvas' },
    { id: 'runs', label: 'Runs' },
    { id: 'logs', label: 'Logs' },
    { id: 'versions', label: 'Versions' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header
      className={cn(
        'shrink-0 border-b flex flex-col font-sans transition-colors z-20',
        isDarkMode
          ? 'border-white/[0.08] bg-[#0C0F17]/95 backdrop-blur-xl'
          : 'border-slate-200 bg-white'
      )}
    >
      {/* Top action row */}
      <div className="px-5 pt-3.5 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Back Button, Breadcrumbs, Title, Subtitle */}
        <div className="flex items-start gap-3 min-w-0">
          {onReturnToWorkspace && (
            <button
              type="button"
              onClick={onReturnToWorkspace}
              title="Back to Agent Workspace"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 mt-0.5 shadow-2xs',
                isDarkMode
                  ? 'border-white/10 bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white'
                  : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
              )}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Chat</span>
            </button>
          )}

          <div
            className={cn(
              'size-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5',
              isDarkMode
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-emerald-200 bg-emerald-50 text-emerald-600'
            )}
          >
            <FileCode className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-0.5">
              <span>Workflows</span>
              <ChevronRight className="w-3 h-3 opacity-60" />
              <span className={isDarkMode ? 'text-neutral-300' : 'text-slate-600'}>
                {pipeline.title}
              </span>
            </div>

            {/* Title & Status */}
            <div className="flex items-center gap-2.5">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={titleInput}
                  autoFocus
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleFinishEditing}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishEditing();
                    if (e.key === 'Escape') {
                      setTitleInput(pipeline.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  className={cn(
                    'text-base sm:text-lg font-bold bg-transparent border-b outline-none px-1 py-0.5',
                    isDarkMode ? 'border-amber-400 text-white' : 'border-blue-600 text-slate-900'
                  )}
                />
              ) : (
                <div className="flex items-center gap-2 group">
                  <h1 className={cn('text-base sm:text-lg font-bold tracking-tight truncate', isDarkMode ? 'text-white' : 'text-slate-900')}>
                    {pipeline.title}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    title="Rename workflow"
                    className="opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Status Pill */}
              <div
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0',
                  pipeline.status === 'active'
                    ? isDarkMode
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : isDarkMode
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                    : 'border-amber-200 bg-amber-50 text-amber-700'
                )}
              >
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="capitalize">{pipeline.status}</span>
              </div>
            </div>

            <p className={cn('text-xs mt-0.5 truncate max-w-xl', isDarkMode ? 'text-neutral-400' : 'text-slate-500')}>
              {pipeline.description}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center sm:self-center gap-2 sm:gap-2.5 shrink-0">
          <div className="hidden md:flex items-center gap-1 text-xs text-neutral-400 mr-1">
            <Clock className="w-3 h-3 opacity-60" />
            <span>Last saved {pipeline.lastSaved}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className={cn(
              'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
              isDarkMode
                ? 'border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10 hover:text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            )}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          <button
            type="button"
            onClick={onSaveWorkflow}
            className={cn(
              'cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors',
              isDarkMode
                ? 'border-white/10 bg-white/5 text-neutral-200 hover:bg-white/10 hover:text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            )}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            type="button"
            onClick={onRunWorkflow}
            disabled={isRunning}
            className={cn(
              'cursor-pointer inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all text-white',
              isRunning
                ? 'bg-blue-400 cursor-not-allowed opacity-80'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-500/20'
            )}
          >
            <Play className={cn('w-3.5 h-3.5 fill-current', isRunning && 'animate-spin')} />
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Canvas, Runs, Logs, Versions, Settings) */}
      <div className="px-5 flex items-center gap-6 overflow-x-auto no-scrollbar border-t border-white/[0.04]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'cursor-pointer py-2.5 text-xs font-semibold transition-all relative',
                isActive
                  ? isDarkMode
                    ? 'text-white'
                    : 'text-blue-600'
                  : isDarkMode
                  ? 'text-neutral-400 hover:text-neutral-200'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span
                  className={cn(
                    'absolute bottom-0 left-0 right-0 h-0.5 rounded-full',
                    isDarkMode ? 'bg-amber-400' : 'bg-blue-600'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};

export default WorkflowTopBar;
