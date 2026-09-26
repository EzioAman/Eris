import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  X,
  Code2,
  Music,
  Globe,
  Terminal,
  FolderTree,
  Smartphone,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { FileTreeTemplate } from '../../../ui_templates/FileTreeTemplate';
import { TerminalWindowTemplate } from '../../../ui_templates/TerminalWindowTemplate';
import { AndroidDeviceTemplate } from '../../../ui_templates/AndroidDeviceTemplate';
import { IosDeviceTemplate } from '../../../ui_templates/IosDeviceTemplate';
import { SafariBrowserTemplate } from '../../../ui_templates/SafariBrowserTemplate';
import { CodeComparisonTemplate } from '../../../ui_templates/CodeComparisonTemplate';
import { MediaPlaylistTemplate } from '../../../ui_templates/MediaPlaylistTemplate';
import { ChatThinkingUI } from '../../../ui_templates/ChatThinkingUI';
import { SubagentChainTemplate } from '../../../ui_templates/SubagentChainTemplate';
import { ReasoningTraceTemplate } from '../../../ui_templates/ReasoningTraceTemplate';

export interface TemplateRendererProps {
  type: string;
  data: any;
  isDarkMode: boolean;
  onSendMessage?: (msg: string) => void;
}

interface TemplateMeta {
  title: string;
  icon: React.ReactNode;
  badge?: string;
}

function getTemplateMeta(type: string, data: any): TemplateMeta {
  switch (type) {
    case 'code-comparison':
      return {
        title: data?.fileName ? `Diff: ${data.fileName}` : 'Code Comparison',
        icon: <Code2 className="w-3.5 h-3.5 text-cyan-400" />,
        badge: data?.language ? data.language.toUpperCase() : 'PYTHON',
      };
    case 'media-player':
      return {
        title: data?.tracks?.[0]?.title ? `Now Playing: ${data.tracks[0].title}` : 'ERIS Media Player',
        icon: <Music className="w-3.5 h-3.5 text-purple-400" />,
        badge: 'YOUTUBE',
      };
    case 'safari-preview':
      return {
        title: data?.title || 'Web Inspector',
        icon: <Globe className="w-3.5 h-3.5 text-blue-400" />,
        badge: 'BROWSER',
      };
    case 'terminal':
      return {
        title: data?.title || 'Win32 Sandbox Terminal',
        icon: <Terminal className="w-3.5 h-3.5 text-emerald-400" />,
        badge: 'POWERSHELL',
      };
    case 'file-tree':
      return {
        title: 'Project Workspace Tree',
        icon: <FolderTree className="w-3.5 h-3.5 text-amber-400" />,
        badge: 'EXPLORER',
      };
    case 'subagent-chain':
      return {
        title: 'Subagent Reasoning Swarm',
        icon: <Layers className="w-3.5 h-3.5 text-indigo-400" />,
        badge: 'MULTI-AGENT',
      };
    case 'android-preview':
      return {
        title: 'Android Preview',
        icon: <Smartphone className="w-3.5 h-3.5 text-emerald-400" />,
        badge: 'EMULATOR',
      };
    case 'ios-preview':
      return {
        title: 'iOS Dynamic Preview',
        icon: <Smartphone className="w-3.5 h-3.5 text-sky-400" />,
        badge: 'EMULATOR',
      };
    case 'reasoning-trace':
    case 'reasoning':
    case 'trace':
      return {
        title: 'Reasoning Trace',
        icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />,
        badge: 'STREAMING',
      };
    default:
      return {
        title: 'Workspace Component',
        icon: <Sparkles className="w-3.5 h-3.5 text-violet-400" />,
      };
  }
}

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  type,
  data,
  isDarkMode,
  onSendMessage,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (type === 'chat-thinking') {
    return (
      <div className="my-2 w-full">
        <ChatThinkingUI
          isActive={data?.isActive}
          elapsedSeconds={data?.elapsedSeconds}
          reasoning={data?.reasoning}
          searches={data?.searches}
          terminalSteps={data?.terminalSteps}
          comparisons={data?.comparisons}
          deviceSteps={data?.deviceSteps}
          browserSteps={data?.browserSteps}
          fullText={data?.fullText}
          sources={data?.sources}
          isDarkMode={isDarkMode}
          onSendMessage={onSendMessage}
          defaultExpanded={data?.defaultExpanded}
        />
      </div>
    );
  }

  const meta = getTemplateMeta(type, data);

  const renderComponent = (inModal: boolean = false) => {
    switch (type) {
      case 'file-tree':
        return (
          <div className={cn('overflow-auto p-2', inModal ? 'h-[75vh]' : 'max-w-md')}>
            <FileTreeTemplate data={data?.nodes || []} />
          </div>
        );
      case 'terminal':
        return (
          <div className={cn('w-full', inModal ? 'h-[75vh]' : 'max-w-3xl')}>
            <TerminalWindowTemplate
              commands={data?.commands}
              initialLines={data?.initialLines}
              title={data?.title || 'ERIS Win32 Subprocess Terminal'}
              allowInput={true}
            />
          </div>
        );
      case 'android-preview':
        return (
          <div className="flex justify-center p-3">
            <AndroidDeviceTemplate>
              {data?.src ? (
                <img src={data.src} alt="Android preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-white">
                  App UI
                </div>
              )}
            </AndroidDeviceTemplate>
          </div>
        );
      case 'ios-preview':
        return (
          <div className="flex justify-center p-3">
            <IosDeviceTemplate imageSrc={data?.src}>
              {data?.children ||
                (!data?.src && (
                  <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-white">
                    iOS App UI
                  </div>
                ))}
            </IosDeviceTemplate>
          </div>
        );
      case 'safari-preview':
        return (
          <div className={cn('flex justify-center w-full', inModal ? 'h-[78vh]' : 'max-w-4xl')}>
            <SafariBrowserTemplate
              url={data?.url || 'https://duckduckgo.com'}
              title={data?.title || 'Web Inspector'}
              readerContent={data?.readerContent}
              links={data?.links}
              onAskEris={onSendMessage}
            >
              {data?.src ? (
                <img src={data.src} alt="Web preview" className="w-full h-full object-cover" />
              ) : undefined}
            </SafariBrowserTemplate>
          </div>
        );
      case 'code-comparison':
        return (
          <div className={cn('w-full overflow-hidden', inModal ? 'h-[78vh]' : 'max-w-4xl')}>
            <CodeComparisonTemplate
              beforeCode={data?.before || '// Initial state'}
              afterCode={data?.after || '// Updated state'}
              fileName={data?.fileName || 'diff_view.py'}
              language={data?.language || 'python'}
            />
          </div>
        );
      case 'media-player':
        return (
          <div className="flex justify-center w-full max-w-xl mx-auto py-2">
            <MediaPlaylistTemplate playlist={data?.tracks || data?.playlist || []} />
          </div>
        );
      case 'subagent-chain':
        return (
          <div className={cn('w-full', inModal ? 'h-[78vh] overflow-y-auto' : 'max-w-4xl')}>
            <SubagentChainTemplate
              steps={data?.steps}
              defaultView={data?.defaultView || 'parallel'}
              isDarkMode={isDarkMode}
              onSelectAgent={(role) => onSendMessage?.(`/spawn ${role}`)}
            />
          </div>
        );
      case 'reasoning-trace':
      case 'reasoning':
      case 'trace':
        return (
          <div className="flex justify-center w-full max-w-xl mx-auto py-2">
            <ReasoningTraceTemplate
              reasoning={data?.reasoning || data?.reasoningParagraphs || data?.paragraphs}
              finalAnswer={data?.finalAnswer || data?.answer}
              isDarkMode={isDarkMode}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="my-3 w-full max-w-4xl mx-auto">
      {/* ─── In-line Card Container ─── */}
      <div
        className={cn(
          'rounded-2xl border transition-all shadow-md overflow-hidden',
          isDarkMode
            ? 'border-white/10 bg-[#0C101A]/85 backdrop-blur-xl'
            : 'border-slate-200/90 bg-white/95 backdrop-blur-xl'
        )}
      >
        {/* Template Header Controls Bar */}
        <div
          className={cn(
            'px-3.5 py-2 border-b flex items-center justify-between gap-3 text-xs select-none',
            isDarkMode
              ? 'border-white/10 bg-white/[0.03] text-neutral-300'
              : 'border-slate-200/80 bg-slate-50/80 text-slate-700'
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-black/10 dark:bg-white/10 shrink-0">
              {meta.icon}
            </span>
            <span className="font-semibold truncate text-[11px] sm:text-xs">
              {meta.title}
            </span>
            {meta.badge && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider',
                  isDarkMode
                    ? 'bg-white/10 text-neutral-300 border border-white/10'
                    : 'bg-slate-200/70 text-slate-700 border border-slate-300/60'
                )}
              >
                {meta.badge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Collapse / Expand In-line */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                'p-1.5 rounded-lg transition-colors cursor-pointer',
                isDarkMode ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
              )}
              title={isCollapsed ? 'Expand panel' : 'Minimize panel'}
            >
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>

            {/* Expand to Fullscreen Modal */}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className={cn(
                'p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px]',
                isDarkMode
                  ? 'hover:bg-white/10 text-neutral-400 hover:text-white'
                  : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
              )}
              title="Expand to Fullscreen View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card Body */}
        {!isCollapsed && (
          <div className="p-2 sm:p-3 overflow-x-auto flex justify-center">
            {renderComponent(false)}
          </div>
        )}

        {isCollapsed && (
          <div
            onClick={() => setIsCollapsed(false)}
            className={cn(
              'px-4 py-2 text-center text-xs cursor-pointer transition-colors font-medium',
              isDarkMode ? 'text-neutral-400 hover:text-neutral-200' : 'text-slate-500 hover:text-slate-800'
            )}
          >
            Component minimized. Click to expand preview.
          </div>
        )}
      </div>

      {/* ─── Fullscreen Modal Overlay (When Expanded) ─── */}
      <AnimatePresence>
        {isExpanded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md select-none font-sans">
            <div className="absolute inset-0" onClick={() => setIsExpanded(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={cn(
                'relative w-full max-w-6xl max-h-[92vh] rounded-3xl border flex flex-col overflow-hidden z-10 shadow-2xl',
                isDarkMode
                  ? 'bg-[#0B0F19]/95 border-violet-500/30 text-white backdrop-blur-2xl'
                  : 'bg-white/95 border-slate-300 text-slate-900 backdrop-blur-2xl'
              )}
            >
              {/* Modal Header */}
              <div
                className={cn(
                  'px-6 py-4 border-b flex items-center justify-between gap-4',
                  isDarkMode ? 'border-white/10 bg-black/40' : 'border-slate-200 bg-slate-50/90'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 rounded-xl bg-violet-500/10 text-violet-400">
                    {meta.icon}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base tracking-tight">
                      {meta.title}
                    </h3>
                    <p className={cn("text-[11px]", isDarkMode ? "text-neutral-400" : "text-slate-500")}>
                      Expanded Fullscreen Inspection View
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer',
                      isDarkMode
                        ? 'border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300'
                        : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                    )}
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Exit Fullscreen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className={cn(
                      'p-2 rounded-xl transition-colors cursor-pointer',
                      isDarkMode
                        ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                        : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                    )}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-6 flex-1 overflow-y-auto flex items-center justify-center">
                {renderComponent(true)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TemplateRenderer;
