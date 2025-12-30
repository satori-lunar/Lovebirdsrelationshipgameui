import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { useAuth } from '../hooks/useAuth';
import { relationshipService } from '../services/relationshipService';
import { toast } from 'sonner';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  signInOnly?: boolean;
}

export function AuthModal({ open, onOpenChange, onSuccess, signInOnly = false }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(!signInOnly);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [hasInviteCode, setHasInviteCode] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, signIn, user } = useAuth();

  // Close modal and call onSuccess when user is authenticated
  useEffect(() => {
    if (user && open) {
      // Connect with partner if invite code was provided during signup
      const connectPartner = async () => {
        if (pendingInviteCode && user?.id) {
          try {
            // Get fresh session to ensure we have the latest user data
            const session = await authService.getSession();
            if (session?.user?.id) {
              await relationshipService.connectPartner(pendingInviteCode, session.user.id);
              toast.success('Successfully connected with your partner!');
            }
          } catch (inviteError: any) {
            console.error('Failed to connect partner:', inviteError);
            toast.error(inviteError.message || 'Failed to connect with partner. You can try connecting later in Settings.');
          }
          setPendingInviteCode(null);
        }
      };

      connectPartner();

      // User is now authenticated, wait a moment to show success message, then close modal
      const timer = setTimeout(() => {
        setEmail('');
        setPassword('');
        setName('');
        setInviteCode('');
        setHasInviteCode(false);
        onOpenChange(false);
        onSuccess();
      }, 1500); // Give user time to see success message

      return () => clearTimeout(timer);
    }
  }, [user, open, onOpenChange, onSuccess, pendingInviteCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (isSignUp && !name) {
      toast.error('Please enter your name');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const finalInviteCode = hasInviteCode ? inviteCode.trim().toUpperCase() : null;
        await signUp(email, password, name);
        toast.success('Account created successfully!');
        if (finalInviteCode) {
          setPendingInviteCode(finalInviteCode);
          toast.info('Connecting with your partner...');
        }
        // Don't close modal here - let useEffect handle it when user state updates
        // This allows for automatic sign-in if email confirmation is disabled
      } else {
        await signIn(email, password);
        toast.success('Signed in successfully!');
        // For sign in, user state should update immediately
        // useEffect will handle closing the modal
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      const errorMessage = error.message || 'Authentication failed';
      // Show error message, handling multi-line messages
      toast.error(errorMessage.split('\n')[0] || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isSignUp ? 'Create Account' : 'Sign In'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                disabled={isLoading}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          {/* Partner Invite Code Section - Only for Sign Up */}
          {isSignUp && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Join your partner?</Label>
                <button
                  type="button"
                  onClick={() => setHasInviteCode(!hasInviteCode)}
                  className="text-sm text-pink-600 hover:text-pink-700"
                >
                  {hasInviteCode ? 'Cancel' : 'I have a code'}
                </button>
              </div>

              {hasInviteCode && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <Label htmlFor="inviteCode" className="text-sm">Partner's Invite Code</Label>
                  <Input
                    id="inviteCode"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Enter 8-character code"
                    disabled={isLoading}
                    className="font-mono text-center"
                    maxLength={8}
                  />
                </div>
              )}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
          >
            {isLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
          {!signInOnly && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

