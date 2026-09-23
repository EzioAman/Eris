import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    __ERIS_DEV_MODE__?: boolean;
  }
}

interface DevModeContextType {
  isDevMode: boolean;
  setDevMode: (val: boolean) => void;
}

const DevModeContext = createContext<DevModeContextType>({
  isDevMode: false,
  setDevMode: () => {},
});

const STORAGE_KEY = 'eris_dev_mode';

export const DEV_PASSPHRASES = [
  'aman says ben 10 is scared of peacocks',
  'aman says ben 10 is scared of peacock',
];

export const isDevIdentityConfirmed = (bio?: string | null, isDevModeActive?: boolean): boolean => {
  // Condition 1: Dev Mode MUST be active (.env detected / dev mode enabled)
  const isDevActive =
    isDevModeActive ??
    (typeof window !== 'undefined'
      ? Boolean(window.__ERIS_DEV_MODE__ || localStorage.getItem(STORAGE_KEY) === 'true')
      : false);

  if (!isDevActive) {
    return false;
  }

  // Condition 2: Profile settings bio of THIS specific account MUST contain the creator passphrase
  const effectiveBio = bio ?? getStoredBio();
  if (!effectiveBio || typeof effectiveBio !== 'string') return false;
  const lower = effectiveBio.toLowerCase();
  return DEV_PASSPHRASES.some((phrase) => lower.includes(phrase));
};

export const getStoredBio = (accountScope?: string): string => {
  try {
    const scope = accountScope ? accountScope.toLowerCase().trim() : '';
    if (scope) {
      const scopedBio = localStorage.getItem(`eris_user_bio_${scope}`);
      if (scopedBio) return scopedBio;
      const scopedProf = localStorage.getItem(`eris_profile_${scope}`);
      if (scopedProf) {
        try {
          const p = JSON.parse(scopedProf);
          if (p?.bio) return p.bio;
        } catch { }
      }
    }

    const directBio = localStorage.getItem('eris_user_bio');
    if (directBio) return directBio;

    const raw = localStorage.getItem('eris_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      const b = parsed?.profile?.bio || parsed?.preferences?.bio || parsed?.bio;
      if (b) return b;
    }

    const rawConfig = localStorage.getItem('eris_session_config');
    if (rawConfig) {
      const parsed = JSON.parse(rawConfig);
      const b = parsed?.profile?.bio || parsed?.preferences?.bio || parsed?.bio;
      if (b) return b;
    }
    return '';
  } catch {
    return '';
  }
};

export const DevModeProvider: React.FC<{ children: React.ReactNode; userBio?: string | null }> = ({
  children,
  userBio,
}) => {
  const [isDevMode, setIsDevModeState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') {
        if (typeof window !== 'undefined') window.__ERIS_DEV_MODE__ = true;
        return true;
      }
      const bio = userBio ?? getStoredBio();
      const confirmed = isDevIdentityConfirmed(bio);
      if (typeof window !== 'undefined') {
        window.__ERIS_DEV_MODE__ = confirmed;
      }
      return confirmed;
    } catch {
      return false;
    }
  });

  const setDevMode = useCallback(
    (val: boolean) => {
      try {
        localStorage.setItem(STORAGE_KEY, String(val));
        if (typeof window !== 'undefined') {
          window.__ERIS_DEV_MODE__ = val;
          window.dispatchEvent(
            new CustomEvent('eris_dev_mode_change', { detail: { isDevMode: val } })
          );
        }
      } catch {
        // ignore
      }
      setIsDevModeState(val);
    },
    []
  );

  // Listen for storage events (multi-tab or manual console edit) and custom event
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const nextVal = e.newValue === 'true';
        setIsDevModeState(nextVal);
        if (typeof window !== 'undefined') window.__ERIS_DEV_MODE__ = nextVal;
      }
    };

    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.isDevMode === 'boolean') {
        setIsDevModeState(detail.isDevMode);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('eris_dev_mode_change', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('eris_dev_mode_change', handleCustom);
    };
  }, []);

  return (
    <DevModeContext.Provider value={{ isDevMode, setDevMode }}>
      {children}
    </DevModeContext.Provider>
  );
};

export const useDevMode = (): DevModeContextType => useContext(DevModeContext);

export default DevModeContext;
