"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

export interface MorphingTextProps {
  text?: string;
  texts?: string[];
  className?: string;
  morphTime?: number;
}

export const MorphingText: React.FC<MorphingTextProps> = ({
  text: propText,
  texts,
  className,
  morphTime = 0.65,
}) => {
  const text1Ref = useRef<HTMLSpanElement>(null);
  const text2Ref = useRef<HTMLSpanElement>(null);
  const currentText = propText ?? texts?.[0] ?? "";
  const prevTextRef = useRef<string>("");
  const isInitialMount = useRef<boolean>(true);

  useEffect(() => {
    const el1 = text1Ref.current;
    const el2 = text2Ref.current;
    if (!el1 || !el2) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevTextRef.current = currentText;
      el1.textContent = currentText;
      el1.style.opacity = "100%";
      el1.style.filter = "none";
      el2.textContent = "";
      el2.style.opacity = "0%";
      el2.style.filter = "none";
      return;
    }

    if (prevTextRef.current === currentText) return;

    const oldText = prevTextRef.current;
    const newText = currentText;
    prevTextRef.current = currentText;

    el1.textContent = oldText;
    el2.textContent = newText;

    const startTime = performance.now();
    let animationFrameId: number;

    const animate = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const fraction = Math.min(1, elapsed / morphTime);

      if (fraction < 1) {
        // el2 fades & unblurs in
        const blur2 = Math.min(8 / fraction - 8, 100);
        el2.style.filter = `blur(${Math.max(0, blur2)}px)`;
        el2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

        // el1 blurs & fades out
        const invertedFraction = 1 - fraction;
        const blur1 = Math.min(8 / invertedFraction - 8, 100);
        el1.style.filter = `blur(${Math.max(0, blur1)}px)`;
        el1.style.opacity = `${Math.pow(invertedFraction, 0.4) * 100}%`;

        animationFrameId = requestAnimationFrame(animate);
      } else {
        // Morph complete: clear filter on el1, hide el2
        el1.textContent = newText;
        el1.style.filter = "none";
        el1.style.opacity = "100%";
        el2.textContent = "";
        el2.style.filter = "none";
        el2.style.opacity = "0%";
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentText, morphTime]);

  return (
    <div
      className={cn(
        "relative mx-auto h-10 sm:h-12 w-full max-w-screen-md text-center font-sans font-medium [filter:url(#morph-threshold)] flex items-center justify-center",
        className
      )}
    >
      <span
        ref={text1Ref}
        className="absolute inset-x-0 top-0 m-auto inline-block w-full select-none"
      />
      <span
        ref={text2Ref}
        className="absolute inset-x-0 top-0 m-auto inline-block w-full select-none"
      />

      <svg className="hidden" aria-hidden="true">
        <defs>
          <filter id="morph-threshold">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 255 -140"
            />
          </filter>
        </defs>
      </svg>
    </div>
  );
};

export default MorphingText;
