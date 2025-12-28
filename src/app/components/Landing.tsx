import { useState } from 'react';
import { Heart, Sparkles, Gift, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { AuthModal } from './AuthModal';
import { useAuth } from '../hooks/useAuth';

interface LandingProps {
  onGetStarted: () => void;
}

export function Landing({ onGetStarted }: LandingProps) {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleGetStarted = () => {
    if (user) {
      onGetStarted();
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-8 max-w-md">
        <div className="flex justify-center">
          <div className="relative">
            <Heart className="w-20 h-20 text-pink-500 fill-pink-500 animate-pulse" />
            <Heart className="w-12 h-12 text-purple-500 fill-purple-500 absolute -right-4 -top-2" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-5xl">Love Birds</h1>
          <p className="text-gray-600 text-lg">
            Build a stronger relationship through daily moments, thoughtful dates, and deeper understanding
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <Button 
            onClick={handleGetStarted}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-6"
          >
            {user ? 'Continue to App' : 'Start Your 7-Day Free Trial'}
          </Button>
          
          <p className="text-sm text-gray-500">
            Then $5/month per couple • No credit card required • Cancel anytime
          </p>
        </div>

        <AuthModal 
          open={showAuthModal} 
          onOpenChange={setShowAuthModal}
          onSuccess={onGetStarted}
        />

        <div className="grid grid-cols-2 gap-4 pt-8 text-left">
          <div className="space-y-2">
            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <h3 className="font-semibold text-sm">Daily Questions</h3>
            <p className="text-xs text-gray-600">Learn something new about each other every day</p>
          </div>
          
          <div className="space-y-2">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-sm">Tailored Dates</h3>
            <p className="text-xs text-gray-600">Personalized date ideas based on your preferences</p>
          </div>
          
          <div className="space-y-2">
            <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
              <Gift className="w-5 h-5 text-pink-600" />
            </div>
            <h3 className="font-semibold text-sm">Gift Guidance</h3>
            <p className="text-xs text-gray-600">Thoughtful gift ideas that truly matter</p>
          </div>
          
          <div className="space-y-2">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-sm">Never Forget</h3>
            <p className="text-xs text-gray-600">Track anniversaries and important dates</p>
          </div>
        </div>
      </div>
    </div>
  );
}