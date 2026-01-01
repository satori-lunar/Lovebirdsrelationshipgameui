/**
 * Send Widget Gift Component
 *
 * Allows users to compose and send photos/memories/messages to
 * their partner's home screen widget.
 * Styled with rose/pink gradients matching the Lovebirds design system.
 */

import { useState, useRef } from 'react';
import {
  ChevronLeft,
  Heart,
  Send,
  Image,
  Camera,
  MessageSquare,
  Sparkles,
  Clock,
  Check,
  X,
  Smartphone,
  History
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { useAuth } from '../hooks/useAuth';
import { useRelationship } from '../hooks/useRelationship';
import { usePartner } from '../hooks/usePartner';
import { usePartnerOnboarding } from '../hooks/usePartnerOnboarding';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { widgetGiftService } from '../services/widgetGiftService';
import { widgetService } from '../services/widgetService';
import { dragonGameLogic } from '../services/dragonGameLogic';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import type { WidgetGiftType, MemoryWidgetData } from '../types/widget';

interface SendWidgetGiftProps {
  onBack: () => void;
  onNavigateToHistory?: () => void;
}

type Step = 'choose' | 'compose' | 'preview' | 'success';

const QUICK_MESSAGES = [
  "I love you! 💕",
  "Thinking of you right now",
  "You make me so happy",
  "Can't wait to see you",
  "You're amazing!",
  "Missing you 💗",
];

export function SendWidgetGift({ onBack, onNavigateToHistory }: SendWidgetGiftProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { partnerId } = usePartner(relationship);
  const { partnerName } = usePartnerOnboarding();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('choose');
  const [giftType, setGiftType] = useState<WidgetGiftType | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<MemoryWidgetData | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [message, setMessage] = useState('');

  // Fetch memories with photos
  const { data: memories = [], isLoading: loadingMemories } = useQuery({
    queryKey: ['widget-memories', relationship?.id],
    queryFn: async () => {
      if (!relationship?.id || !user?.id) return [];
      return widgetService.getWidgetReadyMemories(relationship.id, user.id);
    },
    enabled: !!relationship?.id && !!user?.id,
  });

  // Send gift mutation
  const sendGiftMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !partnerId || !relationship?.id) {
        throw new Error('Not authenticated or no partner');
      }

      let photoUrl: string | undefined;

      // Upload photo if needed
      if (giftType === 'photo' && photoBlob) {
        photoUrl = await widgetGiftService.uploadGiftPhoto(user.id, photoBlob);
      }

      // Send the gift
      return widgetGiftService.sendGift(user.id, {
        receiverId: partnerId,
        relationshipId: relationship.id,
        giftType: giftType!,
        photoUrl: giftType === 'photo' ? photoUrl : undefined,
        memoryId: giftType === 'memory' ? selectedMemory?.id : undefined,
        message: message.trim() || undefined,
      });
    },
    onSuccess: async (giftData) => {
      queryClient.invalidateQueries({ queryKey: ['widget-gifts'] });
      setStep('success');
      toast.success('Gift sent to their widget! 💕');

      // Award dragon XP
      if (user?.id && giftData?.id) {
        try {
          const reward = await dragonGameLogic.awardActivityCompletion(
            user.id,
            'widget_gift_sent',
            giftData.id
          );
          if (reward.xp > 0) {
            toast.success(`🐉 +${reward.xp} Dragon XP!`, { duration: 3000 });
          }
        } catch (err) {
          console.error('Failed to award dragon XP:', err);
        }
      }
    },
    onError: (error) => {
      toast.error('Failed to send gift');
      console.error('Error sending gift:', error);
    },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setPhotoBlob(file);
    setGiftType('photo');
    setStep('compose');
  };

  const handleMemorySelect = (memory: MemoryWidgetData) => {
    setSelectedMemory(memory);
    setGiftType('memory');
    setStep('compose');
  };

  const handleNoteSelect = () => {
    setGiftType('note');
    setStep('compose');
  };

  const handleSend = () => {
    if (giftType === 'note' && !message.trim()) {
      toast.error('Please write a message');
      return;
    }
    setStep('preview');
  };

  const handleConfirmSend = () => {
    sendGiftMutation.mutate();
  };

  const resetForm = () => {
    setStep('choose');
    setGiftType(null);
    setSelectedMemory(null);
    setPhotoPreview(null);
    setPhotoBlob(null);
    setMessage('');
  };

  const getPreviewImage = () => {
    if (giftType === 'photo' && photoPreview) return photoPreview;
    if (giftType === 'memory' && selectedMemory) return selectedMemory.photoUrl;
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={step === 'choose' ? onBack : resetForm}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>{step === 'choose' ? 'Back' : 'Start Over'}</span>
            </button>

            {onNavigateToHistory && step === 'choose' && (
              <button
                onClick={onNavigateToHistory}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full text-sm transition-colors"
              >
                <History className="w-4 h-4" />
                History
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring' }}
              className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center"
            >
              <Smartphone className="w-7 h-7" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold">Send to Widget</h1>
              <p className="text-white/90 text-sm mt-0.5">
                Appears on {partnerName || 'your partner'}'s home screen
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoSelect}
        />

        {/* Step 1: Choose Type */}
        {step === 'choose' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="p-6 border-0 shadow-xl rounded-2xl bg-white">
              <h3 className="font-semibold mb-5 flex items-center gap-2 text-gray-900">
                <Sparkles className="w-5 h-5 text-rose-500" />
                What would you like to send?
              </h3>

              <div className="space-y-3">
                {/* Photo option */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border-2 border-rose-100 rounded-2xl hover:bg-rose-50 hover:border-rose-300 transition-all text-left flex items-center gap-4 group"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-rose-100 to-pink-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-7 h-7 text-rose-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Take or Upload Photo</h4>
                    <p className="text-sm text-gray-500">Send a new photo from your camera or gallery</p>
                  </div>
                </button>

                {/* Memory option */}
                <button
                  onClick={() => setStep('compose')}
                  className="w-full p-4 border-2 border-purple-100 rounded-2xl hover:bg-purple-50 hover:border-purple-300 transition-all text-left flex items-center gap-4 group"
                  disabled={memories.length === 0}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Image className="w-7 h-7 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Choose a Memory</h4>
                    <p className="text-sm text-gray-500">
                      {memories.length > 0
                        ? `Select from ${memories.length} memories`
                        : 'No memories with photos yet'}
                    </p>
                  </div>
                </button>

                {/* Note only option */}
                <button
                  onClick={handleNoteSelect}
                  className="w-full p-4 border-2 border-amber-100 rounded-2xl hover:bg-amber-50 hover:border-amber-300 transition-all text-left flex items-center gap-4 group"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-7 h-7 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Quick Love Note</h4>
                    <p className="text-sm text-gray-500">Just a sweet message, no photo</p>
                  </div>
                </button>
              </div>
            </Card>

            <Card className="p-4 border-0 shadow-lg rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    <strong className="text-gray-900">Note:</strong> Your gift will appear on their widget for 24 hours, then it will return to showing their selected memories.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Compose */}
        {step === 'compose' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Memory selector (if choosing memory) */}
            {giftType === null && (
              <Card className="p-5 border-0 shadow-xl rounded-2xl bg-white">
                <h3 className="font-semibold mb-4 text-gray-900">Select a Memory</h3>
                {loadingMemories ? (
                  <div className="flex flex-col items-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Heart className="w-8 h-8 text-rose-400" />
                    </motion.div>
                    <p className="text-gray-500 mt-3">Loading memories...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {memories.map((memory) => (
                      <button
                        key={memory.id}
                        onClick={() => handleMemorySelect(memory)}
                        className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          selectedMemory?.id === memory.id
                            ? 'border-rose-500 ring-2 ring-rose-300 scale-95'
                            : 'border-transparent hover:border-rose-300'
                        }`}
                      >
                        <img
                          src={memory.photoUrl}
                          alt={memory.title}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Preview of selected content */}
            {(giftType === 'photo' || giftType === 'memory') && (
              <Card className="p-5 border-0 shadow-xl rounded-2xl bg-white">
                <h3 className="font-semibold mb-3 text-gray-900">
                  {giftType === 'photo' ? 'Your Photo' : 'Selected Memory'}
                </h3>
                <div className="aspect-video rounded-2xl overflow-hidden mb-4 shadow-lg">
                  <img
                    src={getPreviewImage() || ''}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                {selectedMemory && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <span><strong>{selectedMemory.title}</strong> - {selectedMemory.date}</span>
                  </div>
                )}
              </Card>
            )}

            {/* Message input */}
            <Card className="p-5 border-0 shadow-xl rounded-2xl bg-white">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-900">
                <Heart className="w-5 h-5 text-rose-500" />
                Add a Sweet Message {giftType !== 'note' && '(optional)'}
              </h3>

              {/* Quick message buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {QUICK_MESSAGES.map((msg, i) => (
                  <button
                    key={i}
                    onClick={() => setMessage(msg)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                      message === msg
                        ? 'bg-rose-100 border-rose-400 text-rose-700'
                        : 'border-gray-200 hover:border-rose-300 hover:bg-rose-50'
                    }`}
                  >
                    {msg}
                  </button>
                ))}
              </div>

              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 150))}
                placeholder="Write your own message..."
                rows={3}
                className="resize-none rounded-xl border-gray-200 focus:border-rose-300 focus:ring-rose-200"
              />
              <p className="text-xs text-gray-400 mt-2 text-right">
                {message.length}/150 characters
              </p>
            </Card>

            <Button
              onClick={handleSend}
              disabled={giftType === 'note' && !message.trim()}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 py-6 text-lg rounded-xl shadow-lg shadow-rose-200"
            >
              Preview & Send
            </Button>
          </motion.div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="p-6 border-0 shadow-xl rounded-2xl bg-white">
              <h3 className="font-semibold mb-5 text-center text-gray-900">
                Widget Preview
              </h3>

              {/* iPhone-style widget preview mockup */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2.5rem] p-3 mx-auto max-w-[280px] shadow-2xl">
                {/* iPhone notch */}
                <div className="w-24 h-6 bg-black rounded-full mx-auto mb-3" />

                {/* Widget */}
                <div className="bg-gradient-to-br from-rose-100 to-pink-100 rounded-3xl aspect-square relative overflow-hidden shadow-inner">
                  {getPreviewImage() ? (
                    <img
                      src={getPreviewImage()!}
                      alt="Widget preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-200 to-pink-200">
                      <Heart className="w-20 h-20 text-rose-400" fill="currentColor" />
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                  {/* Content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 bg-white/30 rounded-full flex items-center justify-center">
                        <Heart className="w-3 h-3" fill="white" />
                      </div>
                      <p className="text-xs text-white/90 font-medium">From You</p>
                    </div>
                    {message && (
                      <p className="text-sm font-medium italic leading-snug">"{message}"</p>
                    )}
                  </div>

                  {/* Lovebirds badge */}
                  <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-white" fill="white" />
                    <span className="text-xs text-white font-medium">Lovebirds</span>
                  </div>
                </div>

                {/* Widget label */}
                <p className="text-center text-xs text-gray-400 mt-3 mb-1">Lovebirds Widget</p>
              </div>

              <p className="text-center text-sm text-gray-500 mt-5 flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Expires in 24 hours
              </p>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep('compose')}
                variant="outline"
                className="flex-1 py-6 rounded-xl border-2 hover:bg-gray-50"
              >
                <X className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={handleConfirmSend}
                disabled={sendGiftMutation.isPending}
                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 py-6 rounded-xl shadow-lg shadow-rose-200"
              >
                <Send className="w-4 h-4 mr-2" />
                {sendGiftMutation.isPending ? 'Sending...' : 'Send Now'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <Card className="p-8 border-0 shadow-xl rounded-2xl bg-white text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg"
              >
                <Check className="w-10 h-10 text-white" />
              </motion.div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Gift Sent! 💕
              </h2>
              <p className="text-gray-600 mb-6">
                {partnerName || 'Your partner'} will see this on their home screen widget.
              </p>

              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 mb-6 border border-rose-100">
                <p className="text-sm text-gray-700">
                  They'll get a notification when the widget updates. The gift will be visible for 24 hours.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="flex-1 py-5 rounded-xl border-2"
                >
                  Send Another
                </Button>
                <Button
                  onClick={onBack}
                  className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 py-5 rounded-xl shadow-lg shadow-rose-200"
                >
                  Done
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
