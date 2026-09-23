import React from 'react';
import { cn } from '../src/lib/utils';
import { motion } from 'framer-motion';

export interface TextHighlighterTemplateProps {
  text: string;
  highlights: string[];
  highlightColor?: string;
  className?: string;
}

export const TextHighlighterTemplate: React.FC<TextHighlighterTemplateProps> = ({
  text,
  highlights,
  highlightColor = 'bg-yellow-200 dark:bg-yellow-500/30 text-black dark:text-yellow-200',
  className,
}) => {
  // Simple regex to match highlights case insensitively
  const regex = new RegExp(`(${highlights.join('|')})`, 'gi');
  const parts = text.split(regex);

  return (
    <div className={cn("text-base leading-relaxed", className)}>
      {parts.map((part, i) => {
        const isHighlight = highlights.some(h => h.toLowerCase() === part.toLowerCase());
        
        if (isHighlight) {
          return (
            <motion.span
              key={i}
              initial={{ backgroundColor: 'rgba(255,255,255,0)' }}
              animate={{ backgroundColor: 'inherit' }} // Fallback
              className={cn("px-1 rounded-sm mx-0.5 font-medium transition-colors", highlightColor)}
            >
              {part}
            </motion.span>
          );
        }
        
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};
