import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';

export interface MeteorsProps {
  number?: number;
  className?: string;
}

export const Meteors: React.FC<MeteorsProps> = ({ number = 20, className }) => {
  const meteors = useMemo(() => {
    return Array.from({ length: number }).map((_, idx) => ({
      id: idx,
      top: `${Math.floor(Math.random() * 80) - 20}%`,
      left: `${Math.floor(Math.random() * 90)}%`,
      animationDelay: `${(Math.random() * 5).toFixed(2)}s`,
      animationDuration: `${(Math.random() * 3 + 2).toFixed(2)}s`,
    }));
  }, [number]);

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <style>{`
        @keyframes meteor {
          0% {
            transform: rotate(215deg) translateX(0);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: rotate(215deg) translateX(-600px);
            opacity: 0;
          }
        }
      `}</style>
      {meteors.map((m) => (
        <span
          key={m.id}
          className="absolute h-0.5 w-0.5 rounded-full bg-amber-100 shadow-[0_0_0_1px_#ffffff10] rotate-[215deg]"
          style={{
            top: m.top,
            left: m.left,
            animation: `meteor ${m.animationDuration} linear infinite`,
            animationDelay: m.animationDelay,
          }}
        >
          {/* Meteor Tail */}
          <span className="pointer-events-none absolute top-1/2 -z-10 h-px w-[50px] -translate-y-1/2 bg-gradient-to-r from-amber-200/80 via-violet-300/40 to-transparent" />
        </span>
      ))}
    </div>
  );
};

export default Meteors;
