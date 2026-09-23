import React, { useState, useEffect, useCallback } from 'react';
import ScrollExpand from '../reactbits/ScrollExpand';
import { NavButton } from '../../../ui_templates/LargeCtaButtonTemplate';
import {
  WorkspaceConfigStep,
  LoginStep,
  SignUpStep,
  ForgotPasswordStep,
  ResetPasswordStep,
  VerifyEmailStep,
  LegalTermsStep,
  WalkthroughSliderStep,
} from './steps';
import { type OnboardingStep, type SessionConfigStatus, getNavConfig } from './authActions';
import { BlurVignette, BlurVignetteArticle } from '../ui/blur-vignette';
import { MeetTheTeamModal } from '../intro/MeetTheTeamModal';
import { cn } from '../../lib/utils';

interface OnboardingScreenProps {
  onBack?: () => void;
  onComplete?: (session: SessionConfigStatus) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onBack, onComplete }) => {
  const [isTriggered] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);
  // Navigation stack for function-calling style navigation
  const [history, setHistory] = useState<OnboardingStep[]>(['workspace']);
  const [userEmail, setUserEmail] = useState<string>('');
  const [savedSession, setSavedSession] = useState<SessionConfigStatus | null>(null);
  const [legalTab, setLegalTab] = useState<'tos' | 'privacy'>('tos');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [signUpDraft, setSignUpDraft] = useState({ email: '', password: '' });

  const currentStep = history[history.length - 1] || 'workspace';
  const navConfig = getNavConfig(currentStep);
  const isSubStep = currentStep !== 'workspace';

  // 3. Navigation functions (push, pop, replace)
  const pushStep = useCallback((step: OnboardingStep) => {
    setHistory((prev) => [...prev, step]);
  }, []);

  const popStep = useCallback(() => {
    setHistory((prev) => {
      if (prev.length > 1) {
        return prev.slice(0, -1);
      }
      // Reached root (workspace) -> return to Main Menu / ErisIntro
      onBack?.();
      return prev;
    });
  }, [onBack]);

  const replaceStep = useCallback((step: OnboardingStep) => {
    setHistory((prev) => {
      const next = [...prev];
      next[next.length - 1] = step;
      return next;
    });
  }, []);

  // 4. Keyboard shortcut: Esc to go back 1 step
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        popStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [popStep]);

  // 5. Render current step component
  const renderAuthComponent = () => {
    switch (currentStep) {
      case 'signup':
        return (
          <SignUpStep
            agreedToTerms={agreedToTerms}
            onToggleAgreed={setAgreedToTerms}
            draft={signUpDraft}
            onDraftChange={setSignUpDraft}
            onSuccess={(email) => {
              if (email) setUserEmail(email);
              pushStep('verify_email');
            }}
            onSocialSuccess={(session) => {
              const status: SessionConfigStatus = {
                isAuthenticated: true,
                isConfigured: true,
                email: session?.email || userEmail,
                token: session?.token,
                displayName: session?.user_display_name,
                username: session?.username || undefined,
                avatarUrl: session?.avatar_url,
              };
              setSavedSession(status);
              onComplete?.(status);
            }}
            onNavigateToSignIn={() => replaceStep('signin')}
            onViewTerms={(tab) => {
              setLegalTab(tab || 'tos');
              pushStep('legal_terms');
            }}
          />
        );
      case 'signin':
        return (
          <LoginStep
            onSuccess={(session) => {
              const status: SessionConfigStatus = {
                isAuthenticated: true,
                isConfigured: true,
                email: session?.email || userEmail,
                token: session?.token,
                displayName: session?.user_display_name,
                username: session?.username || undefined,
                avatarUrl: session?.avatar_url,
              };
              setSavedSession(status);
              onComplete?.(status);
            }}
            onNavigateToSignUp={() => replaceStep('signup')}
            onNavigateToForgotPassword={() => pushStep('forgot_password')}
          />
        );
      case 'walkthrough':
        return (
          <WalkthroughSliderStep
            onFinish={() => {
              const status = savedSession || {
                isAuthenticated: true,
                isConfigured: true,
                email: userEmail,
              };
              onComplete?.(status);
            }}
          />
        );
      case 'forgot_password':
        return (
          <ForgotPasswordStep
            onSuccess={(email) => {
              if (email) setUserEmail(email);
              pushStep('reset_password');
            }}
            onNavigateToSignIn={() => replaceStep('signin')}
          />
        );
      case 'reset_password':
        return (
          <ResetPasswordStep
            email={userEmail}
            onSuccess={() => replaceStep('signin')}
            onNavigateToSignIn={() => replaceStep('signin')}
          />
        );
      case 'verify_email':
        return (
          <VerifyEmailStep
            email={userEmail || 'user@eris.local'}
            onSuccess={(session) => {
              const status: SessionConfigStatus = {
                isAuthenticated: true,
                isConfigured: true,
                email: session?.email || userEmail,
                token: session?.token,
                displayName: session?.user_display_name,
                username: session?.username || undefined,
                avatarUrl: session?.avatar_url,
              };
              setSavedSession(status);
              onComplete?.(status);
            }}
            onNavigateToSignIn={() => replaceStep('signin')}
            onEditEmail={() => replaceStep('signup')}
          />
        );
      case 'legal_terms':
        return (
          <LegalTermsStep
            initialTab={legalTab}
            onAccept={() => {
              setAgreedToTerms(true);
              popStep();
            }}
            onBack={() => popStep()}
          />
        );
      case 'workspace':
      default:
        return (
          <WorkspaceConfigStep
            onCreateAccount={() => pushStep('signup')}
            onSignIn={() => pushStep('signin')}
            onMeetTheTeam={() => setShowTeamModal(true)}
          />
        );
    }
  };

  const onboardingContent = (
    <div className="relative min-h-screen h-screen w-full bg-black overflow-hidden select-none">
      {/* Dynamic Meaningful Back Button with Esc Shortcut */}
      <div className="fixed top-5 left-5 sm:top-6 sm:left-6 z-[100]">
        <NavButton
          direction="left"
          label={navConfig.label}
          sublabel={navConfig.sublabel}
          variant="glass"
          size="sm"
          onClick={popStep}
        />
      </div>

      {/* Cinematic Entry with Smooth Animated Background Blur on Sub-Steps */}
      <ScrollExpand
        autoTrigger={isTriggered}
        src="/assets/onboarding_background.png"
        mediaType="image"
        title="ONBOARDING YOU NOW..."
        scrollHint=""
        startWidth={24}
        startHeight={32}
        startRadius={16}
        endRadius={0}
        mediaZoom={1.4}
        smoothing={0.12}
        overlayScrim={0.5}
        className="w-full h-full"
      >
        {/* Apple Vision Pro Style Blur Vignette Background Overlay */}
        <BlurVignette
          radius="0px"
          inset="0px"
          transitionLength={isSubStep ? '160px' : '90px'}
          blur={isSubStep ? '18px' : '10px'}
          classname="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden transform-gpu"
        >
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-700 ease-out"
            style={{
              backgroundColor: isSubStep ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.15)',
            }}
          />
          <BlurVignetteArticle classname="transition-all duration-700 ease-out" />
        </BlurVignette>

        {/* Center Auth / Workspace Component Container */}
        <div
          className={cn(
            'relative z-10 flex flex-col items-center justify-center min-h-full py-6 w-full mx-auto px-4 transition-all duration-300',
            currentStep === 'legal_terms'
              ? 'max-w-4xl lg:max-w-5xl xl:max-w-6xl'
              : 'max-w-sm sm:max-w-md md:max-w-lg'
          )}
        >
          {renderAuthComponent()}
        </div>
      </ScrollExpand>

      {/* Meet The Team Modal in Onboarding */}
      <MeetTheTeamModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        onEnterWorkspace={() => {
          setShowTeamModal(false);
          pushStep('signup');
        }}
        isDarkMode={true}
      />
    </div>
  );

  return onboardingContent;
};

export default OnboardingScreen;
