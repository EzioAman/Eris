import React from 'react';
import PixelSwap from '../src/components/reactbits/PixelSwap';
import { BadgeTemplate } from './BadgeTemplate';

export const PixelSwapTemplate: React.FC = () => {
  return (
    <div className="flex flex-col items-center gap-6 p-6 font-sans">
      <div className="flex items-center gap-2">
        <BadgeTemplate variant="secondary">ReactBits</BadgeTemplate>
        <span className="text-sm font-semibold text-white">PixelSwap Component Template</span>
      </div>

      <div className="w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-black">
        <PixelSwap
          firstContent={
            <div className="flex h-64 w-full flex-col items-center justify-center bg-gradient-to-br from-violet-950/80 to-black p-6 text-center">
              <span className="text-3xl mb-2">❖</span>
              <span className="text-lg font-semibold text-white">Click me</span>
              <span className="text-xs text-neutral-400 mt-1">Interactive pixel dissolution trigger</span>
            </div>
          }
          secondContent={
            <div className="flex h-64 w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-950/80 to-black p-6 text-center">
              <span className="text-3xl mb-2">✨</span>
              <span className="text-lg font-semibold text-white">You found me</span>
              <span className="text-xs text-emerald-400 mt-1">Dissolve keyframes synchronized</span>
            </div>
          }
          pixelSize={64}
          gap={0}
          pixelRadius={0}
          pixelSpin={0}
          pixelScale={0.35}
          duration={1400}
          pixelDuration={450}
          pattern="center"
          randomness={0}
          fade
          trigger="click"
          className="w-full h-64"
        />
      </div>
    </div>
  );
};

export default PixelSwapTemplate;
