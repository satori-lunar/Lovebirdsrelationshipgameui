import { useState } from 'react';
import { Heart, Sparkles, ChevronLeft, BookmarkPlus, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { usePartnerOnboarding } from '../hooks/usePartnerOnboarding';

interface LoveLanguageSuggestionsProps {
  onBack: () => void;
  partnerName: string;
}

const suggestions = [
  {
    id: 1,
    title: "Write a Short Love Letter",
    description: "Put your feelings into words. Leave it somewhere they'll find it - in their bag, on the mirror, or their pillow.",
    timeEstimate: "15 minutes",
    difficulty: "Easy",
    loveLanguage: "Words of Affirmation"
  },
  {
    id: 2,
    title: "Create an Affirmation Scavenger Hunt",
    description: "Hide 5-7 notes around your home or their workspace, each with a specific thing you love about them. Make the last clue lead to a small treat or your waiting arms.",
    timeEstimate: "30 minutes",
    difficulty: "Medium",
    loveLanguage: "Words of Affirmation"
  },
  {
    id: 3,
    title: "Flowers with a Handwritten Thank-You",
    description: "Pick up their favorite flowers and attach a handwritten note thanking them for specific things they've done recently.",
    timeEstimate: "20 minutes",
    difficulty: "Easy",
    loveLanguage: "Words of Affirmation"
  }
];

export function LoveLanguageSuggestions({ onBack, partnerName }: LoveLanguageSuggestionsProps) {
  const [saved, setSaved] = useState<number[]>([]);
  const [completed, setCompleted] = useState<number[]>([]);
  const { partnerLoveLanguages, isLoading } = usePartnerOnboarding();

  const toggleSave = (id: number) => {
    setSaved(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleComplete = (id: number) => {
    setCompleted(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Get partner's primary love language
  const primaryLoveLanguage = partnerLoveLanguages?.primary ||
                              partnerLoveLanguages?.all?.[0] ||
                              'Words of Affirmation';

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
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <h1 className="text-2xl">This Week's Suggestions</h1>
          </div>
          <p className="text-white/90 text-sm">
            Ways to love {partnerName} better
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* Partner's Love Languages */}
        <Card className="p-5 mb-4 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            {partnerName}'s Love Languages
          </h3>
          {isLoading ? (
            <p className="text-sm text-gray-600">Loading...</p>
          ) : (
            <div className="space-y-2">
              {partnerLoveLanguages?.primary && (
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full font-semibold">
                    Primary
                  </span>
                  <span className="text-sm font-semibold">{partnerLoveLanguages.primary}</span>
                </div>
              )}
              {partnerLoveLanguages?.secondary && (
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full font-semibold">
                    Secondary
                  </span>
                  <span className="text-sm">{partnerLoveLanguages.secondary}</span>
                </div>
              )}
              {!partnerLoveLanguages?.primary && !partnerLoveLanguages?.secondary && partnerLoveLanguages?.all && partnerLoveLanguages.all.length > 0 && (
                <div className="space-y-1">
                  {partnerLoveLanguages.all.map((lang, idx) => (
                    <div key={idx} className="text-sm">• {lang}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Info Card */}
        <Card className="p-4 mb-6 bg-white/90 backdrop-blur-sm border-0 shadow-lg">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm">
                Based on {partnerName}'s love language: <span className="font-semibold">{primaryLoveLanguage}</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Choose one, save for later, or ignore - no pressure! 💛
              </p>
            </div>
          </div>
        </Card>

        {/* Suggestions */}
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="p-6 border-0 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{suggestion.title}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                      {suggestion.timeEstimate}
                    </span>
                    <span className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded-full">
                      {suggestion.difficulty}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => toggleSave(suggestion.id)}
                  className={`flex-shrink-0 ml-3 ${
                    saved.includes(suggestion.id) ? 'text-pink-500' : 'text-gray-300'
                  }`}
                >
                  <BookmarkPlus className="w-6 h-6" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {suggestion.description}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => toggleComplete(suggestion.id)}
                  className={`flex-1 ${
                    completed.includes(suggestion.id)
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600'
                  } text-white`}
                >
                  {completed.includes(suggestion.id) ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Completed!
                    </>
                  ) : (
                    "I'll Do This"
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Saved Count */}
        {saved.length > 0 && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
              <BookmarkPlus className="w-4 h-4 text-pink-500" />
              <span className="text-sm">
                {saved.length} saved for later
              </span>
            </div>
          </div>
        )}

        {/* Next Week Preview */}
        <Card className="p-6 mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border-0">
          <div className="text-center space-y-2">
            <Sparkles className="w-8 h-8 text-purple-600 mx-auto" />
            <h3 className="font-semibold">New suggestions every week</h3>
            <p className="text-sm text-gray-600">
              Come back next Monday for fresh ideas tailored to {partnerName}'s preferences
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}