import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MessageCircle, Sparkles, MapPin, Star, Lock, Unlock, CheckCircle2, Circle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { usePartner } from '../hooks/usePartner';
import { coupleChallengesService, ChallengeCategory, ChallengeWithResponse } from '../services/coupleChallengesService';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

interface CouplesChallengesProps {
  onBack: () => void;
}

const categoryConfig = {
  memory_reflection: {
    name: 'Memory & Reflection',
    icon: Heart,
    color: '#FF2D55',
    gradient: 'from-[#FF2D55] to-[#FF6B9D]',
    description: 'Share memories and reflect on your journey together',
    emoji: '💭',
  },
  communication_emotional: {
    name: 'Communication & Connection',
    icon: MessageCircle,
    color: '#8B5CF6',
    gradient: 'from-[#8B5CF6] to-[#7C3AED]',
    description: 'Deepen your emotional connection through honest communication',
    emoji: '💬',
  },
  appreciation_affirmation: {
    name: 'Appreciation & Affirmation',
    icon: Star,
    color: '#F59E0B',
    gradient: 'from-[#F59E0B] to-[#D97706]',
    description: 'Express gratitude and affirm each other',
    emoji: '💕',
  },
  fun_playful: {
    name: 'Fun & Playful',
    icon: Sparkles,
    color: '#10B981',
    gradient: 'from-[#10B981] to-[#059669]',
    description: 'Keep things light and playful with fun challenges',
    emoji: '🎉',
  },
  future_vision: {
    name: 'Future & Vision',
    icon: MapPin,
    color: '#06B6D4',
    gradient: 'from-[#06B6D4] to-[#0891B2]',
    description: 'Dream together about your shared future',
    emoji: '🔮',
  },
};

export function CouplesChallenges({ onBack }: CouplesChallengesProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { partnerId, partnerName } = usePartner(relationship);

  const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory | null>(null);
  const [challenges, setChallenges] = useState<ChallengeWithResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeWithResponse | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisibleToPartner, setIsVisibleToPartner] = useState(true);

  useEffect(() => {
    if (selectedCategory && user && relationship && partnerId) {
      loadChallenges();
    }
  }, [selectedCategory, user, relationship, partnerId]);

  const loadChallenges = async () => {
    if (!user || !relationship || !partnerId || !selectedCategory) return;

    setIsLoading(true);
    try {
      const data = await coupleChallengesService.getChallengesWithResponses(
        relationship.id,
        user.id,
        partnerId,
        selectedCategory
      );
      setChallenges(data);
    } catch (error) {
      console.error('Error loading challenges:', error);
      toast.error('Failed to load challenges');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChallenge = (challenge: ChallengeWithResponse) => {
    setSelectedChallenge(challenge);
    setResponseText(challenge.myResponse?.response || '');
    setIsVisibleToPartner(challenge.myResponse?.is_visible_to_partner ?? true);
  };

  const handleCloseDialog = () => {
    setSelectedChallenge(null);
    setResponseText('');
    setIsVisibleToPartner(true);
  };

  const handleSubmitResponse = async () => {
    if (!user || !relationship || !selectedChallenge || !responseText.trim()) {
      toast.error('Please write a response');
      return;
    }

    setIsSubmitting(true);
    try {
      await coupleChallengesService.submitResponse(
        selectedChallenge.id,
        relationship.id,
        user.id,
        responseText.trim(),
        isVisibleToPartner
      );
      toast.success('Response saved!');
      handleCloseDialog();
      loadChallenges();
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to save response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getChallengeCompletionIcon = (challenge: ChallengeWithResponse) => {
    const hasMyResponse = !!challenge.myResponse;
    const hasPartnerResponse = !!challenge.partnerResponse;

    if (hasMyResponse && hasPartnerResponse) {
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    } else if (hasMyResponse || hasPartnerResponse) {
      return <CheckCircle2 className="w-5 h-5 text-orange-500" />;
    }
    return <Circle className="w-5 h-5 text-gray-300" />;
  };

  if (!selectedCategory) {
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
          <h1 className="font-['Lora',serif] text-[32px] text-white mb-2">Couple's Challenges</h1>
          <p className="font-['Nunito_Sans',sans-serif] text-[16px] text-white/90" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
            Choose a category to begin your journey together
          </p>
        </div>

        {/* Category Selection */}
        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="space-y-4">
            {(Object.keys(categoryConfig) as ChallengeCategory[]).map((category) => {
              const config = categoryConfig[category];
              const Icon = config.icon;

              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className="w-full bg-white/70 backdrop-blur-lg rounded-3xl p-6 text-left shadow-md border border-white/60 hover:shadow-xl transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                      <Icon className="w-7 h-7 text-white" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{config.emoji}</span>
                        <h3 className="font-['Nunito_Sans',sans-serif] text-[18px] text-[#2c2c2c] font-semibold" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                          {config.name}
                        </h3>
                      </div>
                      <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-[#6d6d6d]" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                        {config.description}
                      </p>
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

  // Category-specific view
  const config = categoryConfig[selectedCategory];
  const Icon = config.icon;

  return (
    <div className="bg-[#F5F0F6] flex flex-col h-screen w-full max-w-[430px] mx-auto">
      {/* Header */}
      <div className={`bg-gradient-to-r ${config.gradient} px-5 pt-12 pb-6`}>
        <button
          onClick={() => setSelectedCategory(null)}
          className="mb-4 p-2 rounded-full hover:bg-white/10 transition-colors inline-flex items-center"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{config.emoji}</span>
          <h1 className="font-['Lora',serif] text-[28px] text-white">{config.name}</h1>
        </div>
        <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-white/90" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
          {config.description}
        </p>
      </div>

      {/* Challenges List */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF2D55]"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {challenges.map((challenge) => (
              <button
                key={challenge.id}
                onClick={() => handleOpenChallenge(challenge)}
                className="w-full bg-white/70 backdrop-blur-lg rounded-2xl p-5 text-left shadow-md border border-white/60 hover:shadow-xl transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getChallengeCompletionIcon(challenge)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-['Nunito_Sans',sans-serif] text-[16px] text-[#2c2c2c] font-semibold mb-2" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                      {challenge.title}
                    </h3>
                    <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-[#6d6d6d] mb-3" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                      {challenge.prompt}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[#6d6d6d]">
                      {challenge.myResponse && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          You responded
                        </span>
                      )}
                      {challenge.partnerResponse && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {partnerName} responded
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Challenge Dialog */}
      <Dialog open={!!selectedChallenge} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedChallenge?.title}</DialogTitle>
            <DialogDescription className="text-base pt-2">
              {selectedChallenge?.prompt}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Your Response */}
            <div>
              <Label htmlFor="response" className="mb-2 block">Your Response</Label>
              <Textarea
                id="response"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Share your thoughts..."
                className="min-h-[120px]"
              />
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {isVisibleToPartner ? (
                  <Unlock className="w-4 h-4 text-green-600" />
                ) : (
                  <Lock className="w-4 h-4 text-gray-500" />
                )}
                <Label htmlFor="visibility" className="cursor-pointer">
                  Visible to {partnerName}
                </Label>
              </div>
              <Switch
                id="visibility"
                checked={isVisibleToPartner}
                onCheckedChange={setIsVisibleToPartner}
              />
            </div>

            {/* Partner's Response */}
            {selectedChallenge?.partnerResponse?.is_visible_to_partner && (
              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                <h4 className="font-semibold text-sm text-purple-900 mb-2">{partnerName}'s Response</h4>
                <p className="text-sm text-gray-700">{selectedChallenge.partnerResponse.response}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitResponse}
              disabled={isSubmitting || !responseText.trim()}
              className="bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] text-white"
            >
              {isSubmitting ? 'Saving...' : 'Save Response'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
