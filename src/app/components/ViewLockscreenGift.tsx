import { useState, useEffect } from 'react';
import { ChevronLeft, Download, Heart, Sparkles, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { lockscreenGiftService } from '../services/lockscreenGiftService';
import type { LockscreenGift } from '../types/lockscreenGift';

interface ViewLockscreenGiftProps {
  onBack: () => void;
}

export function ViewLockscreenGift({ onBack }: ViewLockscreenGiftProps) {
  const { user } = useAuth();
  const [gifts, setGifts] = useState<LockscreenGift[]>([]);
  const [selectedGift, setSelectedGift] = useState<LockscreenGift | null>(null);
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showReveal, setShowReveal] = useState(false);

  useEffect(() => {
    loadGifts();
  }, [user]);

  const loadGifts = async () => {
    if (!user) return;

    try {
      const pendingGifts = await lockscreenGiftService.getPendingGifts(user.id);
      setGifts(pendingGifts);

      // Auto-select first gift if there's one
      if (pendingGifts.length > 0 && !selectedGift) {
        handleSelectGift(pendingGifts[0]);
      }
    } catch (error) {
      console.error('Failed to load gifts:', error);
      toast.error('Failed to load gifts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectGift = async (gift: LockscreenGift) => {
    setSelectedGift(gift);
    setShowReveal(true);

    // Mark as viewed
    if (gift.status === 'pending') {
      await lockscreenGiftService.markGiftViewed(gift.id);
      setGifts(gifts.map(g => g.id === gift.id ? { ...g, status: 'viewed' } : g));
    }

    // Generate wallpaper
    setIsGenerating(true);
    try {
      const wallpaper = await lockscreenGiftService.generateWallpaper(gift.design, {
        width: 390,
        height: 844,
        devicePixelRatio: 2,
        format: 'png',
        quality: 0.9,
        optimizeForLockscreen: true,
      });
      setWallpaperUrl(wallpaper.dataUrl);
    } catch (error) {
      console.error('Failed to generate wallpaper:', error);
      toast.error('Failed to generate wallpaper');
    } finally {
      setIsGenerating(false);
    }

    // Hide reveal after animation
    setTimeout(() => setShowReveal(false), 2000);
  };

  const handleDownload = () => {
    if (!wallpaperUrl || !selectedGift) return;

    const link = document.createElement('a');
    link.href = wallpaperUrl;
    link.download = `lockscreen-gift-${selectedGift.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Mark as applied
    lockscreenGiftService.markGiftApplied(selectedGift.id);

    toast.success('Wallpaper downloaded! 💕', {
      description: 'Set it as your lockscreen to see it every day',
    });
  };

  const handleSaveToMemories = async () => {
    if (!selectedGift || !user) return;

    try {
      await lockscreenGiftService.saveToMemories(selectedGift.id, user.id);
      toast.success('Saved to memories!', {
        description: 'You can find it in your shared memories',
      });
    } catch (error) {
      console.error('Failed to save to memories:', error);
      toast.error('Failed to save');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your gifts...</p>
        </div>
      </div>
    );
  }

  if (gifts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        <div className="p-4">
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </Button>
          <div className="flex flex-col items-center justify-center h-96 text-center">
            <Heart className="w-20 h-20 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              No Gifts Yet
            </h3>
            <p className="text-gray-500 text-sm max-w-xs">
              When your partner sends you a lockscreen gift, it will appear here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-gray-800">Your Gifts</h1>
            <p className="text-xs text-gray-500 mt-1">
              {gifts.length} {gifts.length === 1 ? 'gift' : 'gifts'} waiting
            </p>
          </div>
          <div className="w-10" />
        </div>

        {/* Reveal Animation */}
        <AnimatePresence>
          {showReveal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="text-center text-white"
              >
                <Sparkles className="w-20 h-20 mx-auto mb-4 animate-pulse" />
                <h2 className="text-3xl font-bold mb-2">A Gift for You</h2>
                <p className="text-lg opacity-90">From someone who loves you</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wallpaper Display */}
        {selectedGift && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Sender Info */}
            <Card className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-pink-200 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-pink-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">From your partner</p>
                  <p className="text-xs text-gray-500">
                    Sent {new Date(selectedGift.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {selectedGift.message && (
                <p className="mt-3 text-sm text-gray-700 italic">
                  "{selectedGift.message}"
                </p>
              )}
            </Card>

            {/* Wallpaper Preview */}
            {isGenerating ? (
              <Card className="p-8 text-center">
                <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Generating your wallpaper...</p>
              </Card>
            ) : wallpaperUrl ? (
              <Card className="p-3 bg-gray-100">
                <div className="aspect-[9/19.5] rounded-2xl overflow-hidden shadow-xl mx-auto max-w-[280px]">
                  <img
                    src={wallpaperUrl}
                    alt="Lockscreen gift"
                    className="w-full h-full object-cover"
                  />
                </div>
              </Card>
            ) : null}

            {/* Actions */}
            {wallpaperUrl && (
              <div className="space-y-3">
                <Button
                  onClick={handleDownload}
                  className="w-full bg-pink-500 hover:bg-pink-600 h-12"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download & Set as Lockscreen
                </Button>

                <Button
                  onClick={handleSaveToMemories}
                  variant="outline"
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save to Memories
                </Button>
              </div>
            )}

            {/* Instructions */}
            <Card className="bg-blue-50 border-blue-100 p-4">
              <div className="flex gap-3">
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">How to set as lockscreen:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700 text-xs">
                    <li>Download the wallpaper above</li>
                    <li>Go to Settings → Wallpaper</li>
                    <li>Choose "Add New Wallpaper"</li>
                    <li>Select the downloaded image</li>
                    <li>Set as "Lock Screen" ✨</li>
                  </ol>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Other Gifts */}
        {gifts.length > 1 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Other Gifts</h3>
            <div className="space-y-2">
              {gifts
                .filter(g => g.id !== selectedGift?.id)
                .map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => handleSelectGift(gift)}
                    className="w-full p-3 bg-white border border-gray-200 rounded-lg flex items-center gap-3 hover:border-pink-300 transition-colors"
                  >
                    <Heart className="w-5 h-5 text-pink-400" />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-800">
                        Gift from {new Date(gift.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {gift.status === 'pending' ? 'New' : 'Viewed'}
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
