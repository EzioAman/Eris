import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Command } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useKeyboardShortcuts } from '../../context/KeyboardShortcutManager';

export interface KeyboardShortcutsModalProps {
  isDarkMode: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isDarkMode,
  isOpen,
  onClose,
}) => {
  const { getShortcuts } = useKeyboardShortcuts();
  const shortcuts = getShortcuts();

  // Escape key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Group by scope
  const globalShortcuts = shortcuts.filter(s => s.scope === 'Global');
  const workspaceShortcuts = shortcuts.filter(s => s.scope === 'Workspace');

  const renderShortcutKey = (key: string) => {
    return (
      <span className={cn(
        'px-2 py-1 rounded-md text-[11px] font-mono font-medium',
        isDarkMode
          ? 'bg-white/10 text-neutral-300 border border-white/10'
          : 'bg-slate-100 text-slate-600 border border-slate-200'
      )}>
        {key.toUpperCase()}
      </span>
    );
  };

  const renderCombo = (combo: string) => {
    const parts = combo.split('+');
    return (
      <div className="flex items-center gap-1">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {renderShortcutKey(part)}
            {i < parts.length - 1 && <span className="text-neutral-500 text-xs">+</span>}
          </React.Fragment>
        ))}
      </div>
    );
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
              'relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border shadow-2xl flex flex-col',
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
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'size-8 rounded-lg flex items-center justify-center text-xs font-bold shadow-sm',
                    isDarkMode
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      : 'bg-blue-100 text-blue-600 border border-blue-200'
                  )}
                >
                  <Command className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Keyboard Shortcuts</h3>
                  <p
                    className={cn(
                      'text-xs mt-0.5',
                      isDarkMode ? 'text-neutral-400' : 'text-slate-500'
                    )}
                  >
                    View and manage your keyboard shortcuts.
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
              {globalShortcuts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3">Global Shortcuts</h4>
                  <div className="space-y-2">
                    {globalShortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-xl border transition-colors',
                          isDarkMode
                            ? 'border-white/10 bg-[#161B26]'
                            : 'border-slate-200 bg-slate-50'
                        )}
                      >
                        <span className="text-[13px] font-medium">{shortcut.description}</span>
                        {renderCombo(shortcut.combo)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {workspaceShortcuts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3">Workspace Shortcuts</h4>
                  <div className="space-y-2">
                    {workspaceShortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-xl border transition-colors',
                          isDarkMode
                            ? 'border-white/10 bg-[#161B26]'
                            : 'border-slate-200 bg-slate-50'
                        )}
                      >
                        <span className="text-[13px] font-medium">{shortcut.description}</span>
                        {renderCombo(shortcut.combo)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {shortcuts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Command className={cn('w-8 h-8 mb-4 opacity-20', isDarkMode ? 'text-white' : 'text-slate-900')} />
                  <p className={cn('text-sm', isDarkMode ? 'text-neutral-400' : 'text-slate-500')}>
                    No shortcuts currently registered.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className={cn(
                'p-4 border-t flex items-center justify-between shrink-0',
                isDarkMode ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
              )}
            >
              <p className={cn('text-[11px] font-medium', isDarkMode ? 'text-neutral-500' : 'text-slate-400')}>
                Custom shortcut binding coming in a future update.
              </p>
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer shadow-sm',
                  isDarkMode
                    ? 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                )}
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
