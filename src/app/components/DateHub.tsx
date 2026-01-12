import { ChevronLeft, Sparkles, Zap, Calendar, RotateCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface DateHubProps {
  onBack: () => void;
  onSelectMode: (mode: 'personalized' | 'challenge' | 'spinner') => void;
  partnerName: string;
}

export function DateHub({ onBack, onSelectMode, partnerName }: DateHubProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
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
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl">Date Night</h1>
              <p className="text-white/90 text-sm">
                Choose how you'd like to plan your next date
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6 space-y-4">
        {/* Personalized Suggestions */}
        <Card
          onClick={() => onSelectMode('personalized')}
          className="p-6 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-50 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1 text-lg">Plan a Date</h3>
              <p className="text-sm text-gray-600 mb-3">
                Get personalized date suggestions based on your preferences
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                  Quick & Easy
                </span>
                <span className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded-full">
                  Personalized
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Challenge Us */}
        <Card
          onClick={() => onSelectMode('challenge')}
          className="p-6 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group bg-gradient-to-r from-orange-50 to-yellow-50"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-50 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1 text-lg flex items-center gap-2">
                Random Challenge
                <span className="text-xs px-2 py-1 bg-orange-200 text-orange-700 rounded-full">NEW</span>
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Take on a spontaneous date challenge that you can't back out of!
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                  Spontaneous
                </span>
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                  No backing out!
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Decision Spinner */}
        <Card
          onClick={() => onSelectMode('spinner')}
          className="p-6 border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer group bg-gradient-to-r from-blue-50 to-cyan-50"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-180 transition-all duration-500">
              <RotateCw className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1 text-lg">
                Decision Spinner
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Can't decide? Customize your options and let the spinner choose for you!
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                  Customizable
                </span>
                <span className="text-xs px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full">
                  Fun & Easy
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 border-0">
          <p className="text-sm text-center text-gray-600">
            💡 All date ideas are personalized based on your preferences, budget, and {partnerName}'s interests
          </p>
        </Card>
      </div>
    </div>
  );
}
