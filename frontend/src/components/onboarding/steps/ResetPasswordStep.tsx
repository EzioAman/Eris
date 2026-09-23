import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateResetPassword, resetPasswordAction } from '../authActions';

export interface ResetPasswordStepProps {
  email?: string;
  onSuccess?: () => void;
  onNavigateToSignIn: () => void;
}

export const ResetPasswordStep: React.FC<ResetPasswordStepProps> = ({
  email,
  onSuccess,
  onNavigateToSignIn,
}) => {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || code.trim().length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    // 1. Centralized validation
    const validation = validateResetPassword({ password, confirmPassword });
    if (!validation.isValid) {
      setError(validation.error || 'Invalid password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 2. Centralized reset password action with OTP verification
      const res = await resetPasswordAction({ email, code, password, confirmPassword });
      if (res.ok) {
        setIsSuccess(true);
        onSuccess?.();
      } else {
        setError(res.message);
      }
    } catch {
      setError('Unable to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-in fade-in zoom-in-95 duration-300">
      <Card className="border-white/15 bg-black/75 backdrop-blur-sm text-white shadow-2xl rounded-3xl p-6 sm:p-8">
        <CardHeader className="space-y-1 text-center p-0 pb-6">
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Reset password
          </CardTitle>
          <CardDescription className="text-sm text-neutral-400 font-light">
            Enter your new password below
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 p-0">
          {error && (
            <Alert variant="destructive" icon={AlertCircle}>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isSuccess ? (
            <div className="grid gap-4">
              <Alert variant="success" icon={CheckCircle2}>
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>
                  Your password has been successfully reset.
                </AlertDescription>
              </Alert>

              <Button onClick={onNavigateToSignIn} className="w-full">
                Sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2 text-left">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reset-code">Verification Code</Label>
                  {email && <span className="text-[11px] text-neutral-400 font-mono">{email}</span>}
                </div>
                <Input
                  id="reset-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                  className="bg-black/30 border-white/10 text-white placeholder:text-neutral-500 rounded-xl h-11 text-center font-mono tracking-widest text-lg focus-visible:ring-1 focus-visible:ring-cyan-400"
                />
              </div>

              <div className="grid gap-2 text-left">
                <Label htmlFor="reset-password">New Password</Label>
                <Input
                  id="reset-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="bg-black/30 border-white/10 text-white placeholder:text-neutral-500 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-cyan-400"
                />
              </div>

              <div className="grid gap-2 text-left">
                <Label htmlFor="reset-confirm-password">Confirm Password</Label>
                <Input
                  id="reset-confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="bg-black/30 border-white/10 text-white placeholder:text-neutral-500 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-cyan-400"
                />
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                <Button type="submit" disabled={loading} className="w-full h-11 font-semibold font-sans">
                  {loading ? 'Updating password...' : 'Reset password'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 font-medium text-neutral-300 hover:text-white font-sans"
                  onClick={onNavigateToSignIn}
                >
                  Back to sign in
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordStep;
