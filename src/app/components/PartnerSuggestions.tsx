import React, { useState, useEffect } from 'react';
import { Heart, Lightbulb, Check, X, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  relationshipNeedsService,
  PartnerSuggestion,
} from '../services/relationshipNeedsService';
import { toast } from 'sonner';
import { Button } from './ui/button';

export function PartnerSuggestions() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<PartnerSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSuggestions();
    }
  }, [user]);

  const loadSuggestions = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const data = await relationshipNeedsService.getActiveSuggestions(user.id);
      setSuggestions(data);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    const currentSuggestion = suggestions[currentIndex];
    if (!currentSuggestion) return;

    try {
      await relationshipNeedsService.completeSuggestion(currentSuggestion.id);
      toast.success('Great job! 💕', {
        description: 'Your partner will appreciate this',
      });

      // Move to next suggestion or reload
      if (currentIndex < suggestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        await loadSuggestions();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark as complete');
    }
  };

  const handleDismiss = async () => {
    const currentSuggestion = suggestions[currentIndex];
    if (!currentSuggestion) return;

    try {
      await relationshipNeedsService.dismissSuggestion(currentSuggestion.id);

      // Move to next suggestion or reload
      if (currentIndex < suggestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        await loadSuggestions();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to dismiss');
    }
  };

  const handleNext = () => {
    if (currentIndex < suggestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null; // Don't show anything if there are no suggestions
  }

  const currentSuggestion = suggestions[currentIndex];

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-6 border border-purple-100 shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Lightbulb className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-['Nunito_Sans',sans-serif] text-[18px] font-semibold text-[#2c2c2c]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
            💡 Suggestion for You
          </h3>
          <p className="font-['Nunito_Sans',sans-serif] text-[12px] text-gray-600" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
            {currentIndex + 1} of {suggestions.length}
          </p>
        </div>
      </div>

      {/* Suggestion Text */}
      <div className="bg-white/70 rounded-2xl p-5 mb-4">
        <p className="font-['Nunito_Sans',sans-serif] text-[16px] text-[#2c2c2c] leading-relaxed" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
          {currentSuggestion.suggestion_text}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleComplete}
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4"
        >
          <Check className="w-5 h-5 mr-2" />
          I'll Do This
        </Button>
        <Button
          onClick={handleDismiss}
          variant="outline"
          className="flex-1 py-4 border-2"
        >
          <X className="w-5 h-5 mr-2" />
          Not Now
        </Button>
      </div>

      {/* Navigation Dots */}
      {suggestions.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {suggestions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-purple-600 w-6'
                  : 'bg-purple-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* Info */}
      <p className="font-['Nunito_Sans',sans-serif] text-[11px] text-center text-gray-500 mt-4" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
        <Heart className="w-3 h-3 inline mr-1" />
        Small actions make a big difference in your relationship
      </p>
    </div>
  );
}
