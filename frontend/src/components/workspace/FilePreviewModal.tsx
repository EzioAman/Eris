import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Copy, Check, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CodeSnippetTemplate } from '../../../ui_templates/CodeSnippetTemplate';
import { SkeletonTemplate } from '../../../ui_templates/SkeletonTemplate';

export interface FilePreviewModalProps {
  isOpen: boolean;
  filePath: string | null;
  fileName?: string;
  isDarkMode: boolean;
  onClose: () => void;
  onAskChatAboutFile?: (prompt: string) => void;
}

interface FileData {
  ok: boolean;
  path: string;
  size: number;
  lines: number;
  content: string;
}

const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'py':
      return 'python';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'sh':
    case 'bash':
    case 'ps1':
      return 'bash';
    case 'toml':
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return 'text';
  }
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  filePath,
  fileName,
  isDarkMode,
  onClose,
  onAskChatAboutFile,
}) => {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);

  // Escape key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Fetch file content when opened
  useEffect(() => {
    if (!isOpen || !filePath) {
      setFileData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const fetchFile = async () => {
      try {
        const res = await fetch(`/api/workspace/file?path=${encodeURIComponent(filePath)}`);
        if (!res.ok) {
          throw new Error(`Failed to load file (${res.status} ${res.statusText})`);
        }
        const data = await res.json();
        if (isMounted) {
          if (data.ok) {
            setFileData(data);
          } else {
            setError(data.error || 'Failed to read file content');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Could not load file');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchFile();

    return () => {
      isMounted = false;
    };
  }, [isOpen, filePath]);

  const handleCopyPath = useCallback(async () => {
    if (!filePath) return;
    try {
      await navigator.clipboard.writeText(filePath);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    } catch {
      // fallback
    }
  }, [filePath]);

  const handleAskAboutFile = useCallback(() => {
    if (!filePath) return;
    const prompt = `Review and analyze this workspace file: \`${filePath}\``;
    onAskChatAboutFile?.(prompt);
    onClose();
  }, [filePath, onAskChatAboutFile, onClose]);

  const displayName = fileName || filePath?.split(/[/\\]/).pop() || 'File Preview';
  const language = filePath ? getLanguageFromPath(filePath) : 'text';

  return (
    <AnimatePresence>
      {isOpen && filePath && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md font-sans"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'w-full max-w-4xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden',
              isDarkMode
                ? 'bg-[#0E121B] border-white/10 text-neutral-100'
                : 'bg-white border-slate-200 text-slate-900'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className={cn(
                'px-5 py-3.5 border-b flex items-center justify-between shrink-0',
                isDarkMode ? 'border-white/[0.08] bg-[#0A0D14]' : 'border-slate-200 bg-slate-50'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'size-8 rounded-lg flex items-center justify-center shrink-0 border',
                    isDarkMode
                      ? 'border-white/10 bg-white/5 text-amber-400'
                      : 'border-slate-200 bg-white text-blue-600'
                  )}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold truncate">{displayName}</h3>
                    {fileData && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded border border-white/10 bg-white/5 text-neutral-400">
                        {fileData.lines} lines • {(fileData.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-neutral-400 truncate">{filePath}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPath}
                  title="Copy relative path"
                  className={cn(
                    'cursor-pointer flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                    isDarkMode
                      ? 'border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  {copiedPath ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Path</span>
                    </>
                  )}
                </button>

                {onAskChatAboutFile && (
                  <button
                    type="button"
                    onClick={handleAskAboutFile}
                    title="Send file prompt to ERIS chat"
                    className={cn(
                      'cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors',
                      isDarkMode
                        ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask ERIS</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'cursor-pointer p-1.5 rounded-lg transition-colors',
                    isDarkMode ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-800'
                  )}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading && (
                <div className="space-y-2 p-2">
                  <SkeletonTemplate className="h-5 w-48 rounded bg-white/10" />
                  <SkeletonTemplate className="h-4 w-full rounded bg-white/5" />
                  <SkeletonTemplate className="h-4 w-5/6 rounded bg-white/5" />
                  <SkeletonTemplate className="h-4 w-4/6 rounded bg-white/5" />
                  <SkeletonTemplate className="h-4 w-3/4 rounded bg-white/5" />
                </div>
              )}

              {!isLoading && error && (
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300 text-xs">
                  <p className="font-semibold mb-1">Could not preview file</p>
                  <p className="opacity-80">{error}</p>
                </div>
              )}

              {!isLoading && !error && fileData && (
                <div className="space-y-2">
                  <CodeSnippetTemplate
                    code={fileData.content || '// Empty file'}
                    language={language}
                    showLineNumbers={true}
                    isDarkMode={isDarkMode}
                    className="max-h-[60vh] overflow-y-auto"
                  />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FilePreviewModal;
