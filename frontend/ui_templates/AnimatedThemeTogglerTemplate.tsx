import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '../src/lib/utils';
import type { ThemeTransitionOrigin } from '../src/lib/workspaceActions';

export interface AnimatedThemeTogglerTemplateProps {
  isDarkMode: boolean;
  onToggle: (origin?: ThemeTransitionOrigin) => void;
  className?: string;
}

export const AnimatedThemeTogglerTemplate: React.FC<AnimatedThemeTogglerTemplateProps> = ({
  isDarkMode,
  onToggle,
  className,
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle({ x: e.clientX, y: e.clientY });
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative inline-flex items-center justify-center size-8 rounded-full transition-colors overflow-hidden border cursor-pointer',
        isDarkMode
          ? 'bg-white/10 hover:bg-white/20 border-white/10 text-amber-300'
          : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700',
        className
      )}
      title="Toggle Theme"
      aria-label="Toggle Theme"
    >
      <div className={cn("absolute transition-transform duration-500", isDarkMode ? "scale-0 rotate-90" : "scale-100 rotate-0")}>
        <Sun className="size-4" />
      </div>
      <div className={cn("absolute transition-transform duration-500", isDarkMode ? "scale-100 rotate-0" : "scale-0 -rotate-90")}>
        <Moon className="size-4" />
      </div>
    </button>
  );
};
