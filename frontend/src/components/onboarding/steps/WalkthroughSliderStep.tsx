import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  Database,
  Shield,
  KeyRound,
  Rocket,
  Sparkles,
  Layers,
  Terminal,
  Lock,
  Zap,
} from 'lucide-react';
import './WalkthroughSlider.css';

export interface WalkthroughSliderStepProps {
  onCreateAccount?: () => void;
  onSignIn?: () => void;
  onFinish?: () => void;
}

interface SlideData {
  title: string;
  subtitle: string;
  description: string;
  mainIcon: React.ReactNode;
  backIcon: React.ReactNode;
  badgeIcon: React.ReactNode;
}

export const WalkthroughSliderStep: React.FC<WalkthroughSliderStepProps> = ({
  onCreateAccount,
  onSignIn,
  onFinish,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides: SlideData[] = [
    {
      title: 'ERIS Engine',
      subtitle: 'Local Workspace Environment',
      description:
        'A lightweight local coding environment with persistent state, tool integration, and execution memory.',
      mainIcon: <Cpu className="w-12 h-12 text-sky-400" />,
      backIcon: <Sparkles className="w-16 h-16 text-sky-500" />,
      badgeIcon: <Zap className="w-4 h-4 text-sky-300" />,
    },
    {
      title: 'Context Vault',
      subtitle: 'Code Graph & Document Index',
      description:
        'Embedded vector search indexes project code, dependencies, and syntax graphs for instant context.',
      mainIcon: <Database className="w-12 h-12 text-indigo-400" />,
      backIcon: <Layers className="w-16 h-16 text-indigo-500" />,
      badgeIcon: <Sparkles className="w-4 h-4 text-indigo-300" />,
    },
    {
      title: 'Process Sandbox',
      subtitle: 'Guardrails & AST Protection',
      description:
        'Strict path traversal guards and subprocess validation keep your project directory secure.',
      mainIcon: <Terminal className="w-12 h-12 text-emerald-400" />,
      backIcon: <Shield className="w-16 h-16 text-emerald-500" />,
      badgeIcon: <Lock className="w-4 h-4 text-emerald-300" />,
    },
    {
      title: 'Centralized Auth',
      subtitle: 'PostgreSQL & OTP Verification',
      description:
        'Secure user management with 5-minute cryptographic OTP verification and SHA-256 session tokens.',
      mainIcon: <KeyRound className="w-12 h-12 text-amber-400" />,
      backIcon: <Shield className="w-16 h-16 text-amber-500" />,
      badgeIcon: <Lock className="w-4 h-4 text-amber-300" />,
    },
    {
      title: 'Ready to Build',
      subtitle: 'Initialize Workspace',
      description:
        'Sign in or create an account to start development.',
      mainIcon: <Rocket className="w-12 h-12 text-sky-400" />,
      backIcon: <Sparkles className="w-16 h-16 text-sky-500" />,
      badgeIcon: <Zap className="w-4 h-4 text-sky-300" />,
    },
  ];

  const maxIndex = slides.length - 1;
  const isLast = currentIndex === maxIndex;

  const nextScreen = useCallback(() => {
    setCurrentIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
  }, [maxIndex]);

  const prevScreen = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goTo = (index: number) => {
    setCurrentIndex(index);
  };

  // Keyboard navigation matching Jebbles code (Left/Right arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextScreen();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevScreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextScreen, prevScreen]);

  return (
    <div className="eris-walkthrough-card">
      {/* Skip Button */}
      {!isLast && (
        <button
          className="eris-walkthrough-skip"
          onClick={() => (onFinish ? onFinish() : setCurrentIndex(maxIndex))}
          title="Skip to Workspace"
        >
          Skip
        </button>
      )}

      {/* Top Pagination Dots */}
      <div className="eris-walkthrough-pagination">
        {slides.map((_, idx) => (
          <a
            key={idx}
            className={`dot ${idx === currentIndex ? 'active' : ''}`}
            onClick={() => goTo(idx)}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Walkthrough Body */}
      <div className="eris-walkthrough-body">
        {/* Left Arrow Button */}
        <button
          className="nav-arrow prev"
          onClick={prevScreen}
          disabled={currentIndex === 0}
          aria-label="Previous Screen"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Screens Slider */}
        <ul className="eris-walkthrough-screens">
          {slides.map((slide, idx) => {
            const isActive = idx === currentIndex;
            const isPrev = idx < currentIndex;
            return (
              <li
                key={idx}
                className={`eris-walkthrough-screen ${
                  isActive ? 'active' : isPrev ? 'prev' : ''
                }`}
              >
                {/* Media Circle with Multi-layered Animated Icons */}
                <div className="eris-media-circle">
                  <div className="icon-layer-back">{slide.backIcon}</div>
                  <div className="icon-layer-main">{slide.mainIcon}</div>
                  <div className="icon-layer-badge">{slide.badgeIcon}</div>
                </div>

                <h3>
                  {slide.title}
                  <br />
                  <span className="text-sky-400 font-normal text-xs tracking-normal block mt-1">
                    {slide.subtitle}
                  </span>
                </h3>

                <p>{slide.description}</p>
              </li>
            );
          })}
        </ul>

        {/* Right Arrow Button */}
        <button
          className="nav-arrow next"
          onClick={nextScreen}
          disabled={isLast}
          aria-label="Next Screen"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Walkthrough Footer */}
      <div className="eris-walkthrough-footer">
        {/* Standard "Next" Button */}
        <button
          className="eris-walkthrough-btn-next"
          onClick={nextScreen}
          style={{ opacity: isLast ? 0 : 1, pointerEvents: isLast ? 'none' : 'auto' }}
        >
          Next
        </button>

        {/* Final Screen Finish Actions (Slide Up Smoothly) */}
        <div className={`eris-walkthrough-finish-bar ${isLast ? 'active' : ''}`}>
          {onFinish ? (
            <button
              className="eris-btn-action-signup w-full"
              style={{ width: '100%' }}
              onClick={onFinish}
            >
              Enter Workspace
            </button>
          ) : (
            <>
              <button
                className="eris-btn-action-signup"
                onClick={onCreateAccount}
              >
                Create Account
              </button>
              <button
                className="eris-btn-action-signin"
                onClick={onSignIn}
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
