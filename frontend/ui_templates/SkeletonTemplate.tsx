import React from 'react';
import { cn } from '../src/lib/utils';

export const SkeletonTemplate: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-neutral-800/80', className)}
      {...props}
    />
  );
};
