import { Heart } from 'lucide-react';
import { Button } from './ui/button';

interface EntryChoiceProps {
  onSignIn: () => void;
  onFirstTime: () => void;
}

export function EntryChoice({ onSignIn, onFirstTime }: EntryChoiceProps) {
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
          <h1 className="text-5xl font-bold">Welcome to Lovebirds 💕</h1>
          <p className="text-gray-600 text-lg">
            Built to help you show love in ways that truly matter.
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <Button 
            onClick={onSignIn}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-6 text-lg"
          >
            Sign In
          </Button>
          
          <Button 
            onClick={onFirstTime}
            variant="outline"
            className="w-full border-2 border-pink-300 hover:bg-pink-50 text-pink-700 py-6 text-lg"
          >
            First Time Here
          </Button>
        </div>

        <p className="text-xs text-gray-500 pt-4">
          No pressure — you can explore before committing.
        </p>
      </div>
    </div>
  );
}

