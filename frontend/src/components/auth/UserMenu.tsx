import React from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';
import type { SessionConfigStatus } from '../onboarding/authActions';
import { User, Power, LogOut, KeyRound } from 'lucide-react';

export interface UserMenuProps {
  sessionStatus?: SessionConfigStatus;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onEditProfile?: () => void;
  onOpenApiKeyVault?: () => void;
  onReturnToIntro?: () => void;
  onSignOut?: () => void;
  onQuit?: () => void;
  onOpenSubsystems?: () => void;
  onOpenSystemHealth?: () => void;
  className?: string;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  sessionStatus,
  isDarkMode = true,
  onToggleDarkMode,
  onEditProfile,
  onOpenApiKeyVault,
  onReturnToIntro,
  onSignOut,
  onQuit,
  onOpenSubsystems,
  onOpenSystemHealth,
  className,
}) => {
  const email = sessionStatus?.email || '';
  const username = sessionStatus?.username || (email.includes('@') ? email.split('@')[0] : '') || 'User';
  const displayName = sessionStatus?.displayName || username || 'User';
  const avatarUrl = sessionStatus?.avatarUrl || (typeof localStorage !== 'undefined' ? localStorage.getItem('eris_user_avatar') : null);
  const initials = (displayName ? displayName.slice(0, 2) : 'US').toUpperCase();

  const handleSystemHealth = onOpenSystemHealth || onOpenSubsystems;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="User menu"
          className={cn(
            'cursor-pointer flex items-center gap-2 rounded-full p-0.5 sm:px-2 sm:py-1 transition-all outline-none',
            isDarkMode
              ? 'hover:bg-white/10 text-neutral-200 border border-white/10'
              : 'hover:bg-slate-100 text-slate-700 border border-slate-200',
            className
          )}
        >
          {/* Avatar with Image/GIF or Initials */}
          <div className="size-7 rounded-full bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center text-white text-[11px] font-bold shadow-sm shrink-0 select-none overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <span className="hidden sm:inline-block text-xs font-medium truncate max-w-[110px]">
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className={cn(
          'w-60 font-sans p-1.5 shadow-2xl rounded-xl z-50 border-[var(--border-workspace)] bg-[var(--bg-surface)] text-[var(--text-primary)] backdrop-blur-xl'
        )}
      >
        {/* User Profile Header */}
        <DropdownMenuLabel className="font-normal p-2">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-gradient-to-br from-violet-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold truncate leading-snug text-[var(--text-primary)]">
                {displayName}
              </span>
              {email ? (
                <span className="text-[11px] truncate text-[var(--text-secondary)]">
                  {email}
                </span>
              ) : (
                <span className="text-[11px] truncate italic text-[var(--text-secondary)]">
                  Local Session
                </span>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-[var(--border-workspace)]" />

        {/* Menu Items */}
        <DropdownMenuGroup>
          {handleSystemHealth && (
            <DropdownMenuItem
              onClick={handleSystemHealth}
              className={cn(
                'py-2 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10'
              )}
            >
              System Health
            </DropdownMenuItem>
          )}

          {onToggleDarkMode && (
            <DropdownMenuItem
              onClick={onToggleDarkMode}
              className={cn(
                'py-2 px-2.5 rounded-lg text-xs font-medium transition-colors justify-between flex text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10'
              )}
            >
              <span>Appearance</span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded border border-[var(--border-workspace)] bg-black/5 dark:bg-white/10 text-[var(--text-secondary)]">
                {isDarkMode ? 'Dark' : 'Light'}
              </span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-[var(--border-workspace)]" />

        {/* Edit Profile & Username Action */}
        {onEditProfile && (
          <DropdownMenuItem
            onClick={onEditProfile}
            className={cn(
              'py-2 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10'
            )}
          >
            <span>Edit Profile & Username</span>
            <User className="size-3.5 opacity-60" />
          </DropdownMenuItem>
        )}

        {/* API Key Vault Action */}
        {onOpenApiKeyVault && (
          <DropdownMenuItem
            onClick={onOpenApiKeyVault}
            className={cn(
              'py-2 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-between text-[var(--accent-primary)] hover:bg-[var(--accent-glow)]'
            )}
          >
            <span>API Key Vault</span>
            <KeyRound className="size-3.5 opacity-70 text-[var(--accent-primary)]" />
          </DropdownMenuItem>
        )}

        {/* Main Menu / Intro Return Action */}
        {onReturnToIntro && (
          <DropdownMenuItem
            onClick={onReturnToIntro}
            className={cn(
              'py-2 px-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10'
            )}
          >
            Return to Main Menu (Intro)
          </DropdownMenuItem>
        )}

        {/* Sign Out Action */}
        {onSignOut && (
          <DropdownMenuItem
            onClick={onSignOut}
            className={cn(
              'py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between text-amber-500 hover:bg-amber-500/10'
            )}
          >
            <span>Sign out</span>
            <LogOut className="size-3.5 opacity-70" />
          </DropdownMenuItem>
        )}

        {/* Dedicated Quit ERIS Action */}
        <DropdownMenuItem
          onClick={() => {
            if (onQuit) {
              onQuit();
              return;
            }
            if (typeof window !== 'undefined' && (window as any).electronAPI?.quitApp) {
              (window as any).electronAPI.quitApp();
              return;
            }
            if (typeof window !== 'undefined' && (window as any).electronAPI?.quit) {
              (window as any).electronAPI.quit();
              return;
            }
            if (onSignOut) {
              onSignOut();
            }
          }}
          className={cn(
            'py-2 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between',
            isDarkMode
              ? 'text-rose-400 hover:bg-rose-500/15 hover:text-rose-300'
              : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
          )}
        >
          <span>Quit ERIS</span>
          <Power className="size-3.5 opacity-70" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
