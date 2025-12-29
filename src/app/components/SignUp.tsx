import { useState, useEffect } from 'react';
import { Heart, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { toast } from 'sonner';

interface SignUpProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function SignUp({ onSuccess, onBack }: SignUpProps) {
  const { signUp, user, loading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await signUp(email, password, name);
      toast.success('Account created successfully!');
      setSignUpSuccess(true);
      // Don't redirect immediately - wait for user session to be established
      // Keep loading state until user session is ready
    } catch (error: any) {
      console.error('Sign up error:', error);
      const errorMessage = error.message || 'Failed to create account';
      toast.error(errorMessage.split('\n')[0] || 'Failed to create account');
      setIsLoading(false);
      setSignUpSuccess(false);
    }
  };

  // Wait for user session to be established after sign-up
  useEffect(() => {
    if (signUpSuccess && user && !authLoading) {
      // Verify session exists before redirecting
      const checkSession = async () => {
        try {
          const session = await authService.getSession();
          if (session) {
            // Session is available, wait a moment then redirect
            setIsLoading(false);
            setTimeout(() => {
              onSuccess();
            }, 1500);
          } else {
            // No session yet, wait and check again
            setTimeout(checkSession, 500);
          }
        } catch (error) {
          console.error('Error checking session:', error);
          // If error checking session, wait a bit longer and try redirect anyway
          setIsLoading(false);
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      };
      
      checkSession();
    }
  }, [signUpSuccess, user, authLoading, onSuccess]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        <div className="flex justify-center">
          <Heart className="w-16 h-16 text-pink-500 fill-pink-500" />
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-lg">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Create your account</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={isLoading}
                  className="text-base"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled={isLoading}
                  className="text-base"
                  required
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
                  className="text-base"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="text-base"
                  required
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-6 text-lg"
              >
                {isLoading ? 'Creating Account...' : 'Start My Free Trial'}
              </Button>

              <p className="text-center text-sm text-gray-600">
                Your 7-day free trial starts today.
              </p>
            </form>

            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                onClick={onBack}
                className="w-full flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </div>

            <p className="text-center text-xs text-gray-500">
              By continuing, you agree to our Terms & Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

