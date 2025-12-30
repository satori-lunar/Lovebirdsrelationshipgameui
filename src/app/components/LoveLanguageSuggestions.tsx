import { Heart, Sparkles, ChevronLeft, BookmarkPlus, Check, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { usePartnerOnboarding } from '../hooks/usePartnerOnboarding';
import { useSuggestions } from '../hooks/useSuggestions';

interface LoveLanguageSuggestionsProps {
  onBack: () => void;
  partnerName: string;
}

export function LoveLanguageSuggestions({ onBack, partnerName }: LoveLanguageSuggestionsProps) {
  const { partnerLoveLanguages, partnerOnboarding } = usePartnerOnboarding();

  // Use personalized suggestions from the service
  const {
    suggestions,
    isLoading,
    personalizationTier,
    markAsSaved,
    markAsCompleted,
    unmarkAsSaved,
    unmarkAsCompleted,
    refresh,
    isRefreshing,
  } = useSuggestions({ category: 'love_language' });

  // Toggle functions for saved/completed
  const toggleSave = (suggestionId: string, currentlySaved: boolean) => {
    if (currentlySaved) {
      unmarkAsSaved(suggestionId);
    } else {
      markAsSaved(suggestionId);
    }
  };

  const toggleComplete = (suggestionId: string, currentlyCompleted: boolean) => {
    if (currentlyCompleted) {
      unmarkAsCompleted(suggestionId);
    } else {
      markAsCompleted(suggestionId);
    }
  };

  // Get partner's primary love language
  const primaryLoveLanguage = partnerLoveLanguages?.primary ||
                              partnerLoveLanguages?.all?.[0] ||
                              'Words of Affirmation';

  const hasLoveLanguageData = partnerLoveLanguages?.primary ||
                              partnerLoveLanguages?.secondary ||
                              (partnerLoveLanguages?.all && partnerLoveLanguages.all.length > 0);

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
          ) : hasLoveLanguageData ? (
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
          ) : (
            <div className="text-sm text-gray-600">
              <p>Love language not set yet.</p>
              <p className="text-xs mt-1">Ask {partnerName} to complete their onboarding to see their love languages here!</p>
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

        {/* Refresh Button */}
        <div className="mb-4 flex justify-end">
          <Button
            onClick={refresh}
            disabled={isRefreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Get New Suggestions'}
          </Button>
        </div>

        {/* Suggestions */}
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="p-6 border-0 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{suggestion.metadata?.title || suggestion.suggestion_type}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                      {suggestion.time_estimate}
                    </span>
                    <span className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded-full">
                      {suggestion.difficulty}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleSave(suggestion.id, suggestion.saved)}
                  className={`flex-shrink-0 ml-3 ${
                    suggestion.saved ? 'text-pink-500' : 'text-gray-300'
                  }`}
                >
                  <BookmarkPlus className="w-6 h-6" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {suggestion.suggestion_text}
              </p>

              {/* Why this suggestion */}
              {suggestion.data_sources?.reason && (
                <div className="mb-3 p-2 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-700 italic">
                    💡 {suggestion.data_sources.reason}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => toggleComplete(suggestion.id, suggestion.completed)}
                  className={`flex-1 ${
                    suggestion.completed
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600'
                  } text-white`}
                >
                  {suggestion.completed ? (
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
        {suggestions.filter(s => s.saved).length > 0 && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
              <BookmarkPlus className="w-4 h-4 text-pink-500" />
              <span className="text-sm">
                {suggestions.filter(s => s.saved).length} saved for later
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