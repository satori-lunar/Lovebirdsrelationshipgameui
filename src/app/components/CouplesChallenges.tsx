import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, MessageCircle, Sparkles, MapPin, Star, Lock, Unlock, CheckCircle2, Sparkle, Image as ImageIcon, Video, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { usePartner } from '../hooks/usePartner';
import { coupleChallengesService, ChallengeCategory, ChallengeWithResponse } from '../services/coupleChallengesService';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
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
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisibleToPartner, setIsVisibleToPartner] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setCurrentChallengeIndex(0);
    } catch (error) {
      console.error('Error loading challenges:', error);
      toast.error('Failed to load challenges');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Update response text and media when challenge changes
    if (challenges.length > 0 && currentChallengeIndex < challenges.length) {
      const currentChallenge = challenges[currentChallengeIndex];
      setResponseText(currentChallenge.myResponse?.response || '');
      setIsVisibleToPartner(currentChallenge.myResponse?.is_visible_to_partner ?? true);
      setMediaPreview(currentChallenge.myResponse?.media_url || null);
      setSelectedFile(null);
    }
  }, [currentChallengeIndex, challenges]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image or video file');
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setSelectedFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmitResponse = async () => {
    if (!user || !relationship || !responseText.trim()) {
      toast.error('Please write a response');
      return;
    }

    const currentChallenge = challenges[currentChallengeIndex];
    if (!currentChallenge) return;

    setIsSubmitting(true);
    setIsUploading(!!selectedFile);

    try {
      let mediaUrl: string | undefined;
      let mediaType: 'image' | 'video' | undefined;

      // Upload media if file is selected
      if (selectedFile) {
        toast.loading('Uploading media...');
        const uploadResult = await coupleChallengesService.uploadMedia(
          user.id,
          selectedFile,
          currentChallenge.id
        );
        mediaUrl = uploadResult.url;
        mediaType = uploadResult.type;
        toast.dismiss();
      }

      await coupleChallengesService.submitResponse(
        currentChallenge.id,
        relationship.id,
        user.id,
        responseText.trim(),
        isVisibleToPartner,
        mediaUrl,
        mediaType
      );
      toast.success('Response saved!');
      await loadChallenges();
      setSelectedFile(null);
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to save response');
      toast.dismiss();
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const goToNextChallenge = async () => {
    // Auto-submit if there's content
    if (responseText.trim()) {
      await handleSubmitResponse();
    }

    if (currentChallengeIndex < challenges.length - 1) {
      setCurrentChallengeIndex(currentChallengeIndex + 1);
    }
  };

  const goToPreviousChallenge = async () => {
    // Auto-submit if there's content
    if (responseText.trim()) {
      await handleSubmitResponse();
    }

    if (currentChallengeIndex > 0) {
      setCurrentChallengeIndex(currentChallengeIndex - 1);
    }
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

  // Category-specific view with single challenge
  const config = categoryConfig[selectedCategory];
  const currentChallenge = challenges[currentChallengeIndex];
  const totalChallenges = challenges.length;

  if (isLoading) {
    return (
      <div className="bg-[#F5F0F6] flex flex-col h-screen w-full max-w-[430px] mx-auto items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF2D55]"></div>
        <p className="mt-4 text-[#6d6d6d]">Loading challenges...</p>
      </div>
    );
  }

  if (!currentChallenge) {
    return (
      <div className="bg-[#F5F0F6] flex flex-col h-screen w-full max-w-[430px] mx-auto items-center justify-center">
        <p className="text-[#6d6d6d]">No challenges available</p>
        <button
          onClick={() => setSelectedCategory(null)}
          className="mt-4 px-6 py-2 bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] text-white rounded-full"
        >
          Back to Categories
        </button>
      </div>
    );
  }

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
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{config.emoji}</span>
          <h1 className="font-['Lora',serif] text-[24px] text-white">{config.name}</h1>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-white/90 text-sm mb-2">
            <span>Challenge {currentChallengeIndex + 1} of {totalChallenges}</span>
            <span>{Math.round(((currentChallengeIndex + 1) / totalChallenges) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${((currentChallengeIndex + 1) / totalChallenges) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Challenge Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="space-y-6">
          {/* Challenge Card */}
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 shadow-md border border-white/60">
            <div className="flex items-start gap-3 mb-4">
              {currentChallenge.myResponse && currentChallenge.partnerResponse ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              ) : currentChallenge.myResponse || currentChallenge.partnerResponse ? (
                <CheckCircle2 className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
              ) : (
                <Sparkle className="w-6 h-6 text-[#FF2D55] flex-shrink-0 mt-1" />
              )}
              <div className="flex-1">
                <h3 className="font-['Nunito_Sans',sans-serif] text-[20px] text-[#2c2c2c] font-semibold mb-2" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  {currentChallenge.title}
                </h3>
                <p className="font-['Nunito_Sans',sans-serif] text-[16px] text-[#6d6d6d] leading-relaxed" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  {currentChallenge.prompt}
                </p>
              </div>
            </div>
          </div>

          {/* Your Response */}
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl p-6 shadow-md border border-white/60">
            <Label htmlFor="response" className="text-[16px] font-semibold text-[#2c2c2c] mb-3 block">
              Your Response
            </Label>
            <Textarea
              id="response"
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Share your thoughts..."
              className="min-h-[150px] mb-4 text-[15px]"
            />

            {/* Media Upload */}
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="media-upload"
              />

              {!mediaPreview ? (
                <label
                  htmlFor="media-upload"
                  className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#FF2D55] hover:bg-gray-50 transition-all"
                >
                  <ImageIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-[15px] text-gray-600">Add Photo or Video</span>
                </label>
              ) : (
                <div className="relative">
                  {selectedFile?.type.startsWith('video/') || currentChallenge.myResponse?.media_type === 'video' ? (
                    <video
                      src={mediaPreview}
                      controls
                      className="w-full rounded-xl max-h-[300px] object-cover"
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="Preview"
                      className="w-full rounded-xl max-h-[300px] object-cover"
                    />
                  )}
                  <button
                    onClick={handleRemoveMedia}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
              <div className="flex items-center gap-3">
                {isVisibleToPartner ? (
                  <Unlock className="w-5 h-5 text-green-600" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-500" />
                )}
                <Label htmlFor="visibility" className="cursor-pointer text-[15px]">
                  Visible to {partnerName}
                </Label>
              </div>
              <Switch
                id="visibility"
                checked={isVisibleToPartner}
                onCheckedChange={setIsVisibleToPartner}
              />
            </div>

            <Button
              onClick={handleSubmitResponse}
              disabled={isSubmitting || !responseText.trim()}
              className={`w-full bg-gradient-to-r ${config.gradient} text-white py-6 text-[16px] font-semibold`}
            >
              {isSubmitting ? 'Saving...' : currentChallenge.myResponse ? 'Update Response' : 'Submit Response'}
            </Button>
          </div>

          {/* Partner's Response Section */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-6 shadow-md border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-5 h-5 text-purple-600" fill="currentColor" />
              <h4 className="font-['Nunito_Sans',sans-serif] text-[16px] font-semibold text-purple-900" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                {partnerName}'s Response
              </h4>
            </div>

            {!currentChallenge.myResponse ? (
              // User hasn't completed the challenge yet - show locked state
              <div className="text-center py-4">
                <Lock className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-purple-700 mb-1" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  Complete this challenge to see {partnerName}'s response
                </p>
                <p className="font-['Nunito_Sans',sans-serif] text-[12px] text-purple-500" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  Submit your answer first to unlock their response
                </p>
              </div>
            ) : currentChallenge.partnerResponse?.is_visible_to_partner ? (
              // User has completed & partner's response is visible
              <>
                {/* Partner's Media */}
                {currentChallenge.partnerResponse.media_url && (
                  <div className="mb-3">
                    {currentChallenge.partnerResponse.media_type === 'video' ? (
                      <video
                        src={currentChallenge.partnerResponse.media_url}
                        controls
                        className="w-full rounded-xl max-h-[300px] object-cover"
                      />
                    ) : (
                      <img
                        src={currentChallenge.partnerResponse.media_url}
                        alt="Partner's media"
                        className="w-full rounded-xl max-h-[300px] object-cover"
                      />
                    )}
                  </div>
                )}

                <p className="font-['Nunito_Sans',sans-serif] text-[15px] text-gray-700 leading-relaxed" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  {currentChallenge.partnerResponse.response}
                </p>
              </>
            ) : currentChallenge.partnerResponse && !currentChallenge.partnerResponse.is_visible_to_partner ? (
              // User has completed but partner set response to private
              <div className="text-center py-4">
                <Lock className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-purple-700" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  {partnerName} has responded but kept it private
                </p>
              </div>
            ) : (
              // User has completed but partner hasn't responded yet
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
                  <MessageCircle className="w-6 h-6 text-purple-400" />
                </div>
                <p className="font-['Nunito_Sans',sans-serif] text-[14px] text-purple-700 mb-1" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  {partnerName} hasn't responded yet
                </p>
                <p className="font-['Nunito_Sans',sans-serif] text-[12px] text-purple-500" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
                  Their response will appear here when they complete this challenge
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="bg-white/70 backdrop-blur-lg border-t border-white/60 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={goToPreviousChallenge}
            disabled={currentChallengeIndex === 0}
            className="flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-['Nunito_Sans',sans-serif] text-[15px] font-semibold" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
              Previous
            </span>
          </button>

          <div className="flex gap-1">
            {challenges.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentChallengeIndex
                    ? 'bg-[#FF2D55] w-6'
                    : index < currentChallengeIndex
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <button
            onClick={goToNextChallenge}
            disabled={currentChallengeIndex === challenges.length - 1}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] text-white rounded-full shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all"
          >
            <span className="font-['Nunito_Sans',sans-serif] text-[15px] font-semibold" style={{ fontVariationSettings: "'YTLC' 500, 'wdth' 100" }}>
              Next
            </span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
