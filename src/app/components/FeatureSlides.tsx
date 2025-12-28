import { useState } from 'react';
import { ChevronRight, ChevronLeft, Heart } from 'lucide-react';
import { Button } from './ui/button';

interface FeatureSlidesProps {
  onComplete: () => void;
  onBack: () => void;
}

const SLIDES = [
  {
    headline: 'Try Lovebirds free for 7 days',
    body: 'Get full access to all features during your free trial.\nNo commitment — cancel anytime before the trial ends.',
  },
  {
    headline: 'Personalized love language support',
    body: 'We give your partner thoughtful suggestions on how to nurture your love language — so love feels intentional, not confusing.',
  },
  {
    headline: 'Dates designed just for you',
    body: 'No more guessing or default dinner plans.\nLovebirds suggests dates based on your relationship, preferences, and what you actually enjoy.',
  },
  {
    headline: 'Track your relationship growth',
    body: 'See how often you're connecting, planning dates, and showing up for each other — all in one place.',
  },
  {
    headline: 'Ready to get started?',
    body: "Let's set things up so we can personalize everything for you and your partner.",
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
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        {/* Progress indicator */}
        <div className="flex justify-center space-x-2">
          {SLIDES.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide
                  ? 'w-8 bg-pink-500'
                  : index < currentSlide
                  ? 'w-2 bg-pink-300'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Slide content */}
        <div className="bg-white rounded-3xl p-8 shadow-lg min-h-[400px] flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <h2 className="text-3xl font-bold">{SLIDES[currentSlide].headline}</h2>
            <p className="text-gray-600 text-lg whitespace-pre-line leading-relaxed">
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
              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white flex items-center gap-2 px-6"
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

