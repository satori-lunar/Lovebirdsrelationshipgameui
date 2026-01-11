import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, Users, MessageCircle, Sparkles, ThumbsUp, Lock, Check, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import {
  relationshipNeedsService,
  NeedType,
  NeedIntensity,
  RelationshipNeed,
  needTypeLabels,
  needTypeDescriptions,
} from '../services/relationshipNeedsService';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

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
  const [intensity, setIntensity] = useState<NeedIntensity>('moderate');
  const [notes, setNotes] = useState('');
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
        intensity,
        notes.trim() || undefined
      );

      toast.success('Your feelings have been noted', {
        description: 'We\'ll help guide your partner with gentle suggestions',
      });

      // Reset form
      setSelectedNeed(null);
      setIntensity('moderate');
      setNotes('');

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

          {/* Need Selection */}
          <div className="space-y-3">
            <h3 className="font-['Nunito_Sans',sans-serif] text-[18px] font-semibold text-[#2c2c2c]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
              What feels missing?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(needTypeLabels) as NeedType[]).map((type) => {
                const isSelected = selectedNeed === type;
                const isAlreadyActive = activeNeeds.some(n => n.need_type === type);

                return (
                  <button
                    key={type}
                    onClick={() => !isAlreadyActive && setSelectedNeed(type)}
                    disabled={isAlreadyActive}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      isAlreadyActive
                        ? 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'bg-white border-[#FF2D55] shadow-lg'
                        : 'bg-white/70 border-white/60 hover:border-[#FF2D55]/50'
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

          {/* Intensity and Notes (shown when a need is selected) */}
          {selectedNeed && (
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl p-5 border border-white/60 space-y-4">
              <div>
                <label className="font-['Nunito_Sans',sans-serif] text-[14px] font-semibold text-[#2c2c2c] mb-2 block" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  How much does this affect you?
                </label>
                <div className="flex gap-2">
                  {(['slight', 'moderate', 'significant'] as NeedIntensity[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setIntensity(level)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        intensity === level
                          ? 'bg-[#FF2D55] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-['Nunito_Sans',sans-serif] text-[14px] font-semibold text-[#2c2c2c] mb-2 block" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  Any additional context? (Optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any details that might help..."
                  rows={3}
                  className="text-[14px]"
                />
                <p className="font-['Nunito_Sans',sans-serif] text-[11px] text-gray-500 mt-2" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  Remember: Your partner won't see these notes
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] text-white py-6 text-[16px] font-semibold"
              >
                {isSubmitting ? 'Saving...' : 'Share This Need'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
