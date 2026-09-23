import React, { useState, useEffect } from 'react';
import { PixelSwap } from '../src/components/reactbits/PixelSwap';
import { cn } from '../src/lib/utils';
import { SkeletonTemplate } from './SkeletonTemplate';

export interface PixelImageTemplateProps {
  src: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  pixelSize?: number;
  duration?: number;
  className?: string;
}

export const PixelImageTemplate: React.FC<PixelImageTemplateProps> = ({
  src,
  alt = '',
  width = '100%',
  height = 'auto',
  pixelSize = 32,
  duration = 1000,
  className,
}) => {
  const [active, setActive] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      const timer = setTimeout(() => {
        setActive(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoaded]);

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl border border-white/10', className)}
      style={{ width, height }}
    >
      <img
        src={src}
        alt={alt}
        className="hidden"
        onLoad={() => setIsLoaded(true)}
      />
      
      {!isLoaded ? (
        <SkeletonTemplate className="w-full h-full min-h-[200px]" />
      ) : (
        <PixelSwap
          firstContent={
            <div className="w-full h-full min-h-[200px] bg-neutral-900" style={{ width, height }} />
          }
          secondContent={
            <img
              src={src}
              alt={alt}
              style={{ width, height, objectFit: 'cover' }}
              className="w-full h-full block"
            />
          }
          active={active}
          initialActive={false}
          trigger="none"
          pattern="diagonal"
          pixelSize={pixelSize}
          duration={duration}
          pixelDuration={duration * 0.4}
          fade
          className="w-full h-full"
        />
      )}
    </div>
  );
};
