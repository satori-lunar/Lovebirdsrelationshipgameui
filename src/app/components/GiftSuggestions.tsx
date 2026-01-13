import React, { useState, useEffect } from 'react';
import { ArrowLeft, Gift, Heart, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { giftSuggestionsService, GiftWithSaved, GIFT_CATEGORIES } from '../services/giftSuggestionsService';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface GiftSuggestionsProps {
  onBack: () => void;
}

export function GiftSuggestions({ onBack }: GiftSuggestionsProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [gifts, setGifts] = useState<GiftWithSaved[]>([]);
  const [currentGiftIndex, setCurrentGiftIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [savedCounts, setSavedCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user && relationship) {
      loadSavedCounts();
    }
  }, [user, relationship]);

  useEffect(() => {
    if (selectedCategory && user && relationship) {
      loadGifts();
    }
  }, [selectedCategory, user, relationship]);

  const loadSavedCounts = async () => {
    if (!user || !relationship) return;

    try {
      const counts = await giftSuggestionsService.getSavedCountByCategory(relationship.id, user.id);
      setSavedCounts(counts);
    } catch (error) {
      console.error('Error loading saved counts:', error);
    }
  };

  const loadGifts = async () => {
    if (!user || !relationship || !selectedCategory) return;

    setIsLoading(true);
    try {
      const data = await giftSuggestionsService.getGiftsWithSavedStatus(
        relationship.id,
        user.id,
        selectedCategory
      );
      setGifts(data);
      setCurrentGiftIndex(0);
    } catch (error) {
      console.error('Error loading gifts:', error);
      toast.error('Failed to load gift suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGift = async (giftId: string, savedGiftId?: string) => {
    if (!user || !relationship) return;

    try {
      if (savedGiftId) {
        // Unsave the gift
        await giftSuggestionsService.unsaveGift(savedGiftId);
        toast.success('Gift removed from saved');
      } else {
        // Save the gift
        await giftSuggestionsService.saveGift(giftId, user.id, relationship.id);
        toast.success('Gift saved!');
      }

      // Reload gifts and counts
      await loadGifts();
      await loadSavedCounts();
    } catch (error) {
      console.error('Error saving/unsaving gift:', error);
      toast.error('Failed to update gift');
    }
  };

  const handleNextGift = () => {
    if (currentGiftIndex < gifts.length - 1) {
      setCurrentGiftIndex(currentGiftIndex + 1);
    }
  };

  const handlePreviousGift = () => {
    if (currentGiftIndex > 0) {
      setCurrentGiftIndex(currentGiftIndex - 1);
    }
  };

  const currentGift = gifts[currentGiftIndex];

  // Category selection view
  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-12">
          <div className="max-w-md mx-auto">
            <button
              onClick={onBack}
              className="flex items-center gap-2 mb-6 hover:opacity-80"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Gift Suggestions</h1>
                <p className="text-white/90 text-sm">
                  Find the perfect gift for your partner
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 -mt-6">
          <div className="grid grid-cols-2 gap-3">
            {GIFT_CATEGORIES.map((category) => {
              const savedCount = savedCounts[category.id] || 0;
              return (
                <Card
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className="p-4 border-0 shadow-md hover:shadow-xl transition-all cursor-pointer group"
                >
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${category.color} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform`}>
                    {category.emoji}
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{category.label}</h3>
                  {savedCount > 0 && (
                    <div className="flex items-center gap-1 text-xs text-purple-600">
                      <BookmarkCheck className="w-3 h-3" />
                      <span>{savedCount} saved</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Gift browsing view
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-2 mb-6 hover:opacity-80"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Categories</span>
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                {GIFT_CATEGORIES.find(c => c.id === selectedCategory)?.emoji}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{selectedCategory}</h1>
                <p className="text-white/90 text-sm">
                  {gifts.length} gift ideas
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {isLoading ? (
          <Card className="p-8 border-0 shadow-lg">
            <div className="text-center text-gray-500">Loading gift ideas...</div>
          </Card>
        ) : gifts.length === 0 ? (
          <Card className="p-8 border-0 shadow-lg">
            <div className="text-center text-gray-500">
              No gift suggestions available in this category yet.
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Gift Card */}
            <Card className="p-6 border-0 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold mb-2">{currentGift.name}</h2>
                  <div className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-3">
                    {currentGift.price_range}
                  </div>
                </div>
                <button
                  onClick={() => handleSaveGift(currentGift.id, currentGift.saved_gift_id)}
                  className={`p-2 rounded-full transition-colors ${
                    currentGift.is_saved
                      ? 'bg-purple-100 text-purple-600'
                      : 'bg-gray-100 text-gray-400 hover:bg-purple-50 hover:text-purple-500'
                  }`}
                >
                  {currentGift.is_saved ? (
                    <BookmarkCheck className="w-6 h-6" />
                  ) : (
                    <Bookmark className="w-6 h-6" />
                  )}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 mb-1">Description</h3>
                  <p className="text-gray-600 text-sm">{currentGift.description}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-sm text-gray-700 mb-1">Why it's great</h3>
                  <p className="text-gray-600 text-sm">{currentGift.why_its_great}</p>
                </div>
              </div>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                onClick={handlePreviousGift}
                disabled={currentGiftIndex === 0}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>

              <span className="text-sm text-gray-600">
                {currentGiftIndex + 1} of {gifts.length}
              </span>

              <Button
                onClick={handleNextGift}
                disabled={currentGiftIndex === gifts.length - 1}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
