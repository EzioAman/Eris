import React from 'react';
import ScrollZoomHero from '../src/components/ui/scroll-zoom-hero';
import { BadgeTemplate } from './BadgeTemplate';

export const ScrollZoomHeroTemplate: React.FC = () => {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-4xl px-4 pt-8 pb-4 flex items-center justify-between border-b border-white/10 font-sans">
        <div className="flex items-center gap-2">
          <BadgeTemplate variant="secondary">WebInnoventix</BadgeTemplate>
          <span className="text-sm font-semibold text-white">Scroll Zoom Hero Template</span>
        </div>
        <BadgeTemplate variant="outline">motion/react</BadgeTemplate>
      </div>

      <div className="w-full">
        <ScrollZoomHero
          badgeText="ERIS Subsystems · 2026"
          title="Build worlds that pull you inward"
          subtitle="A depth-driven interface that reacts to every pixel you scroll. The scene scales, brightens, and breathes while your words drift toward the horizon."
        />
      </div>
    </div>
  );
};

export default ScrollZoomHeroTemplate;
