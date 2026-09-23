import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ScreenName = 'intro' | 'onboarding' | 'profile_setup' | 'model_keys_setup' | 'greeting' | 'initialization' | 'workspace' | 'workflow';

export interface AppState {
  screen: ScreenName;
  meta?: Record<string, any>;
}

export interface AppStateContextType {
  current: AppState;
  canGoBack: boolean;
  canGoForward: boolean;
  navigate: (
    screen: ScreenName,
    opts?: {
      meta?: Record<string, any>;
      clearHistory?: boolean;
      replace?: boolean;
    }
  ) => void;
  goBack: () => void;
  goForward: () => void;
  getBackDestination: () => ScreenName | null;
  reload: () => void;
  reloadKey: number;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [backStack, setBackStack] = useState<AppState[]>([]);
  const [forwardStack, setForwardStack] = useState<AppState[]>([]);
  const [current, setCurrent] = useState<AppState>(() => {
    // ERIS always launches on intro screen to perform initial preflight checks
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('eris_active_screen');
      }
    } catch {
      // ignore
    }
    return { screen: 'intro' };
  });
  const [reloadKey, setReloadKey] = useState(0);

  const navigate = useCallback(
    (
      screen: ScreenName,
      opts?: {
        meta?: Record<string, any>;
        clearHistory?: boolean;
        replace?: boolean;
      }
    ) => {
      const newState: AppState = { screen, meta: opts?.meta };

      if (opts?.clearHistory) {
        setBackStack([]);
        setForwardStack([]);
      } else if (!opts?.replace) {
        setBackStack((prev) => [...prev, current].slice(-50)); // Max history depth: 50
        setForwardStack([]); // Navigating clears the forward stack
      }

      setCurrent(newState);
    },
    [current]
  );

  const getBackDestination = useCallback(() => {
    if (backStack.length === 0) return null;
    return backStack[backStack.length - 1].screen;
  }, [backStack]);

  const goBack = useCallback(() => {
    if (backStack.length === 0) return;
    
    const prev = backStack[backStack.length - 1];
    setForwardStack((prevStack) => [current, ...prevStack]);
    setBackStack((prevStack) => prevStack.slice(0, -1));
    setCurrent(prev);
  }, [backStack, current]);

  const goForward = useCallback(() => {
    if (forwardStack.length === 0) return;

    setBackStack((prev) => [...prev, current]);
    const next = forwardStack[0];
    setForwardStack((prevStack) => prevStack.slice(1));
    setCurrent(next);
  }, [forwardStack, current]);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  // Global mouse button 4 (Back) and button 5 (Forward) navigation listener
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // 3 = Browser Back (MB4), 4 = Browser Forward (MB5)
      if (e.button === 3) {
        e.preventDefault();
        e.stopPropagation();
        goBack();
      } else if (e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
        goForward();
      }
    };

    // Also listen for Electron app-command forwarded events
    const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : undefined;
    const cleanupElectron = electronAPI?.onMouseNavigate?.((direction: string) => {
      if (direction === 'back') {
        goBack();
      } else if (direction === 'forward') {
        goForward();
      }
    });

    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      cleanupElectron?.();
    };
  }, [goBack, goForward]);

  const canGoBackComputed = backStack.length > 0;

  const value: AppStateContextType = {
    current,
    canGoBack: canGoBackComputed,
    canGoForward: forwardStack.length > 0,
    navigate,
    goBack,
    goForward,
    getBackDestination,
    reload,
    reloadKey,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
