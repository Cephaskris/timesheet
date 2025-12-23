import { useState } from 'react';
import { ArrowLeft, UserPlus, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface SignupFormProps {
  onSignup: (email: string, password: string, name: string, organizationName: string, inviteCode?: string) => Promise<{ success: boolean; error?: string }>;
  onBack: () => void;
  onLogin: () => void;
}

export function SignupForm({ onSignup, onBack, onLogin }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [verifiedOrg, setVerifiedOrg] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupType, setSignupType] = useState<'create' | 'join'>('create');

  const verifyInviteCodeNew = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setVerifying(true);
    setError('');
    setVerifiedOrg(null);

    try {
      const code = inviteCode.trim().toUpperCase();
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-3af6643f/verify-invite-code/${code}`;
      console.log('Verifying invite code:', code);
      console.log('Verification URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      console.log('Response status:', response.status);
      
      const result = await response.json();
      console.log('Verification result:', result);

      if (result.valid) {
        setVerifiedOrg(result.organizationName);
        setError('');
      } else {
        setError(result.error || 'Invalid invite code');
        setVerifiedOrg(null);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('Failed to verify invite code. Please try again.');
      setVerifiedOrg(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (signupType === 'join' && !verifiedOrg) {
        setError('Please verify your invite code first');
        setLoading(false);
        return;
      }

      const result = await onSignup(
        email, 
        password, 
        name, 
        signupType === 'create' ? organizationName : '', 
        signupType === 'join' ? inviteCode.trim().toUpperCase() : undefined
      );
      
      if (!result.success) {
        setError(result.error || 'Signup failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
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
            Create Account
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">Get started with GrangerPR Timesheet</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            {error}
          </Alert>
        )}

        <Tabs value={signupType} onValueChange={(v) => setSignupType(v as 'create' | 'join')} className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="text-xs sm:text-sm">Create Organization</TabsTrigger>
            <TabsTrigger value="join" className="text-xs sm:text-sm">Join Organization</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              disabled={loading}
            />
          </div>

          <div>
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

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          {signupType === 'create' && (
            <div>
              <Label htmlFor="organization">Organization Name</Label>
              <Input
                id="organization"
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Your Company Name"
                required
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground mt-1">
                You'll be the admin of this organization
              </p>
            </div>
          )}

          {signupType === 'join' && (
            <div>
              <Label htmlFor="inviteCode">Invite Code</Label>
              <div className="flex gap-2">
                <Input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    setVerifiedOrg(null);
                  }}
                  placeholder="XXXXXXXX"
                  required
                  disabled={loading || verifying}
                  className="uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={verifyInviteCodeNew}
                  disabled={loading || verifying || !inviteCode.trim()}
                >
                  {verifying ? 'Verifying...' : 'Verify'}
                </Button>
              </div>
              {verifiedOrg && (
                <div className="mt-2 flex items-center gap-2 text-green-500 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Valid code for: {verifiedOrg}</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Enter the invite code provided by your organization admin
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full shadow-glow-purple"
            disabled={loading || (signupType === 'join' && !verifiedOrg)}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating account...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Account
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground">
            Already have an account?{' '}
            <button
              onClick={onLogin}
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}