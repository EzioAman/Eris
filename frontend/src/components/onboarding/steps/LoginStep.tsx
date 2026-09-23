import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import { SocialConnections } from '../../auth/SocialConnections';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { AlertCircle, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { validateSignIn, signInAction, type SessionData } from '../authActions';

export interface LoginStepProps {
  onSuccess?: (session?: SessionData) => void;
  onNavigateToSignUp: () => void;
  onNavigateToForgotPassword: () => void;
}

export const LoginStep: React.FC<LoginStepProps> = ({
  onSuccess,
  onNavigateToSignUp,
  onNavigateToForgotPassword,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Centralized validation
    const validation = validateSignIn({ email, password });
    if (!validation.isValid) {
      setError(validation.error || 'Invalid credentials.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // 2. Centralized auth action
      const res = await signInAction({ email, password });
      if (res.ok) {
        setSuccessMsg(res.message || 'Signed in successfully! Entering session...');
        setTimeout(() => {
          onSuccess?.(res.data);
        }, 900);
      } else {
        setError(res.message);
      }
    } catch {
      setError('Unable to sign in. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto animate-in fade-in zoom-in-95 duration-300 font-sans">
      <Card className="border-white/15 bg-black/75 backdrop-blur-sm text-white shadow-2xl rounded-3xl p-5 sm:p-6">
        <CardHeader className="space-y-1 text-center p-0 pb-4">
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
            Sign in
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-neutral-400 font-light font-sans">
            Enter your email below to sign in to your account
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-3.5 p-0">
          {error && (
            <Alert variant="destructive" icon={AlertCircle} className="text-left font-sans">
              <AlertTitle>Action Required</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-sans text-xs animate-in fade-in slide-in-from-top-1">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-3 font-sans">
            <div className="grid gap-1.5 text-left">
              <Label htmlFor="signin-email" className="text-xs font-medium text-neutral-300 font-sans">Email</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="bg-black/30 border-white/10 text-white placeholder:text-neutral-500 rounded-xl h-10 focus-visible:ring-1 focus-visible:ring-cyan-400 font-sans"
              />
            </div>

            <div className="grid gap-1.5 text-left">
              <div className="flex items-center justify-between">
                <Label htmlFor="signin-password" className="text-xs font-medium text-neutral-300 font-sans">Password</Label>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={onNavigateToForgotPassword}
                  className="text-xs text-neutral-400 hover:text-cyan-400 font-normal p-0 h-auto font-sans"
                >
                  Forgot password?
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="bg-black/30 border-white/10 text-white placeholder:text-neutral-500 rounded-xl h-10 pr-10 focus-visible:ring-1 focus-visible:ring-cyan-400 font-sans"
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
            </div>

            <Button
              type="submit"
              disabled={loading || Boolean(successMsg)}
              className="w-full h-10 mt-1 flex items-center justify-center gap-2 bg-white text-black hover:bg-neutral-200 font-medium transition-all cursor-pointer disabled:opacity-75"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : successMsg ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Signed in successfully!</span>
                </>
              ) : (
                'Sign in'
              )}
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
              setSuccessMsg(`Signed in with ${session.email}! Entering session...`);
              setTimeout(() => {
                onSuccess?.(session);
              }, 700);
            }}
            onError={(err) => setError(err)}
          />

          <div className="text-center text-xs text-neutral-400 mt-1 font-sans">
            Don't have an account?{' '}
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={onNavigateToSignUp}
              className="text-white hover:text-cyan-400 font-medium underline underline-offset-4 p-0 h-auto font-sans"
            >
              Sign up
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginStep;
