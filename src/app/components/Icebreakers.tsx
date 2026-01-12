import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Lock, Unlock, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { usePartner } from '../hooks/usePartner';
import { icebreakersService, IcebreakerWithResponse, ICEBREAKER_CATEGORIES } from '../services/icebreakersService';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

interface IcebreakersProps {
  onBack: () => void;
}

export function Icebreakers({ onBack }: IcebreakersProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { partnerId, partnerName } = usePartner(relationship);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [questions, setQuestions] = useState<IcebreakerWithResponse[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [responseCounts, setResponseCounts] = useState<Record<string, { answered: number; total: number }>>({});

  useEffect(() => {
    if (user && relationship) {
      loadResponseCounts();
    }
  }, [user, relationship]);

  useEffect(() => {
    if (selectedCategory && user && relationship && partnerId) {
      loadQuestions();
    }
  }, [selectedCategory, user, relationship, partnerId]);

  useEffect(() => {
    // Update response text when question changes
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex];
      setResponseText(currentQuestion.user_response?.response_text || '');
      setIsPrivate(currentQuestion.user_response?.is_private ?? false);
    }
  }, [currentQuestionIndex, questions]);

  const loadResponseCounts = async () => {
    if (!user || !relationship) return;

    try {
      const counts = await icebreakersService.getResponseCountByCategory(relationship.id, user.id);
      setResponseCounts(counts);
    } catch (error) {
      console.error('Error loading response counts:', error);
    }
  };

  const loadQuestions = async () => {
    if (!user || !relationship || !partnerId || !selectedCategory) return;

    setIsLoading(true);
    try {
      const data = await icebreakersService.getQuestionsWithResponses(
        relationship.id,
        user.id,
        partnerId,
        selectedCategory
      );
      setQuestions(data);
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error('Error loading questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!user || !relationship || !responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }

    const currentQuestion = questions[currentQuestionIndex];

    setIsSubmitting(true);
    try {
      await icebreakersService.saveResponse(
        currentQuestion.id,
        user.id,
        relationship.id,
        responseText.trim(),
        isPrivate
      );

      toast.success('Response saved!');

      // Reload questions to update response data
      await loadQuestions();
      await loadResponseCounts();

      // Move to next question if available
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    } catch (error) {
      console.error('Error saving response:', error);
      toast.error('Failed to save response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const hasUserResponse = !!currentQuestion?.user_response;
  const hasPartnerResponse = !!currentQuestion?.partner_response;
  const canSeePartnerResponse = hasPartnerResponse && !currentQuestion.partner_response?.is_private;

  // Category selection view
  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF5F7] to-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] px-6 py-4 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="font-['Lora',serif] text-[24px] text-white">Ice Breakers</h1>
              <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-white/90">
                Start meaningful conversations
              </p>
            </div>
          </div>
        </div>

        {/* Category Grid */}
        <div className="px-6 py-6">
          <p className="font-['Nunito_Sans',sans-serif] text-[16px] text-gray-600 mb-6">
            Choose a topic to explore together. Questions range from light and fun to deep and meaningful.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ICEBREAKER_CATEGORIES.map((category) => {
              const count = responseCounts[category.id] || { answered: 0, total: 0 };
              const progress = count.total > 0 ? (count.answered / count.total) * 100 : 0;

              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 shadow-lg border border-white/60 hover:shadow-xl transition-all duration-200 text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${category.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform`}>
                      {category.emoji}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-['Nunito_Sans',sans-serif] text-[18px] font-semibold text-[#2c2c2c] mb-1">
                        {category.label}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <span>{count.answered} of {count.total} answered</span>
                        {count.answered === count.total && count.total > 0 && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      {/* Progress bar */}
                      {count.total > 0 && (
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${category.color} transition-all duration-300`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Question view
  const categoryInfo = ICEBREAKER_CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5F7] to-white">
      {/* Header */}
      <div className={`bg-gradient-to-r ${categoryInfo?.color || 'from-[#FF2D55] to-[#FF6B9D]'} px-6 py-4 shadow-lg`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="font-['Lora',serif] text-[24px] text-white flex items-center gap-2">
              {categoryInfo?.emoji} {categoryInfo?.label}
            </h1>
            <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-white/90">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF2D55]"></div>
        </div>
      ) : questions.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="font-['Nunito_Sans',sans-serif] text-[16px] text-gray-600">
            No questions available in this category.
          </p>
        </div>
      ) : (
        <div className="px-6 py-6 max-w-2xl mx-auto">
          {/* Question Card */}
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 shadow-lg border border-white/60 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-[#FF2D55] flex-shrink-0 mt-1" />
              <h2 className="font-['Lora',serif] text-[20px] text-[#2c2c2c]">
                {currentQuestion?.question_text}
              </h2>
            </div>

            {/* Difficulty Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                currentQuestion?.difficulty === 'easy'
                  ? 'bg-green-100 text-green-700'
                  : currentQuestion?.difficulty === 'medium'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {currentQuestion?.difficulty?.toUpperCase()}
              </span>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                {currentQuestionIndex + 1} / {questions.length}
              </span>
              <Button
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === questions.length - 1}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Your Response */}
            <div className="mb-4">
              <Label className="font-['Nunito_Sans',sans-serif] text-[16px] font-semibold text-[#2c2c2c] mb-2 block">
                Your Response
              </Label>
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Share your thoughts..."
                className="min-h-[120px] resize-none font-['Nunito_Sans',sans-serif] text-[16px]"
              />
            </div>

            {/* Privacy Toggle */}
            <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3">
                {isPrivate ? (
                  <Lock className="w-5 h-5 text-gray-600" />
                ) : (
                  <Unlock className="w-5 h-5 text-gray-600" />
                )}
                <div>
                  <Label htmlFor="privacy-toggle" className="font-['Nunito_Sans',sans-serif] text-[14px] font-semibold cursor-pointer">
                    {isPrivate ? 'Private Response' : 'Visible to Partner'}
                  </Label>
                  <p className="font-['Nunito_Sans',sans-serif] text-[12px] text-gray-600">
                    {isPrivate
                      ? 'Only you can see this response'
                      : `${partnerName || 'Your partner'} can see this response`
                    }
                  </p>
                </div>
              </div>
              <Switch
                id="privacy-toggle"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleSubmitResponse}
              disabled={isSubmitting || !responseText.trim()}
              className="w-full bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] text-white hover:opacity-90"
            >
              {isSubmitting ? 'Saving...' : hasUserResponse ? 'Update Response' : 'Save Response'}
            </Button>
          </div>

          {/* Partner's Response */}
          {canSeePartnerResponse && (
            <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 shadow-lg border border-white/60">
              <h3 className="font-['Nunito_Sans',sans-serif] text-[18px] font-semibold text-[#2c2c2c] mb-3">
                {partnerName || 'Your Partner'}'s Response
              </h3>
              <p className="font-['Nunito_Sans',sans-serif] text-[16px] text-gray-700 whitespace-pre-wrap">
                {currentQuestion?.partner_response?.response_text}
              </p>
              <p className="font-['Nunito_Sans',sans-serif] text-[12px] text-gray-500 mt-3">
                Answered {new Date(currentQuestion?.partner_response?.responded_at || '').toLocaleDateString()}
              </p>
            </div>
          )}

          {hasPartnerResponse && currentQuestion?.partner_response?.is_private && (
            <div className="bg-gray-100 rounded-3xl p-6 text-center">
              <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-gray-600">
                {partnerName || 'Your partner'} has answered this question privately
              </p>
            </div>
          )}

          {!hasPartnerResponse && hasUserResponse && (
            <div className="bg-blue-50 rounded-3xl p-6 text-center">
              <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-blue-700">
                {partnerName || 'Your partner'} hasn't answered this question yet
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
