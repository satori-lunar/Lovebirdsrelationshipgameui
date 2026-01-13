/**
 * Onboarding Component - Amora Style
 *
 * Beautiful onboarding flow with rose/pink gradients,
 * animated hearts, and smooth transitions.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ChevronRight, Sparkles, Users, MessageCircleHeart, Gift } from 'lucide-react';
import { Button } from './ui/button';

interface OnboardingProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    icon: Heart,
    title: 'Welcome to Lovebirds',
    subtitle: 'Your relationship companion',
    description: 'Strengthen your bond with daily questions, thoughtful suggestions, and meaningful moments together.',
    gradient: 'from-warm-pink to-warm-pink-light',
  },
  {
    icon: MessageCircleHeart,
    title: 'Daily Questions',
    subtitle: 'Know each other deeper',
    description: 'Answer fun questions daily and discover how well you really know your partner.',
    gradient: 'from-warm-pink to-warm-orange',
  },
  {
    icon: Gift,
    title: 'Thoughtful Surprises',
    subtitle: 'Never run out of ideas',
    description: 'Get personalized date ideas, gift suggestions, and sweet gestures tailored to your relationship.',
    gradient: 'from-warm-orange to-warm-yellow',
  },
  {
    icon: Users,
    title: 'Grow Together',
    subtitle: 'Build lasting memories',
    description: 'Set goals, track milestones, and celebrate your journey as a couple.',
    gradient: 'from-soft-purple to-warm-pink',
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-warm-cream via-warm-beige to-soft-purple-light relative overflow-hidden">
      {/* Custom Styles */}
      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .heartbeat { animation: heartbeat 1.5s ease-in-out infinite; }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .float { animation: float 4s ease-in-out infinite; }
      `}</style>

      {/* Animated Background Hearts */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ opacity: 0.1, scale: 0.5 }}
            animate={{
              y: [-30, 30, -30],
              x: [0, 10, 0],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 5 + i,
              repeat: Infinity,
              delay: i * 0.7,
            }}
            style={{
              left: `${5 + i * 12}%`,
              top: `${10 + (i % 4) * 20}%`,
            }}
          >
            <Heart
              className={`w-${6 + (i % 3) * 2} h-${6 + (i % 3) * 2} text-rose-200`}
              fill="currentColor"
              style={{ width: `${24 + (i % 3) * 8}px`, height: `${24 + (i % 3) * 8}px` }}
            />
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Skip Button */}
        <div className="p-6 flex justify-end">
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="text-center max-w-md"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className={`w-24 h-24 bg-gradient-to-br ${slide.gradient} rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-rose-200`}
              >
                <Icon className="w-12 h-12 text-white heartbeat" />
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-2"
              >
                {slide.title}
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-rose-500 font-medium mb-4"
              >
                {slide.subtitle}
              </motion.p>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-gray-600 text-lg leading-relaxed"
              >
                {slide.description}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation */}
        <div className="p-6 space-y-6">
          {/* Dots */}
          <div className="flex justify-center gap-2">
            {SLIDES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'w-8 bg-gradient-to-r from-rose-500 to-pink-500'
                    : 'bg-rose-200 hover:bg-rose-300'
                }`}
              />
            ))}
          </div>

          {/* Button */}
          <Button
            onClick={handleNext}
            className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-2xl shadow-lg shadow-rose-200 transition-all hover:shadow-xl"
          >
            {currentSlide === SLIDES.length - 1 ? (
              <>
                Get Started
                <Sparkles className="w-5 h-5 ml-2" />
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
