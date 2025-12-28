import { ChevronLeft, Camera, Lock, Sparkles, Image, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface MemoriesProps {
  onBack: () => void;
}

export function Memories({ onBack }: MemoriesProps) {
  const isPremium = false; // Mock state

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-12">
          <div className="max-w-md mx-auto">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 mb-6 hover:opacity-80"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <h1 className="text-2xl">Memories</h1>
            </div>
            <p className="text-white/90 text-sm">
              Save and cherish your moments together
            </p>
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 -mt-6">
          {/* Feature Showcase */}
          <Card className="p-8 mb-6 border-0 shadow-lg text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Camera className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl mb-3">Your Relationship Scrapbook</h2>
            <p className="text-gray-600 mb-6">
              Save photos, write reflections, and create a beautiful timeline of your journey together
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 text-left">
                <Image className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Save Unlimited Photos</p>
                  <p className="text-xs text-gray-600">Keep all your special moments in one place</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-left">
                <Heart className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Journal Your Thoughts</p>
                  <p className="text-xs text-gray-600">Add personal reflections to each memory</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-left">
                <Sparkles className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Tag Special Occasions</p>
                  <p className="text-xs text-gray-600">First date, anniversaries, vacations & more</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-left">
                <Lock className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Private & Shared</p>
                  <p className="text-xs text-gray-600">Choose what to keep private or share with your partner</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl mb-6">
              <p className="text-sm">
                Unlike social media, this is just for you two. No likes, no comments, no pressure - just your authentic moments.
              </p>
            </div>

            <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-6">
              Unlock Memories - $4.99/month
            </Button>
            
            <p className="text-xs text-gray-500 mt-3">
              7-day free trial included • Cancel anytime
            </p>
          </Card>

          {/* Example Preview */}
          <div className="space-y-4">
            <h3 className="font-semibold text-center text-gray-700">What it looks like</h3>
            
            <div className="relative">
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 rounded-2xl flex items-center justify-center">
                <div className="text-center p-6">
                  <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Unlock to start saving memories</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 opacity-30">
                <Card className="aspect-square bg-gradient-to-br from-pink-200 to-purple-200 border-0" />
                <Card className="aspect-square bg-gradient-to-br from-purple-200 to-pink-200 border-0" />
                <Card className="aspect-square bg-gradient-to-br from-pink-300 to-purple-300 border-0" />
                <Card className="aspect-square bg-gradient-to-br from-purple-300 to-pink-300 border-0" />
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <Card className="p-6 mt-6 bg-white border-0 shadow-md">
            <div className="space-y-4">
              <div className="flex gap-1 mb-2">
                {[1,2,3,4,5].map(i => (
                  <Heart key={i} className="w-4 h-4 fill-pink-500 text-pink-500" />
                ))}
              </div>
              <p className="text-sm italic text-gray-700">
                "The Memories feature is our favorite! We look back at our photos and notes from past dates. It's like our own private Instagram just for us."
              </p>
              <p className="text-xs text-gray-500">- Sarah & Mike, together 3 years</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Premium view (when user has subscription)
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 mb-6 hover:opacity-80"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl">Memories</h1>
                <p className="text-white/90 text-sm">24 memories saved</p>
              </div>
            </div>
            <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
              <Camera className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* This would show the actual memories grid */}
        <p className="text-center text-gray-500 py-12">Premium memories view would go here</p>
      </div>
    </div>
  );
}
