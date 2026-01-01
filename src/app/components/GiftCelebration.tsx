/**
 * Gift Celebration Component
 *
 * Displays a beautiful celebration animation when the user
 * receives a widget gift from their partner.
 * Styled with rose/pink gradients matching the Lovebirds design system.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, Sparkles, Gift } from 'lucide-react';
import type { WidgetGiftData } from '../types/widget';

interface GiftCelebrationProps {
  gift: WidgetGiftData;
  onDismiss: () => void;
  onView?: () => void;
}

export function GiftCelebration({ gift, onDismiss, onView }: GiftCelebrationProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Delay showing content for entrance animation
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onDismiss}
      >
        {/* Floating hearts background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              initial={{
                opacity: 0,
                y: '100vh',
                x: `${5 + (i * 6)}%`,
                scale: 0.5 + Math.random() * 0.5,
              }}
              animate={{
                opacity: [0, 0.8, 0.8, 0],
                y: '-20vh',
                rotate: [-15, 15, -15],
              }}
              transition={{
                duration: 4 + Math.random() * 2,
                delay: i * 0.15,
                repeat: Infinity,
                ease: 'easeOut',
              }}
              className="absolute"
            >
              <Heart
                className="text-rose-400 fill-rose-400"
                style={{
                  width: 14 + Math.random() * 20,
                  height: 14 + Math.random() * 20,
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Main content card */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-[90%] max-w-sm mx-auto"
        >
          {/* Close button */}
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onDismiss}
            className="absolute -top-3 -right-3 z-10 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </motion.button>

          {/* Card */}
          <div className="bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 rounded-3xl shadow-2xl overflow-hidden border border-rose-100">
            {/* Header with sparkles */}
            <div className="relative bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-5">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute top-3 left-4"
              >
                <Sparkles className="w-5 h-5 text-yellow-200" />
              </motion.div>
              <motion.div
                animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                className="absolute top-3 right-4"
              >
                <Sparkles className="w-5 h-5 text-yellow-200" />
              </motion.div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.3 }}
                  className="w-14 h-14 mx-auto mb-3 bg-white/20 rounded-2xl flex items-center justify-center"
                >
                  <Gift className="w-7 h-7 text-white" />
                </motion.div>
                <p className="text-rose-100 text-sm">You received a gift from</p>
                <h2 className="text-2xl font-bold text-white mt-1">{gift.senderName} 💕</h2>
              </motion.div>
            </div>

            {/* Gift content */}
            <AnimatePresence>
              {showContent && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-6"
                >
                  {/* Photo */}
                  {gift.photoUrl && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.4, type: 'spring' }}
                      className="relative mb-5 rounded-2xl overflow-hidden shadow-lg"
                    >
                      <img
                        src={gift.photoUrl}
                        alt="Gift"
                        className="w-full h-52 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </motion.div>
                  )}

                  {/* Message */}
                  {gift.message && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="bg-white/80 backdrop-blur-sm rounded-xl p-4 mb-4 border border-rose-100 shadow-sm"
                    >
                      <p className="text-gray-700 text-center italic text-lg">
                        "{gift.message}"
                      </p>
                    </motion.div>
                  )}

                  {/* Memory title if from memory */}
                  {gift.memoryTitle && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="text-center text-sm text-gray-500 mb-4 flex items-center justify-center gap-2"
                    >
                      <Heart className="w-4 h-4 text-rose-400" />
                      From your memory: <span className="font-medium text-gray-700">{gift.memoryTitle}</span>
                    </motion.p>
                  )}

                  {/* Action buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex gap-3"
                  >
                    <button
                      onClick={onDismiss}
                      className="flex-1 py-3.5 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    >
                      Close
                    </button>
                    {onView && (
                      <button
                        onClick={onView}
                        className="flex-1 py-3.5 px-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl font-medium shadow-lg shadow-rose-200 transition-all hover:shadow-xl"
                      >
                        View Widget
                      </button>
                    )}
                  </motion.div>

                  {/* Time remaining */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center text-xs text-gray-400 mt-4"
                  >
                    ✨ This gift will appear on your home screen widget
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
