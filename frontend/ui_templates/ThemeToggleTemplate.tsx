import React from 'react';
import { cn } from '../src/lib/utils';
import { Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';

export interface ThemeToggleTemplateProps {
  isDark: boolean;
  onToggle: (isDark: boolean) => void;
  className?: string;
}

export const ThemeToggleTemplate: React.FC<ThemeToggleTemplateProps> = ({
  isDark,
  onToggle,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={() => onToggle(!isDark)}
      className={cn(
        "relative flex h-8 w-16 items-center rounded-full p-1 transition-colors duration-300",
        isDark ? "bg-[#0d1117] border border-white/10 shadow-inner" : "bg-blue-100 border border-blue-200 shadow-inner",
        className
      )}
    >
      <motion.div
        initial={false}
        animate={{ x: isDark ? 32 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "flex size-6 items-center justify-center rounded-full shadow-md z-10 relative",
          isDark ? "bg-[#161b22]" : "bg-white"
        )}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-blue-400" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
      </motion.div>
      
      {/* Background icons for empty space */}
      <div className="absolute inset-0 flex items-center justify-between px-2 text-neutral-400 opacity-50 pointer-events-none">
        <Sun className="w-3.5 h-3.5 ml-0.5" />
        <Moon className="w-3.5 h-3.5 mr-0.5" />
      </div>
    </button>
  );
};
