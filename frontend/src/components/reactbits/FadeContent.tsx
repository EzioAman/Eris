import { useRef, useEffect, useState, type ReactNode } from 'react';

export interface FadeContentProps {
  children: ReactNode;
  blur?: boolean;
  duration?: number;
  easing?: string;
  threshold?: number;
  initialOpacity?: number;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  className?: string;
  isVisible?: boolean;
}

export const FadeContent = ({
  children,
  blur = true,
  duration = 800,
  easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
  threshold = 0.1,
  initialOpacity = 0,
  delay = 0,
  direction = 'none',
  distance = 16,
  className = '',
  isVisible,
}: FadeContentProps) => {
  const [inView, setInView] = useState(isVisible !== undefined ? false : false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible !== undefined) {
      // Use requestAnimationFrame so initial render at initialOpacity is committed to DOM first
      const rAf = requestAnimationFrame(() => {
        setInView(isVisible);
      });
      return () => cancelAnimationFrame(rAf);
    }

    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current!);
        }
      },
      { threshold }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [threshold, isVisible]);

  const getTransform = () => {
    if (inView || direction === 'none') return 'none';
    switch (direction) {
      case 'up':
        return `translateY(${distance}px)`;
      case 'down':
        return `translateY(-${distance}px)`;
      case 'left':
        return `translateX(${distance}px)`;
      case 'right':
        return `translateX(-${distance}px)`;
      default:
        return 'none';
    }
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : initialOpacity,
        filter: blur ? (inView ? 'blur(0px)' : 'blur(10px)') : 'none',
        transform: getTransform(),
        transition: `opacity ${duration}ms ${easing}, filter ${duration}ms ${easing}, transform ${duration}ms ${easing}`,
        transitionDelay: `${delay}ms`,
        willChange: 'opacity, filter, transform',
      }}
    >
      {children}
    </div>
  );
};

