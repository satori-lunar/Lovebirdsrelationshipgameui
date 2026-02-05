import { useState } from 'react';
import { ChevronRight, ChevronLeft, Heart } from 'lucide-react';
import { Button } from './ui/button';
import coupleHetero from '../../assets/illustrations/couple-hetero.jpg';
import coupleLesbian from '../../assets/illustrations/couple-lesbian.jpg';
import coupleGay from '../../assets/illustrations/couple-gay.jpg';

interface FeatureSlidesProps {
  onComplete: () => void;
  onBack: () => void;
}

const SLIDES = [
  {
    headline: 'Try Lovebirds free for 7 days',
    body: 'Get full access to all features during your free trial.\nNo commitment — cancel anytime before the trial ends.',
    illustration: coupleHetero,
  },
  {
    headline: 'Personalized love language support',
    body: 'We give your partner thoughtful suggestions on how to nurture your love language — so love feels intentional, not confusing.',
    illustration: coupleLesbian,
  },
  {
    headline: 'Dates designed just for you',
    body: 'No more guessing or default dinner plans.\nLovebirds suggests dates based on your relationship, preferences, and what you actually enjoy.',
    illustration: coupleGay,
  },
  {
    headline: 'Track your relationship growth',
    body: "See how often you're connecting, planning dates, and showing up for each other — all in one place.",
    illustration: coupleHetero,
  },
  {
    headline: 'Ready to get started?',
    body: "Let's set things up so we can personalize everything for you and your partner.",
    illustration: coupleLesbian,
  },
];

export function FeatureSlides({ onComplete, onBack }: FeatureSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const isLastSlide = currentSlide === SLIDES.length - 1;

  const nextSlide = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide === 0) {
      onBack();
    } else {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-cream to-soft-purple-light flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        {/* Progress indicator */}
        <div className="flex justify-center space-x-2">
          {SLIDES.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'w-8 bg-warm-pink'
                  : index < currentSlide
                  ? 'w-2 bg-warm-pink-light'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Slide content */}
        <div className="bg-white rounded-3xl p-8 shadow-lg min-h-[400px] flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            {/* Couple Illustration */}
            <img
              src={SLIDES[currentSlide].illustration}
              alt="Couple"
              className="w-40 h-40 object-contain drop-shadow-md"
            />
            <h2 className="text-3xl font-bold text-text-warm">{SLIDES[currentSlide].headline}</h2>
            <p className="text-text-warm-light text-lg whitespace-pre-line leading-relaxed">
              {SLIDES[currentSlide].body}
            </p>
          </div>

          {/* Footer indicator */}
          <div className="text-center text-sm text-gray-500 pt-4">
            Slide {currentSlide + 1} of {SLIDES.length}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <Button
              variant="ghost"
              onClick={prevSlide}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              {currentSlide === 0 ? 'Back' : 'Previous'}
            </Button>
            
            <Button
              onClick={nextSlide}
              className="bg-gradient-to-r from-warm-pink to-warm-orange hover:from-warm-pink-light hover:to-warm-orange-light text-white flex items-center gap-2 px-6"
            >
              {isLastSlide ? 'Create My Account' : 'Next'}
              {!isLastSlide && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

