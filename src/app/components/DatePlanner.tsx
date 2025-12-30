import { ChevronLeft, Calendar, Heart, Sparkles, RefreshCw, Check, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useSuggestions } from '../hooks/useSuggestions';

interface DatePlannerProps {
  onBack: () => void;
  partnerName: string;
}

export function DatePlanner({ onBack, partnerName }: DatePlannerProps) {
  // Use personalized date suggestions
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
  } = useSuggestions({ category: 'date' });

  // Toggle save/complete handlers
  const toggleSave = (id: string, currentlySaved: boolean) => {
    if (currentlySaved) {
      unmarkAsSaved(id);
    } else {
      markAsSaved(id);
    }
  };

  const toggleComplete = (id: string, currentlyCompleted: boolean) => {
    if (currentlyCompleted) {
      unmarkAsCompleted(id);
    } else {
      markAsCompleted(id);
    }
  };

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
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl">Date Ideas</h1>
                <p className="text-white/90 text-sm">
                  Perfect dates for you and {partnerName}
                </p>
              </div>
            </div>
            <Button
              onClick={refresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* Personalized Date Suggestions */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Personalized Date Ideas</h2>
            {personalizationTier > 1 && (
              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                Tier {personalizationTier}
              </span>
            )}
          </div>

          {isLoading ? (
            <Card className="p-8 text-center border-0 shadow-md">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
                <p className="text-gray-600">Creating personalized date ideas...</p>
              </div>
            </Card>
          ) : suggestions.length === 0 ? (
            <Card className="p-8 text-center border-0 shadow-md">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No date suggestions yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Complete your partner's onboarding or answer more daily questions to get personalized date ideas!
              </p>
              <Button
                onClick={refresh}
                disabled={isRefreshing}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Generate Suggestions
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="p-5 border-0 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">
                        {suggestion.metadata?.title || suggestion.suggestion_type}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {suggestion.metadata?.budget && (
                          <span>{suggestion.metadata.budget}</span>
                        )}
                        {suggestion.time_estimate && (
                          <>
                            <span>•</span>
                            <span>{suggestion.time_estimate}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {suggestion.completed && (
                      <div className="flex items-center gap-1 text-green-600 text-xs bg-green-50 px-2 py-1 rounded-full">
                        <Check className="w-3 h-3" />
                        Done
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-700 mb-4">{suggestion.suggestion_text}</p>

                  {/* Why this suggestion */}
                  {suggestion.data_sources?.reason && (
                    <div className="bg-purple-50 border-l-4 border-purple-400 p-3 mb-4">
                      <p className="text-xs text-purple-900">
                        💡 <strong>Why this?</strong> {suggestion.data_sources.reason}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                      {suggestion.difficulty} effort
                    </span>
                    {suggestion.metadata?.environment && (
                      <span className="text-xs px-2 py-1 bg-pink-100 text-pink-700 rounded-full">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {suggestion.metadata.environment}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => toggleSave(suggestion.id, suggestion.saved)}
                      variant={suggestion.saved ? 'default' : 'outline'}
                      className={`flex-1 text-sm ${
                        suggestion.saved
                          ? 'bg-pink-500 text-white hover:bg-pink-600'
                          : ''
                      }`}
                    >
                      {suggestion.saved ? (
                        <>
                          <Heart className="w-4 h-4 mr-1 fill-current" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Heart className="w-4 h-4 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => toggleComplete(suggestion.id, suggestion.completed)}
                      className={`flex-1 text-sm ${
                        suggestion.completed
                          ? 'bg-green-500 hover:bg-green-600'
                          : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600'
                      } text-white`}
                    >
                      {suggestion.completed ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Completed
                        </>
                      ) : (
                        <>
                          <Calendar className="w-4 h-4 mr-1" />
                          Plan This
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Date Style Guide */}
        <Card className="p-5 mt-6 bg-gradient-to-r from-purple-50 to-pink-50 border-0">
          <h3 className="font-semibold mb-3">Date Styles</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 mt-0.5" />
              <div>
                <span className="font-medium">Adventurous:</span>{' '}
                <span className="text-gray-600">Outdoor activities, exploring, trying new things</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Heart className="w-4 h-4 text-pink-600 mt-0.5" />
              <div>
                <span className="font-medium">Relaxed:</span>{' '}
                <span className="text-gray-600">Cozy, low-key, comfortable settings</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-purple-600 mt-0.5" />
              <div>
                <span className="font-medium">Cultural:</span>{' '}
                <span className="text-gray-600">Museums, shows, art experiences</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Personalization Info */}
        <Card className="p-5 mt-4 border-0 bg-white/50 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Personalization Tier {personalizationTier}</strong>
              </p>
              <p className="text-sm text-gray-600">
                {personalizationTier === 1 &&
                  "Basic suggestions. Complete your partner's onboarding to unlock more personalized date ideas!"}
                {personalizationTier === 2 &&
                  `Based on ${partnerName}'s onboarding preferences and love language. Save partner insights from daily questions to get even more personalized suggestions!`}
                {personalizationTier === 3 &&
                  `Personalized using ${partnerName}'s preferences, love language, and saved insights. Keep answering daily questions to unlock the highest tier!`}
                {personalizationTier === 4 &&
                  `Highly personalized! Based on ${partnerName}'s preferences, love language, saved insights, and patterns from your daily question answers.`}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
