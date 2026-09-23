import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';

type ActionCallback = () => void;

export interface ShortcutConfig {
  combo: string;
  description: string;
  scope: 'Global' | 'Workspace';
}

interface KeyboardShortcutContextType {
  registerShortcut: (combo: string, action: ActionCallback, config?: Omit<ShortcutConfig, 'combo'>) => void;
  unregisterShortcut: (combo: string) => void;
  getShortcuts: () => ShortcutConfig[];
}

const KeyboardShortcutContext = createContext<KeyboardShortcutContextType | undefined>(undefined);

const normalizeKeyCombo = (e: KeyboardEvent): string => {
  const keys: string[] = [];
  if (e.ctrlKey) keys.push('ctrl');
  if (e.altKey) keys.push('alt');
  if (e.shiftKey) keys.push('shift');
  if (e.metaKey) keys.push('meta');
  
  const key = e.key.toLowerCase();
  // Don't add modifiers as main key
  if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
      if(key === 'bracketleft') keys.push('[');
      else if(key === 'bracketright') keys.push(']');
      else keys.push(key);
  }

  return keys.join('+');
};

export const KeyboardShortcutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const shortcutsRef = useRef<Map<string, { action: ActionCallback; config?: Omit<ShortcutConfig, 'combo'> }>>(new Map());

  const registerShortcut = useCallback((combo: string, action: ActionCallback, config?: Omit<ShortcutConfig, 'combo'>) => {
    shortcutsRef.current.set(combo.toLowerCase(), { action, config });
  }, []);

  const unregisterShortcut = useCallback((combo: string) => {
    shortcutsRef.current.delete(combo.toLowerCase());
  }, []);

  const getShortcuts = useCallback((): ShortcutConfig[] => {
    const list: ShortcutConfig[] = [];
    shortcutsRef.current.forEach((value, key) => {
      if (value.config) {
        list.push({ combo: key, ...value.config });
      } else {
        list.push({ combo: key, description: 'Unknown action', scope: 'Workspace' });
      }
    });
    return list;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Exceptions for specific global actions even when focused
        const combo = normalizeKeyCombo(e);
        if(!['ctrl+enter', 'escape'].includes(combo)){
           return;
        }
      }

      const combo = normalizeKeyCombo(e);
      const entry = shortcutsRef.current.get(combo);

      if (entry && entry.action) {
        e.preventDefault();
        entry.action();
      }
    };
    
    // Mouse buttons 4 and 5 support
    const handleMouseUp = (e: MouseEvent) => {
         if (e.button === 3) {
            // Mouse button 4 (Back)
            const entry = shortcutsRef.current.get('mouse4');
            if (entry && entry.action) {
                e.preventDefault();
                entry.action();
            }
         } else if (e.button === 4) {
            // Mouse button 5 (Forward)
            const entry = shortcutsRef.current.get('mouse5');
             if (entry && entry.action) {
                 e.preventDefault();
                 entry.action();
             }
         }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('mouseup', handleMouseUp, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('mouseup', handleMouseUp, { capture: true });
    };
  }, []);

  const value = {
    registerShortcut,
    unregisterShortcut,
    getShortcuts,
  };

  return (
    <KeyboardShortcutContext.Provider value={value}>
      {children}
    </KeyboardShortcutContext.Provider>
  );
};

export const useKeyboardShortcuts = () => {
  const context = useContext(KeyboardShortcutContext);
  if (context === undefined) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutProvider');
  }
  return context;
};
