import React from 'react';
import { cn } from '../src/lib/utils';

export interface AspectRatioTemplateProps extends React.HTMLAttributes<HTMLDivElement> {
  ratio?: number; // width / height, e.g. 16/9
}

export const AspectRatioTemplate: React.FC<AspectRatioTemplateProps> = ({
  ratio = 16 / 9,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn('relative w-full overflow-hidden', className)}
      style={{ paddingBottom: `${(1 / ratio) * 100}%` }}
      {...props}
    >
      <div className="absolute inset-0 size-full">{children}</div>
    </div>
  );
};
