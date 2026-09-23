import React from 'react';
import { cn } from '../src/lib/utils';

export interface AndroidDeviceTemplateProps {
  imageSrc?: string;
  children?: React.ReactNode;
  className?: string;
}

export const AndroidDeviceTemplate: React.FC<AndroidDeviceTemplateProps> = ({
  imageSrc,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'relative mx-auto border-gray-900 dark:border-gray-800 bg-gray-900 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-2xl',
        className
      )}
    >
      {/* Notch / Camera */}
      <div className="absolute top-0 inset-x-0 h-6 w-full flex justify-center">
        <div className="w-16 h-4 bg-gray-900 rounded-b-xl"></div>
      </div>
      
      {/* Side buttons */}
      <div className="absolute -left-[17px] top-[124px] rounded-l-lg w-[3px] h-[46px] bg-gray-800"></div>
      <div className="absolute -left-[17px] top-[178px] rounded-l-lg w-[3px] h-[46px] bg-gray-800"></div>
      <div className="absolute -right-[17px] top-[142px] rounded-r-lg w-[3px] h-[64px] bg-gray-800"></div>

      {/* Screen */}
      <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white dark:bg-black">
        {imageSrc ? (
          <img src={imageSrc} className="w-full h-full object-cover" alt="App screen" />
        ) : (
          children
        )}
      </div>
    </div>
  );
};
