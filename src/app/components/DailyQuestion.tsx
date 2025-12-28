import { useState } from 'react';
import { Heart, MessageCircle, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { motion } from 'motion/react';

interface DailyQuestionProps {
  onComplete: () => void;
}

export function DailyQuestion({ onComplete }: DailyQuestionProps) {
  const [stage, setStage] = useState<'answer' | 'guess' | 'feedback'>('answer');
  const [answerText, setAnswerText] = useState('');
  const [guessText, setGuessText] = useState('');

  const question = "What is your favorite movie?";
  const partnerAnswer = "The Goonies"; // Mock partner's answer

  const handleSubmitAnswer = () => {
    if (!answerText.trim()) return;
    setStage('guess');
  };

  const handleSubmitGuess = () => {
    if (!guessText.trim()) return;
    setStage('feedback');
  };

  const handleComplete = () => {
    setStage('answer');
    setAnswerText('');
    setGuessText('');
    onComplete();
  };

  const isCorrect = guessText.toLowerCase().includes(partnerAnswer.toLowerCase());

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 p-6">
      <div className="max-w-md mx-auto py-8">
        {stage === 'answer' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-lg space-y-6"
          >
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-2xl">Today's Question</h2>
              <p className="text-gray-600">Answer honestly - this is private</p>
            </div>

            <div className="p-6 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl">
              <p className="text-xl text-center">{question}</p>
            </div>

            <div className="space-y-3">
              <Textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="Type your answer here..."
                rows={4}
                className="text-base"
                disabled={isSavingAnswer}
              />
              
              <Button
                onClick={handleSubmitAnswer}
                disabled={!answerText.trim()}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-6"
              >
                Submit Answer
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              Your answer is private and won't be shared with your partner
            </p>
          </motion.div>
        )}

        {stage === 'guess' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-lg space-y-6"
          >
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Heart className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className="text-2xl">Now, Take a Guess!</h2>
              <p className="text-gray-600">How well do you know your partner?</p>
            </div>

            <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl">
              <p className="text-xl text-center">{question}</p>
              <p className="text-center text-sm text-gray-600 mt-2">What would your partner say?</p>
            </div>

            <div className="space-y-3">
              <Textarea
                value={guessText}
                onChange={(e) => setGuessText(e.target.value)}
                placeholder="Your guess..."
                rows={4}
                className="text-base"
                disabled={isSavingGuess}
              />
              
              <Button
                onClick={handleSubmitGuess}
                disabled={!guessText.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-6"
              >
                Submit Guess
              </Button>
            </div>
          </motion.div>
        )}

        {stage === 'feedback' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-3xl p-8 shadow-lg space-y-6">
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  {isCorrect ? (
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-8 h-8 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                      <Heart className="w-8 h-8 text-purple-600" />
                    </div>
                  )}
                </div>
                
                {isCorrect ? (
                  <div>
                    <h2 className="text-2xl">Perfect! 🎉</h2>
                    <p className="text-gray-600">You know your partner well!</p>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-2xl">Not quite, but that's okay!</h2>
                    <p className="text-gray-600">Now you know something new</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Your guess:</p>
                  <p className="font-semibold">{guessText}</p>
                </div>

                <div className="p-4 bg-pink-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Your partner's answer:</p>
                  <p className="font-semibold">{partnerAnswer}</p>
                </div>
              </div>

              <div className="text-center p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl">
                <p className="text-sm">Now you know 💛</p>
              </div>

              <Button
                onClick={handleComplete}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-6"
              >
                Complete
              </Button>
            </div>

            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-600">
                🔒 Your partner won't see that you got this wrong. No scores, no pressure - just learning.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
