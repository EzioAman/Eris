import React, { createContext, useContext } from 'react';
import { cn } from '../../lib/utils';

interface BlurVignetteContextProps {
  radius?: string;
  inset?: string;
  transitionLength?: string;
  blur?: string;
}

const BlurVignetteContext = createContext<BlurVignetteContextProps>({
  radius: '24px',
  inset: '20px',
  transitionLength: '44px',
  blur: '6px',
});

export const useBlurVignetteContext = () => useContext(BlurVignetteContext);

export interface BlurVignetteProps {
  classname?: string;
  children: React.ReactNode;
  radius?: string;
  inset?: string;
  transitionLength?: string;
  blur?: string;
  blurclassname?: string;
}

export const BlurVignette: React.FC<BlurVignetteProps> = ({
  classname,
  children,
  radius = '24px',
  inset = '20px',
  transitionLength = '44px',
  blur = '6px',
}) => {
  return (
    <BlurVignetteContext.Provider value={{ radius, inset, transitionLength, blur }}>
      <div
        className={cn('relative overflow-hidden', classname)}
        style={{ borderRadius: radius }}
      >
        {children}
      </div>
    </BlurVignetteContext.Provider>
  );
};

export interface BlurVignetteArticleProps {
  children?: React.ReactNode;
  classname?: string;
}

export const BlurVignetteArticle: React.FC<BlurVignetteArticleProps> = ({
  children,
  classname,
}) => {
  const {
    radius = '0px',
    inset = '0px',
    transitionLength = '100px',
    blur = '15px',
  } = useBlurVignetteContext();

  return (
    <div
      className={cn('blur-vignette absolute inset-0 w-full h-full pointer-events-none z-10', classname)}
      style={
        {
          '--radius': radius,
          '--inset': inset,
          '--transition-length': transitionLength,
          '--blur': blur,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
};

export default BlurVignette;
