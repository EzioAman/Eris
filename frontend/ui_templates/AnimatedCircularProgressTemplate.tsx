import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../src/lib/utils';

export interface AnimatedCircularProgressTemplateProps {
  value: number; // 0 to 100
  size?: number; // width and height in px
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  className?: string;
}

export const AnimatedCircularProgressTemplate: React.FC<AnimatedCircularProgressTemplateProps> = ({
  value,
  size = 120,
  strokeWidth = 10,
  color = '#38BDF8', // default cyan
  trackColor = 'rgba(255,255,255,0.1)',
  label,
  sublabel,
  className,
}) => {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    // Small delay for entrance animation
    const timer = setTimeout(() => {
      setCurrentValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (currentValue / 100) * circumference;

  return (
    <div
      className={cn('relative flex flex-col items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          strokeDasharray={circumference}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {label ? (
          <span className="text-xl font-bold font-sans text-white">
            {label}
          </span>
        ) : (
          <span className="text-xl font-bold font-sans text-white">
            {Math.round(currentValue)}%
          </span>
        )}
        {sublabel && (
          <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 mt-0.5">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};
