import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateOtp, verifyOtpAction, requestOtpAction } from '../authActions';

export interface VerifyEmailStepProps {
  email?: string;
  onSuccess?: (session?: any) => void;
  onNavigateToSignIn: () => void;
  onEditEmail?: () => void;
}

const RESEND_CODE_INTERVAL_SECONDS = 30;

export const VerifyEmailStep: React.FC<VerifyEmailStepProps> = ({
  email = 'm@example.com',
  onSuccess,
  onNavigateToSignIn,
  onEditEmail,
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_CODE_INTERVAL_SECONDS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Centralized OTP validation
    const validation = validateOtp(code);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter the 6-digit code.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 2. Centralized OTP verify action
      const res = await verifyOtpAction(email, code);
      if (res.ok) {
        onSuccess?.(res.data);
      } else {
        setError(res.message);
      }
    } catch {
      setError('Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError(null);
    setCountdown(RESEND_CODE_INTERVAL_SECONDS);
    try {
      const res = await requestOtpAction(email);
      setResendStatus(res.message || 'A fresh verification code has been dispatched.');
    } catch {
      setResendStatus('A fresh verification code has been dispatched.');
    }
    setTimeout(() => setResendStatus(null), 4000);
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-in fade-in zoom-in-95 duration-300 font-sans">
      <Card className="border-white/15 bg-black/75 backdrop-blur-sm text-white shadow-2xl rounded-3xl p-5 sm:p-6">
        <CardHeader className="space-y-1 text-center sm:text-left p-0 pb-4">
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
            Verify your email
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-neutral-400 font-light font-sans">
            Enter the verification code sent to <span className="text-white font-medium">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 p-0">
          {error && (
            <Alert variant="destructive" icon={AlertCircle} className="text-left font-sans">
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {resendStatus && (
            <Alert variant="success" icon={CheckCircle2} className="text-left font-sans">
              <AlertTitle>Code Sent</AlertTitle>
              <AlertDescription>{resendStatus}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="grid gap-4 font-sans">
            <div className="grid gap-1.5 text-left">
              <Label htmlFor="code" className="text-xs font-medium text-neutral-300 font-sans">
                Verification code
              </Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="bg-black/30 border-white/10 text-white placeholder:text-neutral-500 rounded-xl h-11 text-center text-lg font-mono tracking-[0.25em] focus-visible:ring-1 focus-visible:ring-cyan-400 font-sans"
                required
              />
              <div className="pt-0.5">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  disabled={countdown > 0}
                  onClick={handleResend}
                  className="text-xs text-neutral-400 hover:text-white p-0 h-auto font-sans justify-center sm:justify-start"
                >
                  Didn&apos;t receive the code? Resend{' '}
                  {countdown > 0 ? (
                    <span className="tabular-nums ml-1">({countdown})</span>
                  ) : null}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <Button type="submit" disabled={loading} className="w-full h-11 font-semibold font-sans">
                {loading ? 'Verifying...' : 'Continue'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 font-medium text-neutral-300 hover:text-white font-sans"
                onClick={onNavigateToSignIn}
              >
                Back to sign in
              </Button>

              {onEditEmail && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onEditEmail}
                  className="text-xs text-neutral-400 hover:text-white font-sans mx-auto"
                >
                  Change email address
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailStep;
