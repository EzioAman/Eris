import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface SocialConnectionsProps {
  onSuccess?: (session: any) => void;
  onError?: (err: string) => void;
}

export function SocialConnections({ onSuccess, onError }: SocialConnectionsProps) {
  const [devNotice, setDevNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Helper to synchronize authenticated user into ERIS local database (memory/auth.db)
  const syncSessionToLocal = async (user: any) => {
    const oauthPayload = {
      provider: 'google',
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      oauth_id: user.id,
    };

    let response: Response;
    try {
      response = await fetch('/api/auth/oauth/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oauthPayload),
      });
    } catch {
      response = await fetch('http://127.0.0.1:5174/api/auth/oauth/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oauthPayload),
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || 'OAuth registration failed on local service.');
    }

    const authData = await response.json();
    const session = authData.session;

    if (session?.token) {
      const resolvedDisplayName =
        session.user_display_name || session.displayName || oauthPayload.name;
      const resolvedUsername = session.username || session.email?.split('@')[0];
      const resolvedAvatar = session.avatar_url || session.avatarUrl || oauthPayload.avatar_url;

      localStorage.setItem(
        'eris_session',
        JSON.stringify({
          email: session.email,
          token: session.token,
          user_id: session.user_id,
          role: session.role || 'owner',
          username: resolvedUsername,
          user_display_name: resolvedDisplayName,
          avatar_url: resolvedAvatar,
        })
      );
      localStorage.setItem('eris_token', session.token);
      if (resolvedUsername) {
        localStorage.setItem('eris_username', resolvedUsername);
      }
      if (resolvedDisplayName) {
        localStorage.setItem('eris_user_display_name', resolvedDisplayName);
      }
      if (resolvedAvatar) {
        localStorage.setItem('eris_user_avatar', resolvedAvatar);
      }
    }

    if (onSuccess) {
      onSuccess(session);
    }
  };

  // 1. Listen for Supabase browser session changes (Web mode)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) {
        try {
          setIsLoading(true);
          await syncSessionToLocal(session.user);
        } catch (err: any) {
          const msg = err?.message || 'Authentication error syncing user session.';
          setDevNotice(msg);
          if (onError) onError(msg);
        } finally {
          setIsLoading(false);
        }
      }
    });

    // 2. Listen for deep link redirects from system browser (Electron desktop mode: eris://auth/callback)
    const electron = (window as any).electron || (window as any).electronAPI;
    let cleanupElectron: (() => void) | undefined;

    if (electron?.onAuthDeepLink) {
      cleanupElectron = electron.onAuthDeepLink(async (url: string) => {
        try {
          setIsLoading(true);
          setDevNotice(null);

          if (!url || typeof url !== 'string') return;

          let params: URLSearchParams | null = null;
          if (url.includes('#')) {
            params = new URLSearchParams(url.split('#')[1]);
          } else if (url.includes('?')) {
            params = new URLSearchParams(url.split('?')[1]);
          }

          if (!params) return;

          const code = params.get('code');
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            if (data?.user) {
              await syncSessionToLocal(data.user);
            }
          } else if (accessToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            if (error) throw error;
            if (data?.user) {
              await syncSessionToLocal(data.user);
            }
          }
        } catch (err: any) {
          const msg = err?.message || 'Authentication error. Please retry.';
          setDevNotice(msg);
          if (onError) onError(msg);
        } finally {
          setIsLoading(false);
        }
      });
    }

    return () => {
      authListener?.subscription?.unsubscribe();
      if (typeof cleanupElectron === 'function') cleanupElectron();
    };
  }, [onSuccess, onError]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setDevNotice(null);

    try {
      const electron = (window as any).electron || (window as any).electronAPI;
      const isElectron = Boolean(electron);

      // In Electron desktop app, redirect via custom protocol 'eris://auth/callback'
      // In web browser (dev/web mode), redirect to the active browser origin
      const redirectUrl = isElectron
        ? 'eris://auth/callback'
        : window.location.origin;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: isElectron, // in browser, standard redirect; in Electron, openExternal
        },
      });

      if (error) throw error;

      if (isElectron) {
        if (!data?.url) {
          throw new Error('Unable to generate authentication URL from Supabase.');
        }
        if (electron?.openExternal) {
          await electron.openExternal(data.url);
        } else if (electron?.invoke) {
          await electron.invoke('shell:openExternal', data.url);
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Google sign-in failed. Please try again.';
      setDevNotice(errMsg);
      if (onError) onError(errMsg);
      setIsLoading(false);
    }
  };

  const handleDevClick = (provider: string) => {
    setDevNotice(`${provider} sign-in is currently in development. Please sign in with Google or email.`);
    setTimeout(() => setDevNotice(null), 4000);
  };

  return (
    <div className="w-full space-y-2">
      <div className="grid grid-cols-2 gap-2.5 w-full">
        {/* Google Login Button */}
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={handleGoogleLogin}
          className="h-10 w-full flex items-center justify-center gap-1.5 border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-white/70" />
          ) : (
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.4 7.5 23 12 23z"
              />
            </svg>
          )}
          <span className="text-xs font-medium font-sans">Google</span>
        </Button>

        {/* GitHub Login Button */}
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={() => handleDevClick('GitHub')}
          className="h-10 w-full flex items-center justify-center gap-1.5 border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5 shrink-0 fill-current text-white" viewBox="0 0 24 24">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
          <span className="text-xs font-medium font-sans">GitHub</span>
          <span className="text-[10px] text-neutral-400 font-mono">(in dev)</span>
        </Button>
      </div>

      {devNotice && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{devNotice}</span>
        </div>
      )}
    </div>
  );
}

export default SocialConnections;