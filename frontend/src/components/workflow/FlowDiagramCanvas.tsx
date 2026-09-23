import React, { useState, useRef } from 'react';
import {
  Map as MapIcon,
  Scan,
  Minus,
  Plus,
  Maximize2,
  Minimize2,
  MoreVertical,
  CheckCircle2,
  Sparkles,
  GitFork,
  Flag,
  FileCode2,
  Globe,
  Scale,
  Cpu,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { WorkflowNode, WorkflowPipeline } from './workflowTypes';

export interface FlowDiagramCanvasProps {
  pipeline: WorkflowPipeline;
  selectedNodeId: string | null;
  onSelectNode: (node: WorkflowNode) => void;
  isDarkMode: boolean;
  className?: string;
}

const renderNodeIcon = (icon: string) => {
  switch (icon) {
    case 'git':
      return <img src="/icons/git.png" alt="Git" className="w-5 h-5 object-contain" />;
    case 'terminal':
    case 'cmd':
      return <img src="/icons/terminal.png" alt="Terminal" className="w-5 h-5 object-contain" />;
    case 'github':
      return <img src="/icons/github.png" alt="GitHub" className="w-5 h-5 object-contain" />;
    case 'gmail':
    case 'email':
      return <img src="/icons/gmail.png" alt="Gmail" className="w-5 h-5 object-contain" />;
    case 'notion':
      return <img src="/icons/notion.png" alt="Notion" className="w-5 h-5 object-contain" />;
    case 'minmax':
      return <Scale className="w-5 h-5 text-amber-500" />;
    case 'file':
      return <FileCode2 className="w-5 h-5 text-emerald-500" />;
    case 'web':
      return <Globe className="w-5 h-5 text-blue-500" />;
    case 'ai':
      return <Sparkles className="w-5 h-5 text-indigo-500" />;
    case 'condition':
      return <GitFork className="w-5 h-5 text-amber-500" />;
    case 'end':
      return <Flag className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    default:
      return <Cpu className="w-5 h-5 text-sky-500" />;
  }
};

export const FlowDiagramCanvas: React.FC<FlowDiagramCanvasProps> = ({
  pipeline,
  selectedNodeId,
  onSelectNode,
  isDarkMode,
  className,
}) => {
  const [zoom, setZoom] = useState(100);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));
  const handleFitView = () => setZoom(100);

  const toggleFullscreen = () => {
    if (!canvasContainerRef.current) return;
    if (!document.fullscreenElement) {
      canvasContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const renderNodeCard = (node: WorkflowNode | undefined, customBorderClass?: string) => {
    if (!node) return null;
    const isSelected = selectedNodeId === node.id;

    return (
      <div
        key={node.id}
        onClick={() => onSelectNode(node)}
        className={cn(
          'w-[240px] sm:w-[260px] rounded-2xl p-3.5 transition-all duration-200 cursor-pointer shadow-sm relative group select-none border',
          isDarkMode
            ? 'bg-[#111622] hover:bg-[#161c2c]'
            : 'bg-white hover:bg-slate-50/90',
          isSelected
            ? 'ring-2 ring-blue-500 border-blue-500 shadow-md shadow-blue-500/10'
            : customBorderClass || (isDarkMode ? 'border-white/[0.08]' : 'border-slate-200/90'),
          node.category === 'condition' && !isSelected && (
            isDarkMode ? 'bg-amber-500/[0.04] border-amber-500/30' : 'bg-amber-50/40 border-amber-200'
          )
        )}
      >
        {/* Top & Bottom anchor port dots */}
        <div
          className={cn(
            'absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 transition-colors',
            isDarkMode ? 'bg-[#090b10] border-neutral-400' : 'bg-white border-slate-400'
          )}
        />
        <div
          className={cn(
            'absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 transition-colors',
            isDarkMode ? 'bg-[#090b10] border-neutral-400' : 'bg-white border-slate-400'
          )}
        />

        <div className="flex items-center gap-3">
          {/* Icon badge */}
          <div
            className={cn(
              'size-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors',
              node.category === 'trigger' && (isDarkMode ? 'border-neutral-700 bg-neutral-800' : 'border-slate-200 bg-slate-100'),
              node.category === 'ai' && (isDarkMode ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'),
              node.category === 'condition' && (isDarkMode ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-200 bg-amber-50'),
              node.category === 'action' && (isDarkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'),
              node.category === 'end' && (isDarkMode ? 'border-purple-500/30 bg-purple-500/10' : 'border-purple-200 bg-purple-50')
            )}
          >
            {renderNodeIcon(node.icon)}
          </div>

          {/* Title & Subtitle */}
          <div className="min-w-0 flex-1">
            <h4
              className={cn(
                'text-sm font-semibold truncate leading-snug',
                isDarkMode ? 'text-white' : 'text-slate-900'
              )}
            >
              {node.name}
            </h4>
            <p
              className={cn(
                'text-xs truncate leading-normal mt-0.5',
                isDarkMode ? 'text-neutral-400' : 'text-slate-500'
              )}
            >
              {node.subtitle}
            </p>
          </div>

          {/* Right Status / Menu */}
          <div className="flex items-center gap-1 shrink-0">
            {node.status === 'completed' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node);
              }}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-500/10 transition-colors"
              title="Step actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={canvasContainerRef}
      className={cn(
        'relative flex-1 h-full overflow-auto font-sans select-none transition-colors flex flex-col items-center justify-start',
        isDarkMode
          ? 'bg-[#090b10] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]'
          : 'bg-[#f8fafc] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]',
        className
      )}
    >
      {/* Canvas Zoom Container */}
      <div
        className="relative py-12 px-6 min-w-[760px] flex flex-col items-center transition-transform duration-150 origin-top"
        style={{ transform: `scale(${zoom / 100})` }}
      >
        {/* Dynamic Card-Based Pipeline */}
        {pipeline.nodes.map((node, index) => {
          return (
            <React.Fragment key={node.id}>
              {/* The Pipeline Card */}
              <div className="flex justify-center z-10 relative group">
                {renderNodeCard(node)}
              </div>

              {/* Connecting Line with Insertion Point */}
              {index < pipeline.nodes.length - 1 && (
                <div className="w-full flex flex-col items-center my-1 relative">
                  <div
                    className={cn(
                      'w-0.5 h-10 transition-colors',
                      isDarkMode ? 'bg-neutral-700' : 'bg-slate-300'
                    )}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newNode: WorkflowNode = {
                        id: `step-${Date.now()}`,
                        name: 'New Pipeline Step',
                        subtitle: 'Custom task card',
                        icon: 'ai',
                        category: 'action',
                        status: 'completed',
                        config: { actionDetails: 'Custom action card execution' },
                      };
                      onSelectNode(newNode);
                    }}
                    title="Insert pipeline card here"
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 size-5 rounded-full border flex items-center justify-center text-xs transition-all shadow-xs cursor-pointer',
                      isDarkMode
                        ? 'bg-[#121622] border-white/20 text-neutral-400 hover:text-white hover:border-cyan-400 hover:scale-110'
                        : 'bg-white border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:scale-110'
                    )}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Append New Card Dropzone at End */}
        <div className="pt-2 flex flex-col items-center">
          <button
            type="button"
            onClick={() => {
              const newNode: WorkflowNode = {
                id: `step-${Date.now()}`,
                name: 'New Pipeline Step',
                subtitle: 'Automated task step',
                icon: 'ai',
                category: 'action',
                status: 'completed',
                config: { actionDetails: 'Custom action execution' },
              };
              onSelectNode(newNode);
            }}
            className={cn(
              'px-4 py-2 rounded-xl border border-dashed text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs',
              isDarkMode
                ? 'border-white/20 bg-white/[0.02] text-neutral-300 hover:bg-white/[0.06] hover:border-cyan-400/50'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-blue-400'
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Step Card</span>
          </button>
        </div>
      </div>

      {/* Floating Bottom Canvas Controls Bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl shadow-xl border backdrop-blur-md transition-colors bg-white/95 dark:bg-[#111622]/95 border-slate-200 dark:border-white/[0.12] text-slate-700 dark:text-neutral-200">
        {/* Toggle Minimap */}
        <button
          onClick={() => setShowMinimap(!showMinimap)}
          className={cn(
            'p-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-white/10 transition-colors',
            showMinimap && 'text-blue-500 bg-blue-50 dark:bg-blue-500/15'
          )}
          title="Toggle mini-map"
        >
          <MapIcon className="w-4 h-4" />
        </button>

        {/* Fit / Center View */}
        <button
          onClick={handleFitView}
          className="p-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          title="Fit to view (100%)"
        >
          <Scan className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1" />

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 50}
          className="p-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
          title="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Current Zoom */}
        <span className="text-xs font-semibold px-2 min-w-[46px] text-center">
          {zoom}%
        </span>

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 150}
          className="p-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
          title="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1" />

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg text-xs hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          title="Fullscreen toggle"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Floating Mini-Map in bottom right */}
      {showMinimap && (
        <div
          className={cn(
            'fixed bottom-6 right-8 z-30 w-36 h-28 rounded-xl p-2 shadow-lg border backdrop-blur-md hidden md:flex flex-col items-center justify-between select-none pointer-events-none transition-colors',
            isDarkMode
              ? 'bg-[#0f141f]/90 border-white/[0.12]'
              : 'bg-white/95 border-slate-200 shadow-slate-300/40'
          )}
        >
          <div className="w-full h-full relative flex flex-col items-center justify-between py-1">
            {/* Top Node Mini */}
            <div className="w-12 h-2.5 rounded bg-blue-500/50" />

            {/* Classify Mini */}
            <div className="w-12 h-2.5 rounded bg-indigo-500/50" />

            {/* Condition Mini */}
            <div className="w-12 h-2.5 rounded bg-amber-500/50" />

            {/* Two Branches Mini */}
            <div className="w-24 flex justify-between gap-1">
              <div className="flex flex-col gap-1 items-center">
                <div className="w-9 h-2 rounded bg-sky-500/50" />
                <div className="w-9 h-2 rounded bg-emerald-500/50" />
              </div>
              <div className="flex flex-col gap-1 items-center">
                <div className="w-9 h-2 rounded bg-slate-500/50" />
                <div className="w-9 h-2 rounded bg-rose-500/50" />
              </div>
            </div>

            {/* End Node Mini */}
            <div className="w-12 h-2.5 rounded bg-purple-500/50" />

            {/* Viewport Box indicator */}
            <div className="absolute inset-0 border border-blue-500/60 rounded pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
};
