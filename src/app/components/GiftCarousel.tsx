/**
 * Gift Carousel Component
 *
 * Displays multiple pending gifts in a swipeable carousel format.
 * Shows gift count indicator and allows navigation between gifts.
 * Styled with rose/pink gradients matching the Lovebirds design system.
 */

import { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { ChevronLeft, ChevronRight, Heart, Clock, X, Sparkles, Gift } from 'lucide-react';
import type { WidgetGiftData } from '../types/widget';
import { widgetGiftService } from '../services/widgetGiftService';

interface GiftCarouselProps {
  gifts: WidgetGiftData[];
  onDismissGift: (giftId: string) => void;
  onClose: () => void;
}

export function GiftCarousel({ gifts, onDismissGift, onClose }: GiftCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const currentGift = gifts[currentIndex];

  const goToNext = () => {
    if (currentIndex < gifts.length - 1) {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && currentIndex > 0) {
      goToPrev();
    } else if (info.offset.x < -threshold && currentIndex < gifts.length - 1) {
      goToNext();
    }
  };

  const handleDismiss = async () => {
    onDismissGift(currentGift.id);

    // If this was the last gift, close the carousel
    if (gifts.length === 1) {
      onClose();
    } else if (currentIndex >= gifts.length - 1) {
      // If dismissing the last item, go to previous
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  if (!currentGift) return null;

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
    }),
  };

  return (
    <div className="bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 rounded-3xl shadow-2xl overflow-hidden border border-rose-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"
          >
            <Gift className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <span className="text-white font-semibold text-lg">
              {gifts.length} Gift{gifts.length > 1 ? 's' : ''} for You
            </span>
            <p className="text-rose-100 text-xs">Swipe to see all</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Carousel */}
      <div className="relative h-80 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentGift.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 p-4 cursor-grab active:cursor-grabbing"
          >
            {/* Gift Card */}
            <div className="h-full bg-white rounded-2xl border border-rose-100 overflow-hidden flex flex-col shadow-lg">
              {/* Photo */}
              {currentGift.photoUrl && (
                <div className="relative flex-shrink-0 h-44">
                  <img
                    src={currentGift.photoUrl}
                    alt="Gift"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                  {/* Sender badge */}
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-2 shadow-lg">
                    <div className="w-6 h-6 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Heart className="w-3.5 h-3.5 text-white fill-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-800">
                      {currentGift.senderName}
                    </span>
                  </div>

                  {/* Gift number badge */}
                  {gifts.length > 1 && (
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1 text-white text-xs font-medium">
                      {currentIndex + 1} / {gifts.length}
                    </div>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 p-4 flex flex-col justify-between bg-gradient-to-b from-white to-rose-50/50">
                {/* Message */}
                {currentGift.message ? (
                  <p className="text-gray-700 italic text-center flex-1 flex items-center justify-center text-lg">
                    "{currentGift.message}"
                  </p>
                ) : currentGift.memoryTitle ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <Sparkles className="w-5 h-5 text-rose-400 mb-2" />
                    <p className="text-gray-600 text-center">
                      Shared memory: <span className="font-semibold text-gray-800">{currentGift.memoryTitle}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center flex-1 flex items-center justify-center text-lg">
                    {currentGift.senderName} sent you love! 💕
                  </p>
                )}

                {/* Time remaining */}
                <div className="flex items-center justify-center gap-2 text-xs mt-3">
                  <div className="flex items-center gap-1.5 bg-rose-100 text-rose-600 px-3 py-1.5 rounded-full">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="font-medium">
                      {widgetGiftService.getTimeRemaining(currentGift.expiresAt)} remaining
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        {gifts.length > 1 && (
          <>
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: currentIndex === 0 ? 0.3 : 1, x: 0 }}
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className={`absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center transition-all ${
                currentIndex === 0 ? 'cursor-not-allowed' : 'hover:scale-110 hover:shadow-xl'
              }`}
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </motion.button>
            <motion.button
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: currentIndex === gifts.length - 1 ? 0.3 : 1, x: 0 }}
              onClick={goToNext}
              disabled={currentIndex === gifts.length - 1}
              className={`absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center transition-all ${
                currentIndex === gifts.length - 1 ? 'cursor-not-allowed' : 'hover:scale-110 hover:shadow-xl'
              }`}
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </motion.button>
          </>
        )}
      </div>

      {/* Dots indicator */}
      {gifts.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-4 bg-white/50">
          {gifts.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-8 bg-gradient-to-r from-rose-500 to-pink-500'
                  : 'w-2 bg-gray-300 hover:bg-rose-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="p-4 bg-white border-t border-rose-100 flex gap-3">
        <button
          onClick={handleDismiss}
          className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          Dismiss Gift
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl font-medium shadow-lg shadow-rose-200 transition-all hover:shadow-xl"
        >
          Keep on Widget
        </button>
      </div>
    </div>
  );
}
