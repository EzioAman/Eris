import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import { SocialConnections } from '../../auth/SocialConnections';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../../ui/hover-card';
import { AlertCircle, Eye, EyeOff, Info, CheckCheck, X } from 'lucide-react';
import { validateSignUp, signUpAction, type SessionData } from '../authActions';

export interface SignUpStepProps {
  agreedToTerms?: boolean;
  onToggleAgreed?: (agreed: boolean) => void;
  draft?: { email: string; password: string };
  onDraftChange?: (draft: { email: string; password: string }) => void;
  onSuccess?: (email: string) => void;
  onSocialSuccess?: (session: SessionData) => void;
  onNavigateToSignIn: () => void;
  onViewTerms?: (tab?: 'tos' | 'privacy') => void;
}

// Password Requirements matching official security guidelines
const PASSWORD_REQUIREMENTS = [
  { regex: /.{8,}/, text: 'At least 8 characters' },
  { regex: /[0-9]/, text: 'At least 1 number' },
  { regex: /[a-z]/, text: 'At least 1 lowercase letter' },
  { regex: /[A-Z]/, text: 'At least 1 uppercase letter' },
  { regex: /[!-/:-@[-`{-~]/, text: 'At least 1 special character' },
] as const;

type StrengthScore = 0 | 1 | 2 | 3 | 4 | 5;

const STRENGTH_CONFIG = {
  colors: {
    0: 'text-neutral-400',
    1: 'text-red-400',
    2: 'text-orange-400',
    3: 'text-amber-400',
    4: 'text-emerald-400',
    5: 'text-emerald-400',
  } satisfies Record<StrengthScore, string>,
  texts: {
    0: 'Enter password',
    1: 'Weak (rejected)',
    2: 'Medium (rejected)',
    3: 'Fair (rejected)',
    4: 'Acceptable',
    5: 'Acceptable (Strong)',
  } satisfies Record<StrengthScore, string>,
} as const;

export const SignUpStep: React.FC<SignUpStepProps> = ({
  agreedToTerms = false,
  onToggleAgreed,
  draft,
  onDraftChange,
  onSuccess,
  onSocialSuccess,
  onNavigateToSignIn,
  onViewTerms,
}) => {
  const [email, setEmail] = useState(draft?.email || '');
  const [password, setPassword] = useState(draft?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Synchronize draft changes with parent
  const handleEmailChange = (val: string) => {
    setEmail(val);
    onDraftChange?.({ email: val, password });
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    onDraftChange?.({ email, password: val });
  };

  const calculateStrength = useMemo(() => {
    const requirements = PASSWORD_REQUIREMENTS.map((req) => ({
      met: req.regex.test(password),
      text: req.text,
    }));
    const score = requirements.filter((req) => req.met).length as StrengthScore;
    return {
      score,
      requirements,
      isAcceptable: score >= 4,
    };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Centralized validation function call
    const validation = validateSignUp({ email, password });
    if (!validation.isValid) {
      setError(validation.error || 'Invalid credentials.');
      return;
    }

    if (password.length > 0 && !calculateStrength.isAcceptable) {
      setError('Password does not meet required security standards. Please satisfy at least 4 criteria.');
      return;
    }

    if (!agreedToTerms) {
      setError('You must confirm you are 18+ and accept the Terms of Service, Disclaimer, and Privacy Policy to create an account.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 2. Centralized auth action call
      const res = await signUpAction({ email, password });
      if (res.ok) {
        // Persist informed consent record locally and to backend
        try {
          const consentPayload = {
            agreed: true,
            age_confirmed: true,
            version: '1.0.0',
            timestamp: new Date().toISOString(),
          };
          localStorage.setItem('eris_informed_consent_v1', JSON.stringify(consentPayload));
          fetch('/api/system/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(consentPayload),
          }).catch(() => {});
        } catch {
          // ignore
        }

        onSuccess?.(email.trim());
      } else {
        setError(res.message);
      }
    } catch {
      setError('Unable to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-in fade-in zoom-in-95 duration-300 font-sans">
      <Card className="border-white/15 bg-black/75 backdrop-blur-sm text-white shadow-2xl rounded-3xl p-5 sm:p-6">
        <CardHeader className="space-y-1 text-center p-0 pb-4">
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
            Create an account
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-neutral-400 font-light font-sans">
            Enter your email below to create your account
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3.5 p-0">
          {error && (
            <Alert variant="destructive" icon={AlertCircle} className="text-left font-sans">
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="grid gap-3 font-sans">
            <div className="grid gap-1.5 text-left">
              <Label htmlFor="signup-email" className="text-xs font-medium text-neutral-300 font-sans">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                autoComplete="email"
                required
                className="bg-black/30 border-white/10 text-white placeholder:text-neutral-500 rounded-xl h-10 focus-visible:ring-1 focus-visible:ring-cyan-400 font-sans"
              />
            </div>

            <div className="grid gap-1.5 text-left">
              <div className="flex justify-between items-center">
                <Label htmlFor="signup-password" className="text-xs font-medium text-neutral-300 font-sans">
                  Password
                </Label>
                <HoverCard openDelay={150} closeDelay={150}>
                  <HoverCardTrigger>
                    <div className="flex items-center gap-1 cursor-pointer">
                      <Info
                        size={15}
                        className={`transition-colors ${STRENGTH_CONFIG.colors[calculateStrength.score]}`}
                      />
                      <span className={`text-[11px] font-medium transition-colors ${STRENGTH_CONFIG.colors[calculateStrength.score]}`}>
                        {password.length > 0
                          ? STRENGTH_CONFIG.texts[calculateStrength.score]
                          : 'Requirements'}
                      </span>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent align="end" className="w-64 border-white/15 bg-black/95 p-3 text-xs font-sans shadow-2xl backdrop-blur-xl">
                    <div className="font-semibold text-white mb-2 text-xs">Password Requirements</div>
                    <ul className="space-y-1.5" aria-label="Password requirements">
                      {calculateStrength.requirements.map((req) => (
                        <li key={req.text} className="flex items-center space-x-2">
                          {req.met ? (
                            <CheckCheck size={14} className="text-emerald-400 shrink-0" />
                          ) : (
                            <X size={14} className="text-neutral-500 shrink-0" />
                          )}
                          <span className={`text-[11px] ${req.met ? 'text-emerald-400' : 'text-neutral-400'}`}>
                            {req.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </HoverCardContent>
                </HoverCard>
              </div>

              <div className="relative">
                <Input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  autoComplete="new-password"
                  required
                  className={`bg-black/30 border-white/10 text-white placeholder:text-neutral-500 rounded-xl h-10 pr-10 focus-visible:ring-1 focus-visible:ring-cyan-400 font-sans transition-colors ${
                    password.length > 0 && !calculateStrength.isAcceptable ? 'border-red-500/40' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* 5-Bar Strength Meter */}
              <div className="flex gap-1.5 w-full justify-between mt-1">
                <span className={`h-1 rounded-full w-full transition-colors duration-200 ${calculateStrength.score >= 1 ? (calculateStrength.isAcceptable ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-white/10'}`} />
                <span className={`h-1 rounded-full w-full transition-colors duration-200 ${calculateStrength.score >= 2 ? (calculateStrength.isAcceptable ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-white/10'}`} />
                <span className={`h-1 rounded-full w-full transition-colors duration-200 ${calculateStrength.score >= 3 ? (calculateStrength.isAcceptable ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-white/10'}`} />
                <span className={`h-1 rounded-full w-full transition-colors duration-200 ${calculateStrength.score >= 4 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                <span className={`h-1 rounded-full w-full transition-colors duration-200 ${calculateStrength.score >= 5 ? 'bg-emerald-500' : 'bg-white/10'}`} />
              </div>
            </div>

            {/* Terms of Service, Disclaimer and Privacy Policy Checkbox with 18+ Gate */}
            <div className="flex items-start gap-2 text-left pt-1 pb-1">
              <input
                id="signup-terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => onToggleAgreed?.(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 rounded border-white/20 bg-black/40 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-0 cursor-pointer shrink-0"
              />
              <label htmlFor="signup-terms" className="text-[11px] text-neutral-300 leading-normal select-none font-sans">
                I confirm I am <strong className="text-white font-semibold">18+</strong> and accept the{' '}
                <HoverCard openDelay={100} closeDelay={150}>
                  <HoverCardTrigger
                    onClick={(e) => {
                      e.preventDefault();
                      onViewTerms?.('tos');
                    }}
                    className="text-white underline underline-offset-4 hover:text-cyan-400 font-medium cursor-pointer"
                  >
                    Terms of Service
                  </HoverCardTrigger>
                  <HoverCardContent align="start" className="w-64 border-white/15 bg-black/95 p-3 text-xs font-sans shadow-2xl backdrop-blur-xl">
                    <div className="font-semibold text-white mb-1">Terms of Service &amp; Zero Liability</div>
                    <p className="text-[11px] text-neutral-400 leading-normal">
                      Autonomous tool execution with Human-in-the-Loop responsibility. Developer Aman Sinha and contributors bear zero liability to the maximum extent permitted by law.
                    </p>
                  </HoverCardContent>
                </HoverCard>
                {', '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onViewTerms?.('tos');
                  }}
                  className="text-white underline underline-offset-4 hover:text-cyan-400 font-medium cursor-pointer"
                >
                  Disclaimer
                </button>
                {', and '}
                <HoverCard openDelay={100} closeDelay={150}>
                  <HoverCardTrigger
                    onClick={(e) => {
                      e.preventDefault();
                      onViewTerms?.('privacy');
                    }}
                    className="text-white underline underline-offset-4 hover:text-cyan-400 font-medium cursor-pointer"
                  >
                    Privacy Policy
                  </HoverCardTrigger>
                  <HoverCardContent align="end" className="w-64 border-white/15 bg-black/95 p-3 text-xs font-sans shadow-2xl backdrop-blur-xl">
                    <div className="font-semibold text-white mb-1">Privacy Policy</div>
                    <p className="text-[11px] text-neutral-400 leading-normal">
                      Your data stays on your local device with no remote tracking.
                    </p>
                  </HoverCardContent>
                </HoverCard>
                .
              </label>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-10 mt-1">
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          {/* Clean RNR-style Separator */}
          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0b0e17] px-2 text-[11px] text-neutral-400 font-sans">
                Or continue with
              </span>
            </div>
          </div>

          <SocialConnections
            onSuccess={(session) => {
              onSocialSuccess?.(session);
            }}
            onError={(err) => setError(err)}
          />

          <div className="text-center text-xs text-neutral-400 mt-1 font-sans">
            Already have an account?{' '}
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={onNavigateToSignIn}
              className="text-white hover:text-cyan-400 font-medium underline underline-offset-4 p-0 h-auto font-sans"
            >
              Sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpStep;
