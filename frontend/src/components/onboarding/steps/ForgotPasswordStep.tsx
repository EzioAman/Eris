import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { validateForgotPassword, forgotPasswordAction } from '../authActions';

export interface ForgotPasswordStepProps {
  onSuccess?: (email: string) => void;
  onNavigateToSignIn: () => void;
}

export const ForgotPasswordStep: React.FC<ForgotPasswordStepProps> = ({
  onSuccess,
  onNavigateToSignIn,
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Centralized validation
    const validation = validateForgotPassword(email);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a valid email.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 2. Centralized forgot password action
      const res = await forgotPasswordAction(email);
      if (res.ok) {
        setIsSent(true);
      } else {
        setError(res.message);
      }
    } catch {
      setError('Unable to process recovery request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-in fade-in zoom-in-95 duration-300">
      <Card className="border-white/15 bg-black/75 backdrop-blur-sm text-white shadow-2xl rounded-3xl p-6 sm:p-8">
        <CardHeader className="space-y-1 text-center p-0 pb-6">
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Forgot password
          </CardTitle>
          <CardDescription className="text-sm text-neutral-400 font-light">
            Enter your email address and we will send you a verification code
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4 p-0">
          {error && (
            <Alert variant="destructive" icon={AlertCircle}>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isSent ? (
            <div className="grid gap-4">
              <Alert variant="success" icon={CheckCircle2}>
                <AlertTitle>Code Sent</AlertTitle>
                <AlertDescription>
                  Check your email for the verification code.
                </AlertDescription>
              </Alert>

              <Button onClick={() => onSuccess?.(email)} className="w-full h-11 font-semibold font-sans">
                Enter reset code
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
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 font-sans">
              <div className="grid gap-1.5 text-left">
                <Label htmlFor="forgot-email" className="text-xs font-medium text-neutral-300 font-sans">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="bg-black/30 border-white/10 text-white placeholder:text-neutral-500 rounded-xl h-11 focus-visible:ring-1 focus-visible:ring-cyan-400 font-sans"
                />
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                <Button type="submit" disabled={loading} className="w-full h-11 font-semibold font-sans">
                  {loading ? 'Sending code...' : 'Send reset code'}
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

export default ForgotPasswordStep;
