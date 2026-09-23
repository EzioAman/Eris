import React from 'react';
import { cn } from '../../lib/utils';
import erisDefaultGif from '../../assets/eris_default.gif';

export type AgentState = 'idle' | 'thinking' | 'working' | 'speaking' | 'alert' | 'success' | 'error';

export interface ErisAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isThinking?: boolean;
  state?: AgentState;
  showIndicator?: boolean;
}

const sizeMap = {
  xs: 'size-6',
  sm: 'size-8',
  md: 'size-9',
  lg: 'size-11',
  xl: 'size-14',
};

const indicatorSizeMap = {
  xs: 'size-1.5 -bottom-0.5 -right-0.5',
  sm: 'size-2 -bottom-0.5 -right-0.5',
  md: 'size-2.5 -bottom-0.5 -right-0.5',
  lg: 'size-3 -bottom-1 -right-1',
  xl: 'size-3.5 -bottom-1 -right-1',
};

export const ErisAvatar: React.FC<ErisAvatarProps> = ({
  size = 'md',
  className,
  isThinking = false,
  state = 'idle',
  showIndicator = true,
}) => {
  const effectiveState: AgentState = isThinking ? 'thinking' : state;

  // Standardize on default animated ERIS logo for vivid, high-contrast display in all themes
  const avatarSrc = erisDefaultGif;

  // State-specific border glow and pulse styling
  const stateRingClass = (() => {
    switch (effectiveState) {
      case 'thinking':
        return 'ring-2 ring-amber-500/70 shadow-amber-500/25 shadow-sm animate-pulse';
      case 'working':
        return 'ring-2 ring-blue-500/70 shadow-blue-500/25 shadow-sm animate-pulse';
      case 'alert':
      case 'error':
        return 'ring-2 ring-rose-500/70 shadow-rose-500/25 shadow-sm';
      case 'success':
        return 'ring-2 ring-emerald-500/70 shadow-emerald-500/25 shadow-sm';
      default:
        return 'ring-1 ring-white/10 dark:ring-white/15';
    }
  })();

  // State-specific status indicator dot
  const indicatorColorClass = (() => {
    switch (effectiveState) {
      case 'thinking':
        return 'bg-amber-400 animate-ping';
      case 'working':
        return 'bg-blue-400 animate-pulse';
      case 'alert':
      case 'error':
        return 'bg-rose-500';
      case 'success':
        return 'bg-emerald-400';
      default:
        return 'bg-emerald-500';
    }
  })();

  return (
    <div className={cn('relative inline-flex shrink-0 select-none', sizeMap[size], className)}>
      <div
        className={cn(
          'w-full h-full rounded-xl overflow-hidden flex items-center justify-center shadow-xs transition-all duration-300',
          stateRingClass
        )}
        title={`ERIS Assistant (${effectiveState})`}
      >
        <img
          src={avatarSrc}
          alt={`ERIS (${effectiveState})`}
          className="w-full h-full object-cover rounded-xl"
          loading="eager"
        />
      </div>

      {/* Floating State Indicator Dot */}
      {showIndicator && (
        <span
          className={cn(
            'rounded-full ring-2 ring-[#0A0D14] absolute z-10',
            indicatorSizeMap[size],
            indicatorColorClass
          )}
          title={`State: ${effectiveState}`}
        />
      )}
    </div>
  );
};

export default ErisAvatar;
