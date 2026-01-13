import { useState } from 'react';
import { ChevronLeft, MessageCircle, Users, Heart, Zap, Bookmark } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { motion } from 'motion/react';
import { usePartnerInsights } from '../hooks/usePartnerInsights';
import { useRelationship } from '../hooks/useRelationship';
import { toast } from 'sonner';

interface IcebreakersProps {
  onBack: () => void;
  partnerName: string;
}

const icebreakerQuestions = [
  {
    id: '1',
    question: "What's one thing you've always wanted to try but haven't yet?",
    category: 'adventures'
  },
  {
    id: '2',
    question: "If you could have dinner with any fictional character, who would it be and why?",
    category: 'fun'
  },
  {
    id: '3',
    question: "What's the most spontaneous thing you've ever done?",
    category: 'stories'
  },
  {
    id: '4',
    question: "If we could travel anywhere right now, where would you want to go?",
    category: 'dreams'
  },
  {
    id: '5',
    question: "What's something that always makes you laugh?",
    category: 'happiness'
  },
  {
    id: '6',
    question: "What's your go-to comfort food and why?",
    category: 'personal'
  }
];

export function Icebreakers({ onBack, partnerName }: IcebreakersProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [savedInsights, setSavedInsights] = useState<Set<string>>(new Set());

  const { relationship } = useRelationship();
  const { saveIcebreakerInsight, isSaving } = usePartnerInsights();

  const handleSaveInsight = (question: typeof icebreakerQuestions[0]) => {
    if (!relationship) return;

    const partnerId = relationship.partner_a_id === relationship.user_id
      ? relationship.partner_b_id
      : relationship.partner_a_id;

    saveIcebreakerInsight(
      {
        partnerId,
        title: `Icebreaker: ${question.question}`,
        content: `We did an icebreaker question: "${question.question}". It was a great way to learn more about each other!`
      },
      {
        onSuccess: () => {
          toast.success('Icebreaker insight saved!');
          setSavedInsights(prev => new Set(prev).add(question.id));
        },
        onError: (error: any) => {
          toast.error('Failed to save insight');
        },
      }
    );
  };

  const nextQuestion = () => {
    setCurrentQuestion((prev) => (prev + 1) % icebreakerQuestions.length);
    setShowAnswer(false);
  };

  const prevQuestion = () => {
    setCurrentQuestion((prev) => (prev - 1 + icebreakerQuestions.length) % icebreakerQuestions.length);
    setShowAnswer(false);
  };

  const question = icebreakerQuestions[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 hover:opacity-80"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Icebreakers</h1>
              <p className="text-white/90 text-sm">
                Fun questions to connect with {partnerName}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-center gap-2 mb-4">
            {icebreakerQuestions.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentQuestion
                    ? 'w-8 bg-blue-500'
                    : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-gray-600">
            Question {currentQuestion + 1} of {icebreakerQuestions.length}
          </p>
        </div>

        {/* Question Card */}
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <Card className="border-0 shadow-lg mb-6">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>

              <h2 className="text-xl font-bold mb-4">Icebreaker Question</h2>
              <p className="text-lg text-gray-800 mb-6">
                {question.question}
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={prevQuestion}
                  variant="outline"
                  className="flex-1"
                  disabled={currentQuestion === 0}
                >
                  Previous
                </Button>
                <Button
                  onClick={nextQuestion}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Insight */}
        <Card className="border-0 shadow-lg mb-6 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Save as Insight</p>
                <p className="text-sm text-gray-600">Remember this moment in your insights</p>
              </div>
            </div>
            <Button
              onClick={() => handleSaveInsight(question)}
              disabled={isSaving || savedInsights.has(question.id)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Bookmark className="w-4 h-4 mr-2" />
              {savedInsights.has(question.id)
                ? 'Insight Saved!'
                : isSaving
                ? 'Saving...'
                : 'Save This Icebreaker'
              }
            </Button>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-blue-600" />
              <h3 className="font-bold">Icebreaker Tips</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Take turns answering the questions</li>
              <li>• Be honest and vulnerable - it builds connection</li>
              <li>• Follow up with "why?" questions</li>
              <li>• Save meaningful insights to remember later</li>
              <li>• Have fun and laugh together!</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}