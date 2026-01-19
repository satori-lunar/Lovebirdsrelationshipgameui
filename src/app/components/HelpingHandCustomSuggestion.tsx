import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Plus, X, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { useQueryClient } from '@tanstack/react-query';
import { helpingHandService } from '../services/helpingHandService';
import { aiHelpingHandService } from '../services/aiHelpingHandService';
import { toast } from 'sonner';
import {
  HelpingHandCustomSuggestionProps,
  EffortLevel,
  BestTiming,
  LoveLanguage,
  SuggestionStep
} from '../types/helpingHand';

const effortLevels: { id: EffortLevel; label: string }[] = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'low', label: 'Low' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'high', label: 'High' }
];

const timingOptions: { id: BestTiming; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'weekend', label: 'Weekend' },
  { id: 'any', label: 'Anytime' }
];

const loveLanguages: { id: LoveLanguage; label: string; emoji: string }[] = [
  { id: 'words', label: 'Words of Affirmation', emoji: '💬' },
  { id: 'quality_time', label: 'Quality Time', emoji: '⏰' },
  { id: 'gifts', label: 'Gifts', emoji: '🎁' },
  { id: 'acts', label: 'Acts of Service', emoji: '🤝' },
  { id: 'touch', label: 'Physical Touch', emoji: '🤗' }
];

export default function HelpingHandCustomSuggestion({
  category,
  onBack,
  onSave,
  weekStartDate
}: HelpingHandCustomSuggestionProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<Omit<SuggestionStep, 'step'>[]>([]);
  const [timeEstimate, setTimeEstimate] = useState(30);
  const [effortLevel, setEffortLevel] = useState<EffortLevel>('low');
  const [bestTiming, setBestTiming] = useState<BestTiming>('any');
  const [selectedLoveLanguages, setSelectedLoveLanguages] = useState<LoveLanguage[]>([]);
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false);
  const [aiGeneratedSteps, setAiGeneratedSteps] = useState<Omit<SuggestionStep, 'step'>[] | null>(null);

  const handleAddStep = () => {
    setSteps([...steps, { action: '', tip: '' }]);
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, field: 'action' | 'tip', value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const handleLoveLanguageToggle = (lang: LoveLanguage) => {
    setSelectedLoveLanguages(prev =>
      prev.includes(lang)
        ? prev.filter(l => l !== lang)
        : [...prev, lang]
    );
  };

  const handleGenerateAISteps = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Please enter a title and description first');
      return;
    }

    if (!user || !relationship) {
      toast.error('Please sign in to continue');
      return;
    }

    try {
      setIsGeneratingSteps(true);
      const generatedSteps = await aiHelpingHandService.generateStepsForCustomSuggestion({
        userId: user.id,
        relationshipId: relationship.id,
        categoryId: category.id,
        title: title.trim(),
        description: description.trim(),
        timeEstimateMinutes: timeEstimate,
        effortLevel
      });
      
      setAiGeneratedSteps(generatedSteps);
      toast.success(`Generated ${generatedSteps.length} AI-powered steps!`);
    } catch (error) {
      console.error('Failed to generate AI steps:', error);
      toast.error('Failed to generate steps. Please try again.');
    } finally {
      setIsGeneratingSteps(false);
    }
  };

  const handleAcceptAISteps = () => {
    if (aiGeneratedSteps) {
      setSteps(aiGeneratedSteps);
      setAiGeneratedSteps(null);
      toast.success('AI steps added! You can modify them as needed.');
    }
  };

  const handleAcceptAIStep = (index: number) => {
    if (aiGeneratedSteps && aiGeneratedSteps[index]) {
      const newSteps = [...steps, aiGeneratedSteps[index]];
      setSteps(newSteps);
      const remaining = aiGeneratedSteps.filter((_, i) => i !== index);
      setAiGeneratedSteps(remaining.length > 0 ? remaining : null);
      toast.success('Step added!');
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    if (!user || !relationship) {
      toast.error('Please sign in to continue');
      return;
    }

    try {
      setIsSubmitting(true);

      // Format steps with step numbers
      const formattedSteps: SuggestionStep[] = steps
        .filter(s => s.action.trim())
        .map((s, index) => ({
          step: index + 1,
          action: s.action,
          tip: s.tip || undefined
        }));

      const request = {
        userId: user.id,
        relationshipId: relationship.id,
        weekStartDate,
        categoryId: category.id,
        title: title.trim(),
        description: description.trim(),
        detailedSteps: formattedSteps.length > 0 ? formattedSteps : undefined,
        timeEstimateMinutes: timeEstimate,
        effortLevel,
        bestTiming: bestTiming !== 'any' ? bestTiming : undefined,
        loveLanguageAlignment: selectedLoveLanguages.length > 0 ? selectedLoveLanguages : undefined
      };

      await helpingHandService.createCustomSuggestion(request);
      
      // Invalidate queries to refresh the suggestions list
      queryClient.invalidateQueries({ queryKey: ['helping-hand-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['helping-hand-category-counts'] });
      
      toast.success('Your custom suggestion has been created!');
      onSave(request);
    } catch (error) {
      console.error('Failed to create custom suggestion:', error);
      toast.error('Failed to create suggestion. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const partnerName = relationship?.partnerName || 'your partner';

  return (
    <div className="min-h-screen bg-gradient-to-b from-warm-cream to-soft-purple-light pb-20">
      {/* Header */}
      <div className="bg-white border-b border-warm-beige/30 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-warm-beige/20 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-text-warm" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-text-warm">
                Create Your Own
              </h1>
              <p className="text-sm text-text-warm-light">
                {category.displayName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Intro card */}
        <Card className="mb-6 border-warm-pink/20 bg-gradient-to-r from-warm-pink/5 to-soft-purple/5">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="shrink-0">
                <div className="w-10 h-10 rounded-full bg-warm-pink/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-warm-pink" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-text-warm mb-1">
                  Share your idea!
                </h3>
                <p className="text-sm text-text-warm-light">
                  Create a custom suggestion for supporting {partnerName}. Be specific and actionable!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Title */}
        <div className="mb-6">
          <Label htmlFor="title" className="text-base font-semibold text-text-warm mb-2 block">
            Title <span className="text-warm-pink">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Make their favorite breakfast"
            maxLength={100}
            className="text-base"
          />
          <div className="text-xs text-text-warm-light text-right mt-1">
            {title.length}/100
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <Label htmlFor="description" className="text-base font-semibold text-text-warm mb-2 block">
            Description <span className="text-warm-pink">*</span>
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What makes this special? Why would this mean a lot to them?"
            className="min-h-24 resize-none"
            maxLength={500}
          />
          <div className="text-xs text-text-warm-light text-right mt-1">
            {description.length}/500
          </div>
        </div>

        {/* Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-base font-semibold text-text-warm">
              Steps (Optional)
            </Label>
            <div className="flex gap-2">
              {title.trim() && description.trim() && (
                <Button
                  onClick={handleGenerateAISteps}
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingSteps}
                  className="text-soft-purple border-soft-purple hover:bg-soft-purple/10"
                >
                  {isGeneratingSteps ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1" />
                      AI Generate Steps
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={handleAddStep}
                variant="outline"
                size="sm"
                className="text-warm-pink border-warm-pink hover:bg-warm-pink/10"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            </div>
          </div>

          {/* AI Generated Steps Preview */}
          {aiGeneratedSteps && aiGeneratedSteps.length > 0 && (
            <Card className="mb-4 border-soft-purple/30 bg-gradient-to-r from-soft-purple/5 to-warm-pink/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-soft-purple" />
                    <h4 className="font-semibold text-text-warm">AI-Generated Steps</h4>
                  </div>
                  <Button
                    onClick={handleAcceptAISteps}
                    variant="outline"
                    size="sm"
                    className="text-soft-purple border-soft-purple hover:bg-soft-purple/10"
                  >
                    Accept All
                  </Button>
                </div>
                <div className="space-y-2">
                  {aiGeneratedSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-white rounded border border-soft-purple/20">
                      <div className="shrink-0 w-6 h-6 rounded-full bg-soft-purple/10 flex items-center justify-center text-xs font-semibold text-soft-purple">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text-warm">{step.action}</p>
                        {step.tip && (
                          <p className="text-xs text-text-warm-light mt-1">💡 {step.tip}</p>
                        )}
                        {step.estimatedMinutes && (
                          <p className="text-xs text-text-warm-light mt-1">
                            ⏱️ ~{step.estimatedMinutes} min
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => handleAcceptAIStep(index)}
                        variant="ghost"
                        size="sm"
                        className="text-soft-purple hover:text-soft-purple hover:bg-soft-purple/10"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {steps.length > 0 ? (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <Card key={index} className="border-warm-beige/30">
                  <CardContent className="p-3">
                    <div className="flex gap-2">
                      <div className="shrink-0 w-6 h-6 rounded-full bg-warm-pink/10 flex items-center justify-center text-xs font-semibold text-warm-pink">
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input
                          value={step.action}
                          onChange={(e) => handleStepChange(index, 'action', e.target.value)}
                          placeholder="What to do..."
                          className="text-sm"
                        />
                        <Input
                          value={step.tip || ''}
                          onChange={(e) => handleStepChange(index, 'tip', e.target.value)}
                          placeholder="💡 Optional tip..."
                          className="text-sm"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveStep(index)}
                        className="shrink-0 p-1 hover:bg-red-100 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-warm-light text-center py-4">
              No steps added yet. Steps help break down the suggestion into actionable parts.
            </p>
          )}
        </div>

        {/* Time estimate */}
        <div className="mb-6">
          <Label className="text-base font-semibold text-text-warm mb-3 block">
            Time Estimate
          </Label>
          <div className="px-2">
            <Slider
              value={[timeEstimate]}
              onValueChange={([value]) => setTimeEstimate(value)}
              min={5}
              max={180}
              step={5}
              className="mb-2"
            />
            <div className="flex justify-between text-sm">
              <span className="text-text-warm-light">5 min</span>
              <span className="font-semibold text-warm-pink">
                {helpingHandService.formatTimeEstimate(timeEstimate)}
              </span>
              <span className="text-text-warm-light">3 hours</span>
            </div>
          </div>
        </div>

        {/* Effort level */}
        <div className="mb-6">
          <Label className="text-base font-semibold text-text-warm mb-3 block">
            Effort Level
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {effortLevels.map(level => (
              <button
                key={level.id}
                onClick={() => setEffortLevel(level.id)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  effortLevel === level.id
                    ? 'border-warm-pink bg-warm-pink/10 text-warm-pink font-semibold'
                    : 'border-warm-beige text-text-warm hover:border-warm-pink'
                }`}
              >
                <div className="text-sm text-center capitalize">
                  {level.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Best timing */}
        <div className="mb-6">
          <Label htmlFor="timing" className="text-base font-semibold text-text-warm mb-3 block">
            Best Timing
          </Label>
          <Select value={bestTiming} onValueChange={(value) => setBestTiming(value as BestTiming)}>
            <SelectTrigger id="timing">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timingOptions.map(option => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Love languages */}
        <div className="mb-6">
          <Label className="text-base font-semibold text-text-warm mb-3 block">
            Love Languages This Serves (Optional)
          </Label>
          <div className="space-y-2">
            {loveLanguages.map(lang => (
              <Card
                key={lang.id}
                className={`cursor-pointer transition-all ${
                  selectedLoveLanguages.includes(lang.id)
                    ? 'border-warm-pink bg-warm-pink/5'
                    : 'border-warm-beige hover:bg-warm-beige/20'
                }`}
                onClick={() => handleLoveLanguageToggle(lang.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedLoveLanguages.includes(lang.id)
                        ? 'border-warm-pink bg-warm-pink'
                        : 'border-warm-beige'
                    }`}>
                      {selectedLoveLanguages.includes(lang.id) && (
                        <div className="w-2 h-2 bg-white rounded-sm" />
                      )}
                    </div>
                    <span className="text-xl">{lang.emoji}</span>
                    <div className="flex-1 text-sm font-medium text-text-warm">
                      {lang.label}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !title.trim() || !description.trim()}
          className="w-full bg-gradient-to-r from-warm-pink to-soft-purple hover:opacity-90 text-white"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Save Suggestion
            </>
          )}
        </Button>

        {/* Help text */}
        <p className="text-xs text-text-warm-light text-center mt-4">
          Your custom suggestion will appear in {category.displayName} alongside AI suggestions
        </p>
      </div>
    </div>
  );
}
