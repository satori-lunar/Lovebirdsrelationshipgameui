import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Users, MessageCircle, Sparkles, ThumbsUp, Lock, Check, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import {
  relationshipNeedsService,
  NeedType,
  NeedIntensity,
  DurationOfIssue,
  RelationshipNeed,
  needTypeLabels,
  needTypeDescriptions,
  durationLabels,
} from '../services/relationshipNeedsService';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface SomethingFeelsMissingProps {
  onBack: () => void;
}

const needTypeIcons: Record<NeedType, React.ReactNode> = {
  affection: <Heart className="w-5 h-5" />,
  dates: <Sparkles className="w-5 h-5" />,
  quality_time: <Users className="w-5 h-5" />,
  compliments: <MessageCircle className="w-5 h-5" />,
  appreciation: <ThumbsUp className="w-5 h-5" />,
  communication: <MessageCircle className="w-5 h-5" />,
  intimacy: <Heart className="w-5 h-5" />,
  support: <Users className="w-5 h-5" />,
};

const needTypeColors: Record<NeedType, string> = {
  affection: 'from-pink-500 to-rose-500',
  dates: 'from-purple-500 to-indigo-500',
  quality_time: 'from-blue-500 to-cyan-500',
  compliments: 'from-amber-500 to-orange-500',
  appreciation: 'from-green-500 to-emerald-500',
  communication: 'from-teal-500 to-cyan-500',
  intimacy: 'from-red-500 to-pink-500',
  support: 'from-violet-500 to-purple-500',
};

export function SomethingFeelsMissing({ onBack }: SomethingFeelsMissingProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();

  const [selectedNeed, setSelectedNeed] = useState<NeedType | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [intensity, setIntensity] = useState<NeedIntensity>('moderate');
  const [notes, setNotes] = useState('');
  const [wishPartnerWouldDo, setWishPartnerWouldDo] = useState('');
  const [wishPartnerUnderstood, setWishPartnerUnderstood] = useState('');
  const [durationOfIssue, setDurationOfIssue] = useState<DurationOfIssue>('few_weeks');
  const [haveTalkedAboutIt, setHaveTalkedAboutIt] = useState<boolean>(false);
  const [conversationDetails, setConversationDetails] = useState('');
  const [howItAffectsMe, setHowItAffectsMe] = useState('');
  const [idealOutcome, setIdealOutcome] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeNeeds, setActiveNeeds] = useState<RelationshipNeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && relationship) {
      loadActiveNeeds();
    }
  }, [user, relationship]);

  const loadActiveNeeds = async () => {
    if (!user || !relationship) return;

    setIsLoading(true);
    try {
      const needs = await relationshipNeedsService.getActiveNeeds(user.id, relationship.id);
      setActiveNeeds(needs);
    } catch (error) {
      console.error('Error loading needs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !relationship || !selectedNeed) return;

    setIsSubmitting(true);
    try {
      await relationshipNeedsService.reportNeed(
        relationship.id,
        user.id,
        selectedNeed,
        {
          intensity,
          notes: notes.trim() || undefined,
          wish_partner_would_do: wishPartnerWouldDo.trim() || undefined,
          wish_partner_understood: wishPartnerUnderstood.trim() || undefined,
          duration_of_issue: durationOfIssue,
          have_talked_about_it: haveTalkedAboutIt,
          conversation_details: conversationDetails.trim() || undefined,
          how_it_affects_me: howItAffectsMe.trim() || undefined,
          ideal_outcome: idealOutcome.trim() || undefined,
        }
      );

      toast.success('Your feelings have been noted', {
        description: 'We\'ll help guide your partner with gentle suggestions',
      });

      // Reset form
      setSelectedNeed(null);
      setCurrentStep(1);
      setIntensity('moderate');
      setNotes('');
      setWishPartnerWouldDo('');
      setWishPartnerUnderstood('');
      setDurationOfIssue('few_weeks');
      setHaveTalkedAboutIt(false);
      setConversationDetails('');
      setHowItAffectsMe('');
      setIdealOutcome('');

      // Reload active needs
      await loadActiveNeeds();

      // Generate suggestions for partner
      await relationshipNeedsService.generateSuggestions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToNextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return selectedNeed !== null;
      case 2:
        return wishPartnerWouldDo.trim().length > 0 && wishPartnerUnderstood.trim().length > 0;
      case 3:
        return true; // Duration and conversation fields are optional
      case 4:
        return howItAffectsMe.trim().length > 0;
      default:
        return false;
    }
  };

  const handleResolve = async (needId: string) => {
    try {
      await relationshipNeedsService.resolveNeed(needId);
      toast.success('Marked as resolved!');
      await loadActiveNeeds();
    } catch (error: any) {
      toast.error(error.message || 'Failed to resolve');
    }
  };

  const handleDelete = async (needId: string) => {
    try {
      await relationshipNeedsService.deleteNeed(needId);
      toast.success('Removed');
      await loadActiveNeeds();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove');
    }
  };

  if (!relationship) {
    return (
      <div className="bg-[#F5F0F6] flex flex-col h-screen w-full max-w-[430px] mx-auto items-center justify-center p-6">
        <Heart className="w-16 h-16 text-pink-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Connect with Your Partner</h2>
        <p className="text-gray-600 text-center mb-6">
          You need to be in a relationship to use this feature
        </p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F0F6] flex flex-col h-screen w-full max-w-[430px] mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] px-5 pt-12 pb-6">
        <button
          onClick={onBack}
          className="mb-4 p-2 rounded-full hover:bg-white/10 transition-colors inline-flex items-center"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="font-['Lora',serif] text-[32px] text-white mb-2">Something Feels Missing?</h1>
        <p className="font-['Nunito_Sans',sans-serif] text-[16px] text-white/90" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
          Share what you need, and we'll guide your partner with subtle suggestions
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="space-y-6">
          {/* Privacy Notice */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-4 border border-purple-200">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-gray-700 leading-relaxed" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  <span className="font-semibold">This is private.</span> Your partner will never see what you wrote here. Instead, they'll receive helpful suggestions to improve your relationship naturally.
                </p>
              </div>
            </div>
          </div>

          {/* Active Needs */}
          {activeNeeds.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-['Nunito_Sans',sans-serif] text-[18px] font-semibold text-[#2c2c2c]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                What You've Shared
              </h3>
              {activeNeeds.map((need) => (
                <div
                  key={need.id}
                  className="bg-white/70 backdrop-blur-lg rounded-2xl p-4 border border-white/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${needTypeColors[need.need_type]} flex items-center justify-center text-white flex-shrink-0`}>
                        {needTypeIcons[need.need_type]}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-['Nunito_Sans',sans-serif] text-[16px] font-semibold text-[#2c2c2c] mb-1" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                          {needTypeLabels[need.need_type]}
                        </h4>
                        {need.notes && (
                          <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-gray-600 mb-2" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                            {need.notes}
                          </p>
                        )}
                        <p className="font-['Nunito_Sans',sans-serif] text-[12px] text-gray-500" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                          Intensity: {need.intensity}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolve(need.id)}
                        className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                        title="Mark as resolved"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(need.id)}
                        className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Multi-Step Form */}
          {selectedNeed ? (
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-5 border border-white/60 space-y-4">
              {/* Progress Indicator */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 flex-1">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-2 flex-1 rounded-full transition-all ${
                        step <= currentStep
                          ? 'bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D]'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="ml-3 text-sm font-medium text-gray-600">
                  {currentStep}/4
                </span>
              </div>

              {/* Step 1: Select Need & Intensity */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${needTypeColors[selectedNeed]} flex items-center justify-center text-white`}>
                      {needTypeIcons[selectedNeed]}
                    </div>
                    <div>
                      <h4 className="font-['Nunito_Sans',sans-serif] text-[18px] font-semibold text-[#2c2c2c]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                        {needTypeLabels[selectedNeed]}
                      </h4>
                      <p className="font-['Nunito_Sans',sans-serif] text-[13px] text-gray-600" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                        {needTypeDescriptions[selectedNeed]}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="font-['Nunito_Sans',sans-serif] text-[14px] font-semibold text-[#2c2c2c] mb-2 block" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                      How much does this affect you?
                    </label>
                    <div className="flex gap-2">
                      {(['slight', 'moderate', 'significant'] as NeedIntensity[]).map((level) => (
                        <button
                          key={level}
                          onClick={() => setIntensity(level)}
                          className={`flex-1 py-3 px-3 rounded-lg text-sm font-medium transition-all ${
                            intensity === level
                              ? 'bg-[#FF2D55] text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedNeed(null)}
                    className="text-sm text-[#FF2D55] underline"
                  >
                    Choose a different need
                  </button>
                </div>
              )}

              {/* Step 2: What You Wish */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h4 className="font-['Nunito_Sans',sans-serif] text-[16px] font-semibold text-[#2c2c2c]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                    Help us understand better
                  </h4>

                  <div>
                    <Label htmlFor="wish-do" className="text-[14px] font-semibold mb-2">
                      What do you wish your partner would do?
                    </Label>
                    <Textarea
                      id="wish-do"
                      value={wishPartnerWouldDo}
                      onChange={(e) => setWishPartnerWouldDo(e.target.value)}
                      placeholder="e.g., 'I wish they would initiate more quality time together without me always having to ask...'"
                      rows={3}
                      className="text-[14px]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="wish-understand" className="text-[14px] font-semibold mb-2">
                      What do you wish your partner understood?
                    </Label>
                    <Textarea
                      id="wish-understand"
                      value={wishPartnerUnderstood}
                      onChange={(e) => setWishPartnerUnderstood(e.target.value)}
                      placeholder="e.g., 'That when they're on their phone during dinner, it makes me feel like I'm not important...'"
                      rows={3}
                      className="text-[14px]"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Duration & Communication */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h4 className="font-['Nunito_Sans',sans-serif] text-[16px] font-semibold text-[#2c2c2c]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                    Context about this issue
                  </h4>

                  <div>
                    <Label className="text-[14px] font-semibold mb-3 block">
                      How long has this been going on?
                    </Label>
                    <RadioGroup value={durationOfIssue} onValueChange={(v) => setDurationOfIssue(v as DurationOfIssue)}>
                      {(Object.keys(durationLabels) as DurationOfIssue[]).map((duration) => (
                        <div key={duration} className="flex items-center space-x-2 py-2">
                          <RadioGroupItem value={duration} id={duration} />
                          <Label htmlFor={duration} className="font-normal cursor-pointer">
                            {durationLabels[duration]}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label className="text-[14px] font-semibold mb-3 block">
                      Have you talked to your partner about this?
                    </Label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setHaveTalkedAboutIt(true)}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                          haveTalkedAboutIt
                            ? 'bg-[#FF2D55] text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setHaveTalkedAboutIt(false)}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                          !haveTalkedAboutIt
                            ? 'bg-[#FF2D55] text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {haveTalkedAboutIt && (
                    <div>
                      <Label htmlFor="conversation" className="text-[14px] font-semibold mb-2">
                        Tell us about that conversation (Optional)
                      </Label>
                      <Textarea
                        id="conversation"
                        value={conversationDetails}
                        onChange={(e) => setConversationDetails(e.target.value)}
                        placeholder="What did you say? How did they respond?"
                        rows={3}
                        className="text-[14px]"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Impact & Ideal Outcome */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <h4 className="font-['Nunito_Sans',sans-serif] text-[16px] font-semibold text-[#2c2c2c]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                    Almost there...
                  </h4>

                  <div>
                    <Label htmlFor="affects-me" className="text-[14px] font-semibold mb-2">
                      How does this affect you?
                    </Label>
                    <Textarea
                      id="affects-me"
                      value={howItAffectsMe}
                      onChange={(e) => setHowItAffectsMe(e.target.value)}
                      placeholder="e.g., 'It makes me feel lonely and disconnected from them...'"
                      rows={3}
                      className="text-[14px]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ideal-outcome" className="text-[14px] font-semibold mb-2">
                      What would the ideal outcome look like? (Optional)
                    </Label>
                    <Textarea
                      id="ideal-outcome"
                      value={idealOutcome}
                      onChange={(e) => setIdealOutcome(e.target.value)}
                      placeholder="e.g., 'We would spend at least 30 minutes together each evening without phones...'"
                      rows={3}
                      className="text-[14px]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="additional-notes" className="text-[14px] font-semibold mb-2">
                      Any other thoughts? (Optional)
                    </Label>
                    <Textarea
                      id="additional-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Anything else you'd like to add..."
                      rows={2}
                      className="text-[14px]"
                    />
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-2">
                {currentStep > 1 && (
                  <Button
                    onClick={goToPreviousStep}
                    variant="outline"
                    className="flex-1 py-5"
                  >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Back
                  </Button>
                )}

                {currentStep < 4 ? (
                  <Button
                    onClick={goToNextStep}
                    disabled={!canProceedToNextStep()}
                    className="flex-1 bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] text-white py-5"
                  >
                    Continue
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !canProceedToNextStep()}
                    className="flex-1 bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] text-white py-5"
                  >
                    {isSubmitting ? 'Saving...' : 'Share This Need'}
                  </Button>
                )}
              </div>

              <p className="font-['Nunito_Sans',sans-serif] text-[11px] text-center text-gray-500 mt-2" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                🔒 Everything you share here is completely private
              </p>
            </div>
          ) : (
            /* Need Selection */
            <div className="space-y-3">
              <h3 className="font-['Nunito_Sans',sans-serif] text-[18px] font-semibold text-[#2c2c2c]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                What feels missing?
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(needTypeLabels) as NeedType[]).map((type) => {
                  const isAlreadyActive = activeNeeds.some(n => n.need_type === type);

                  return (
                    <button
                      key={type}
                      onClick={() => !isAlreadyActive && setSelectedNeed(type)}
                      disabled={isAlreadyActive}
                      className={`p-4 rounded-2xl border-2 transition-all text-left ${
                        isAlreadyActive
                          ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                          : 'bg-white/70 border-white/60 hover:border-[#FF2D55]/50 hover:shadow-lg'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${needTypeColors[type]} flex items-center justify-center text-white mb-2`}>
                        {needTypeIcons[type]}
                      </div>
                      <h4 className="font-['Nunito_Sans',sans-serif] text-[14px] font-semibold text-[#2c2c2c] mb-1" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                        {needTypeLabels[type]}
                      </h4>
                      <p className="font-['Nunito_Sans',sans-serif] text-[11px] text-gray-600" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                        {needTypeDescriptions[type]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
