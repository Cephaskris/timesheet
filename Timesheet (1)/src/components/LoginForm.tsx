import { useState } from 'react';
import { ArrowLeft, LogIn } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert } from './ui/alert';
import { supabase } from '../utils/supabase/client';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onBack: () => void;
  onSignup: () => void;
}

export function LoginForm({ onLogin, onBack, onSignup }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await onLogin(email, password);
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setResetEmailSent(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setForgotPasswordMode(false);
    setResetEmailSent(false);
    setError('');
    setEmail('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full glass-strong rounded-2xl shadow-glow-purple p-6 sm:p-8 border border-white/10">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4 sm:mb-6 text-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            {forgotPasswordMode ? 'Reset Password' : 'Welcome Back'}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {forgotPasswordMode ? 'Enter your email to receive a reset link' : 'Sign in to your account'}
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            {error}
          </Alert>
        )}

        {resetEmailSent ? (
          <div className="space-y-6">
            <Alert className="mb-6 bg-green-500/10 border-green-500/20 text-green-400">
              A password reset email has been sent to <strong>{email}</strong>. Please check your inbox.
            </Alert>
            <div className="text-center">
              <button
                onClick={handleBackToLogin}
                className="text-primary hover:underline font-medium"
              >
                ← Back to login
              </button>
            </div>
          </div>
        ) : forgotPasswordMode ? (
          <>
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full shadow-glow-purple"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  'Send Reset Email'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <button
                onClick={handleBackToLogin}
                className="text-muted-foreground hover:text-primary font-medium"
              >
                ← Back to login
              </button>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordMode(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full shadow-glow-purple"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Don't have an account?{' '}
                <button
                  onClick={onSignup}
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}