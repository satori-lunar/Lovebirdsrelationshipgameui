import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Lock, Unlock, CheckCircle2, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { usePartner } from '../hooks/usePartner';
import { icebreakersService, IcebreakerWithResponse, ICEBREAKER_CATEGORIES } from '../services/icebreakersService';
import { usePartnerInsights } from '../hooks/usePartnerInsights';
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
  const { saveIcebreakerInsight, isSaving } = usePartnerInsights();

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

      // Also save as insight
      try {
        await saveIcebreakerInsight({
          partnerId,
          title: `Icebreaker: ${currentQuestion.question}`,
          content: `We discussed: "${currentQuestion.question}". My response: "${responseText.trim()}"`
        });
      } catch (error) {
        console.error('Failed to save insight:', error);
        // Don't fail the whole operation if insight saving fails
      }

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
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Icebreakers</h1>
              <p className="text-white/90 text-sm">Fun questions to connect deeper</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-[#FF2D55] to-[#FF6B9D] rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Category</h2>
            <p className="text-gray-600">Pick a topic to explore with {partnerName}</p>
          </div>

          <div className="space-y-4">
            {ICEBREAKER_CATEGORIES.map((category) => {
              const count = responseCounts[category.id] || { answered: 0, total: 0 };
              const progress = count.total > 0 ? (count.answered / count.total) * 100 : 0;

              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className="w-full bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#FF2D55] to-[#FF6B9D] rounded-xl flex items-center justify-center">
                        <category.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                        <p className="text-sm text-gray-600">{count.answered}/{count.total} answered</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>

                  {count.total > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Questions view
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF5F7] to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] px-6 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white truncate">
              {ICEBREAKER_CATEGORIES.find(c => c.id === selectedCategory)?.name}
            </h1>
            <p className="text-white/90 text-sm">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-[#FF2D55] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : currentQuestion ? (
          <div className="space-y-6">
            {/* Question */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {currentQuestion.question}
              </h2>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] h-2 rounded-full transition-all"
                  style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Partner's Response */}
            {canSeePartnerResponse && (
              <div className="bg-gradient-to-r from-[#FF2D55]/10 to-[#FF6B9D]/10 rounded-2xl p-6 border border-[#FF2D55]/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{partnerName}'s Response</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {currentQuestion.partner_response.response_text}
                </p>
              </div>
            )}

            {/* Your Response */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Your Response</h3>
                {hasUserResponse && (
                  <div className="flex items-center gap-2">
                    <Switch
                      id="private"
                      checked={isPrivate}
                      onCheckedChange={setIsPrivate}
                    />
                    <Label htmlFor="private" className="text-sm flex items-center gap-1">
                      {isPrivate ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      {isPrivate ? 'Private' : 'Public'}
                    </Label>
                  </div>
                )}
              </div>

              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Share your thoughts..."
                className="min-h-[120px] resize-none"
              />

              <Button
                onClick={handleSubmitResponse}
                disabled={isSubmitting || !responseText.trim()}
                className="w-full mt-4 bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] hover:from-[#E0254A] hover:to-[#E55A8A]"
              >
                {isSubmitting ? 'Saving...' : hasUserResponse ? 'Update Response' : 'Save Response'}
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <Button
                onClick={handlePrevQuestion}
                disabled={currentQuestionIndex === 0}
                variant="outline"
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button
                onClick={handleNextQuestion}
                disabled={currentQuestionIndex === questions.length - 1}
                className="flex-1 bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] hover:from-[#E0254A] hover:to-[#E55A8A]"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No questions available in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}