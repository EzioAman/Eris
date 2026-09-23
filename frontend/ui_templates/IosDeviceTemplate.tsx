import React from 'react';
import { cn } from '../src/lib/utils';
import { Wifi, Battery } from 'lucide-react';

export interface IosDeviceTemplateProps {
  imageSrc?: string;
  children?: React.ReactNode;
  className?: string;
  time?: string;
}

export const IosDeviceTemplate: React.FC<IosDeviceTemplateProps> = ({
  imageSrc,
  children,
  className,
  time = '9:41',
}) => {
  return (
    <div
      className={cn(
        'relative mx-auto bg-neutral-950 border-[10px] border-neutral-800 rounded-[3rem] h-[640px] w-[320px] shadow-2xl shadow-black/40 overflow-hidden font-sans select-none ring-1 ring-white/10',
        className
      )}
    >
      {/* Side Hardware Buttons */}
      <div className="absolute -left-[13px] top-[95px] rounded-l-md w-[3px] h-[24px] bg-neutral-700" />
      <div className="absolute -left-[13px] top-[135px] rounded-l-md w-[3px] h-[46px] bg-neutral-700" />
      <div className="absolute -left-[13px] top-[190px] rounded-l-md w-[3px] h-[46px] bg-neutral-700" />
      <div className="absolute -right-[13px] top-[150px] rounded-r-md w-[3px] h-[64px] bg-neutral-700" />

      {/* Screen Container */}
      <div className="relative w-full h-full rounded-[2.4rem] overflow-hidden bg-white dark:bg-neutral-900 flex flex-col">
        {/* iOS Status Bar with Dynamic Island */}
        <div className="relative z-30 h-11 w-full px-7 flex items-center justify-between text-neutral-900 dark:text-neutral-100 text-xs font-semibold">
          {/* Time */}
          <span className="tabular-nums tracking-tight text-[13px]">{time}</span>

          {/* Dynamic Island Pill */}
          <div className="absolute left-1/2 -translate-x-1/2 top-2.5 h-[26px] w-[96px] bg-black rounded-full flex items-center justify-between px-2.5 shadow-md">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800" />
            <div className="w-2 h-2 rounded-full bg-amber-500/80 animate-pulse" />
          </div>

          {/* Cellular, Wifi, Battery */}
          <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
            <div className="flex items-end gap-[1.5px] h-2.5">
              <div className="w-[2.5px] h-1 bg-current rounded-xs" />
              <div className="w-[2.5px] h-1.5 bg-current rounded-xs" />
              <div className="w-[2.5px] h-2 bg-current rounded-xs" />
              <div className="w-[2.5px] h-2.5 bg-current rounded-xs" />
            </div>
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {/* Viewport Content */}
        <div className="flex-1 overflow-auto relative">
          {imageSrc ? (
            <img src={imageSrc} alt="iOS App screen" className="w-full h-full object-cover" />
          ) : children ? (
            children
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-neutral-400 dark:text-neutral-500">
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3 shadow-inner">
                <span className="text-xl font-bold text-neutral-700 dark:text-neutral-300">iOS</span>
              </div>
              <p className="text-xs font-medium">Apple iPhone Simulator</p>
              <p className="text-[11px] opacity-60 mt-1">Ready for application preview</p>
            </div>
          )}
        </div>

        {/* Home Indicator Bar */}
        <div className="h-5 w-full flex items-center justify-center pointer-events-none">
          <div className="w-32 h-1 bg-neutral-400 dark:bg-neutral-500 rounded-full opacity-60" />
        </div>
      </div>
    </div>
  );
};

export default IosDeviceTemplate;
