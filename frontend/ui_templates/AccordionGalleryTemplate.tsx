import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../src/lib/utils';

export interface AccordionGalleryItem {
  image: string;
  label: string;
  link?: string;
  alt?: string;
}

export interface AccordionGalleryTemplateProps {
  items?: AccordionGalleryItem[];
  defaultIndex?: number;
  accentColor?: string;
  overlayColor?: string;
  textColor?: string;
  height?: number;
  gap?: number;
  radius?: number;
  expandRatio?: number;
  orientation?: 'horizontal' | 'vertical';
  duration?: number;
  parallax?: number;
  tilt?: number;
  trigger?: 'hover' | 'click';
  showLabels?: boolean;
  grayscale?: boolean;
  className?: string;
}

const DEFAULT_ITEMS: AccordionGalleryItem[] = [
  { image: 'https://picsum.photos/id/1015/900/1200', label: 'Canyon', link: '#' },
  { image: 'https://picsum.photos/id/1018/900/1200', label: 'Ridgeline', link: '#' },
  { image: 'https://picsum.photos/id/1039/900/1200', label: 'Falls', link: '#' },
  { image: 'https://picsum.photos/id/1043/900/1200', label: 'Harbour', link: '#' },
  { image: 'https://picsum.photos/id/1044/900/1200', label: 'Skyline', link: '#' },
];

export const AccordionGalleryTemplate: React.FC<AccordionGalleryTemplateProps> = ({
  items = DEFAULT_ITEMS,
  defaultIndex = 2,
  accentColor = '#8B5CF6',
  overlayColor = '#060010',
  textColor = '#ffffff',
  height = 460,
  gap = 10,
  radius = 16,
  expandRatio = 0.52,
  orientation = 'horizontal',
  duration = 0.55,
  parallax = 0.5,
  tilt = 8,
  trigger = 'hover',
  showLabels = true,
  grayscale = true,
  className = '',
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mediaSize, setMediaSize] = useState(320);
  const count = items.length;
  const [active, setActive] = useState(Math.min(Math.max(defaultIndex, 0), Math.max(0, count - 1)));
  const reducedMotion = useReducedMotion();

  const vertical = orientation === 'vertical';
  const r = Math.min(Math.max(expandRatio, 0.2), 0.9);
  const grow = count > 1 ? (r * (count - 1)) / (1 - r) : 1;

  // Responsive measurement for parallax range
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const total = vertical ? rect.height : rect.width;
      const usable = Math.max(total - gap * (count - 1), 120);
      const size = Math.max(140, usable * r * 1.22);
      setMediaSize(size);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gap, count, r, vertical]);

  const handleEnter = useCallback(
    (i: number) => {
      if (trigger === 'hover') setActive(i);
    },
    [trigger]
  );

  const handleClick = useCallback(
    (i: number, e: React.MouseEvent) => {
      if (i !== active) {
        e.preventDefault();
        setActive(i);
      }
    },
    [active]
  );

  const handleKeyDown = useCallback(
    (i: number, e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i + 1) % count);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i - 1 + count) % count);
      }
    },
    [count]
  );

  const easeCurve = [0.16, 1, 0.3, 1] as const;

  return (
    <div
      ref={rootRef}
      className={cn(
        'flex w-full max-w-full [perspective:1400px] max-[520px]:!flex-col max-[520px]:[perspective:none]',
        vertical ? 'flex-col' : 'flex-row',
        className
      )}
      style={{
        gap: `${gap}px`,
        height: vertical ? `${Math.round(height * 1.6)}px` : `${height}px`,
      }}
      role="list"
      aria-label="Image accordion gallery"
    >
      {items.map((item, i) => {
        const isActive = i === active;
        const Tag = item.link ? motion.a : motion.div;

        // 3D rotation based on position relative to active item
        const rot = reducedMotion ? 0 : isActive ? 0 : i < active ? tilt : -tilt;
        const rotateProps = vertical ? { rotateX: -rot } : { rotateY: rot };

        // Parallax drift calculation
        const drift = Math.max(-1.5, Math.min(1.5, active - i));
        const shift = reducedMotion ? 0 : drift * parallax * mediaSize * 0.06;

        return (
          <Tag
            key={i}
            className={cn(
              'group relative block min-w-0 min-h-0 flex-[1_1_0] cursor-pointer overflow-hidden bg-[#0a0713] no-underline outline-none [transform-style:preserve-3d] [transform-origin:center] shadow-2xl focus-visible:ring-2 focus-visible:ring-violet-400 max-[520px]:min-h-[84px] max-[520px]:!transform-none select-none'
            )}
            style={{
              borderRadius: `${radius}px`,
            }}
            animate={{
              flexGrow: isActive ? grow : 1,
              ...rotateProps,
            }}
            transition={{
              duration: reducedMotion ? 0 : duration,
              ease: easeCurve,
            }}
            href={item.link || undefined}
            onClick={(e: React.MouseEvent) => handleClick(i, e)}
            onMouseEnter={() => handleEnter(i)}
            onFocus={() => setActive(i)}
            onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(i, e)}
            role="listitem"
            tabIndex={0}
            aria-current={isActive ? 'true' : undefined}
            aria-label={item.label}
          >
            {/* Background Media Container */}
            <div className="absolute inset-0 overflow-hidden [border-radius:inherit]">
              <motion.div
                className="absolute top-1/2 left-1/2"
                style={{
                  width: vertical ? '100%' : `${mediaSize}px`,
                  height: vertical ? `${mediaSize}px` : '100%',
                }}
                animate={{
                  x: vertical ? '-50%' : `calc(-50% + ${isActive ? 0 : shift}px)`,
                  y: vertical ? `calc(-50% + ${isActive ? 0 : shift}px)` : '-50%',
                  filter: grayscale
                    ? isActive
                      ? 'grayscale(0%)'
                      : 'grayscale(100%)'
                    : 'grayscale(0%)',
                }}
                transition={{
                  duration: reducedMotion ? 0 : duration,
                  ease: easeCurve,
                }}
              >
                <img
                  src={item.image}
                  alt={item.alt || item.label || ''}
                  draggable="false"
                  className="block h-full w-full select-none object-cover pointer-events-none"
                />
              </motion.div>

              {/* Dynamic Contrast Overlay Scrim */}
              <motion.div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, transparent 40%, color-mix(in srgb, ${overlayColor} 80%, transparent) 100%)`,
                }}
                animate={{
                  opacity: isActive ? 0.45 : 0.8,
                }}
                transition={{
                  duration: reducedMotion ? 0 : duration,
                  ease: easeCurve,
                }}
                aria-hidden="true"
              />
            </div>

            {/* Label & Accent Bar */}
            {showLabels && (
              <div
                className="pointer-events-none absolute bottom-5 left-5 right-5 z-[2] flex items-center gap-3"
                aria-hidden="true"
              >
                <motion.span
                  className="h-[26px] w-[3px] flex-none rounded-[3px]"
                  style={{
                    background: accentColor,
                    boxShadow: `0 0 12px color-mix(in srgb, ${accentColor} 70%, transparent)`,
                  }}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    x: isActive ? 0 : -14,
                  }}
                  transition={{
                    duration: reducedMotion ? 0 : duration,
                    ease: easeCurve,
                  }}
                />
                <motion.span
                  className="overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(0.95rem,1.3vw,1.3rem)] font-semibold tracking-[0.02em] [text-shadow:0_2px_14px_rgba(0,0,0,0.7)]"
                  style={{ color: textColor }}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    x: isActive ? 0 : -14,
                  }}
                  transition={{
                    duration: reducedMotion ? 0 : duration,
                    ease: easeCurve,
                  }}
                >
                  {item.label}
                </motion.span>
              </div>
            )}
          </Tag>
        );
      })}
    </div>
  );
};

export default AccordionGalleryTemplate;
