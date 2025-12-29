import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { motion } from 'motion/react';
import { useDailyQuestion } from '../hooks/useDailyQuestion';
import { useRelationship } from '../hooks/useRelationship';
import { toast } from 'sonner';

interface DailyQuestionProps {
  onComplete: () => void;
}

export function DailyQuestion({ onComplete }: DailyQuestionProps) {
  const { relationship } = useRelationship();
  const {
    question,
    isLoading,
    userAnswer,
    userGuess,
    partnerAnswer,
    saveAnswer,
    saveGuess,
    hasAnswered,
    hasGuessed,
    canSeeFeedback,
    isSavingAnswer,
    isSavingGuess,
  } = useDailyQuestion();

  // Show error if no relationship is established
  if (!relationship) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 p-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-3xl p-8 shadow-lg text-center">
            <Heart className="w-16 h-16 text-pink-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Connect with Your Partner</h2>
            <p className="text-gray-600 mb-6">
              To answer daily questions, you need to connect with your partner first.
              Go to Settings and use "Connect Partner" to get started.
            </p>
            <Button onClick={onComplete} className="w-full">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const [stage, setStage] = useState<'answer' | 'guess' | 'feedback'>('answer');
  const [answerText, setAnswerText] = useState('');
  const [guessText, setGuessText] = useState('');

  useEffect(() => {
    if (hasAnswered && !hasGuessed) {
      setStage('guess');
    } else if (hasAnswered && hasGuessed && canSeeFeedback) {
      setStage('feedback');
    } else if (!hasAnswered) {
      setStage('answer');
    }
  }, [hasAnswered, hasGuessed, canSeeFeedback]);

  useEffect(() => {
    if (userAnswer) {
      setAnswerText(userAnswer.answer_text);
    }
  }, [userAnswer]);

  useEffect(() => {
    if (userGuess) {
      setGuessText(userGuess.guess_text);
    }
  }, [userGuess]);

  if (!relationship?.partner_b_id) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 shadow-lg text-center max-w-md">
          <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl mb-2">Connect with your partner first</h2>
          <p className="text-gray-600 mb-6">
            You need to connect with your partner before you can answer daily questions together.
          </p>
          <Button
            onClick={onComplete}
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !question) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading today's question...</p>
        </div>
      </div>
    );
  }

  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) {
      toast.error('Please enter an answer');
      return;
    }

    try {
      await saveAnswer({ answerText: answerText.trim() });
      setStage('guess');
      toast.success('Answer saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save answer');
    }
  };

  const handleSubmitGuess = async () => {
    if (!guessText.trim()) {
      toast.error('Please enter a guess');
      return;
    }

    try {
      await saveGuess({ guessText: guessText.trim() });
      setStage('feedback');
      toast.success('Guess saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save guess');
    }
  };

  const handleComplete = () => {
    setAnswerText('');
    setGuessText('');
    onComplete();
  };

  const isCorrect = partnerAnswer && guessText.toLowerCase().includes(partnerAnswer.answer_text.toLowerCase());

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
              <p className="text-xl text-center">{question.question_text}</p>
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
                disabled={!answerText.trim() || isSavingAnswer}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-6"
              >
                {isSavingAnswer ? 'Saving...' : 'Submit Answer'}
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
              <p className="text-xl text-center">{question.question_text}</p>
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
                disabled={!guessText.trim() || isSavingGuess}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-6"
              >
                {isSavingGuess ? 'Saving...' : 'Submit Guess'}
              </Button>
            </div>
          </motion.div>
        )}

        {stage === 'feedback' && partnerAnswer && (
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
                  <p className="font-semibold">{partnerAnswer.answer_text}</p>
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
