import React from 'react';
import { cn } from '../src/lib/utils';
import { motion } from 'framer-motion';

export interface MarqueeListTemplateProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  speed?: number; // seconds to complete one loop
  className?: string;
  itemClassName?: string;
}

export const MarqueeListTemplate: React.FC<MarqueeListTemplateProps> = ({
  children,
  direction = 'left',
  speed = 20,
  className,
  itemClassName,
}) => {
  const isHorizontal = direction === 'left' || direction === 'right';
  
  const moveDirection = direction === 'left' ? -1 : direction === 'right' ? 1 : direction === 'up' ? -1 : 1;

  // We duplicate the content to ensure seamless looping
  const content = (
    <div className={cn('flex shrink-0 gap-4', isHorizontal ? 'flex-row' : 'flex-col', itemClassName)}>
      {children}
    </div>
  );

  return (
    <div
      className={cn(
        'group relative flex overflow-hidden',
        isHorizontal ? 'w-full flex-row' : 'h-full flex-col',
        className
      )}
      style={{
        maskImage: isHorizontal 
          ? 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' 
          : 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
      }}
    >
      <motion.div
        className={cn('flex shrink-0 gap-4', isHorizontal ? 'flex-row' : 'flex-col')}
        animate={
          isHorizontal 
            ? { x: [0, `${moveDirection * -100}%`] }
            : { y: [0, `${moveDirection * -100}%`] }
        }
        transition={{
          repeat: Infinity,
          ease: 'linear',
          duration: speed,
        }}
        style={{
          // Custom class for pause-on-hover via CSS is easier but framer motion handles it well if we just do:
        }}
      >
        {content}
        {content}
      </motion.div>
    </div>
  );
};
