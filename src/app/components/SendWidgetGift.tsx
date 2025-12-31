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
  Smartphone
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

export function SendWidgetGift({ onBack }: SendWidgetGiftProps) {
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
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto">
          <button
            onClick={step === 'choose' ? onBack : () => setStep('choose')}
            className="flex items-center gap-2 mb-6 hover:opacity-80"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{step === 'choose' ? 'Back' : 'Start Over'}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Send to Widget</h1>
              <p className="text-white/90 text-sm">
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
            <Card className="p-5 border-0 shadow-lg">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-500" />
                What would you like to send?
              </h3>

              <div className="space-y-3">
                {/* Photo option */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border-2 border-pink-200 rounded-xl hover:bg-pink-50 hover:border-pink-400 transition-all text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl flex items-center justify-center">
                    <Camera className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Take or Upload Photo</h4>
                    <p className="text-sm text-gray-500">Send a new photo from your camera or gallery</p>
                  </div>
                </button>

                {/* Memory option */}
                <button
                  onClick={() => setStep('compose')}
                  className="w-full p-4 border-2 border-purple-200 rounded-xl hover:bg-purple-50 hover:border-purple-400 transition-all text-left flex items-center gap-4"
                  disabled={memories.length === 0}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                    <Image className="w-6 h-6 text-purple-600" />
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
                  className="w-full p-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all text-left flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Quick Love Note</h4>
                    <p className="text-sm text-gray-500">Just a sweet message, no photo</p>
                  </div>
                </button>
              </div>
            </Card>

            <Card className="p-4 border-0 shadow-lg bg-pink-50">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-pink-600 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-700">
                    <strong>Note:</strong> Your gift will appear on their widget for 24 hours, then it will return to showing their selected memories.
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
              <Card className="p-5 border-0 shadow-lg">
                <h3 className="font-semibold mb-4">Select a Memory</h3>
                {loadingMemories ? (
                  <p className="text-gray-500 text-center py-8">Loading memories...</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {memories.map((memory) => (
                      <button
                        key={memory.id}
                        onClick={() => handleMemorySelect(memory)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                          selectedMemory?.id === memory.id
                            ? 'border-pink-500 ring-2 ring-pink-300'
                            : 'border-transparent hover:border-pink-300'
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
              <Card className="p-5 border-0 shadow-lg">
                <h3 className="font-semibold mb-3">
                  {giftType === 'photo' ? 'Your Photo' : 'Selected Memory'}
                </h3>
                <div className="aspect-video rounded-xl overflow-hidden mb-4">
                  <img
                    src={getPreviewImage() || ''}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                {selectedMemory && (
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>{selectedMemory.title}</strong> - {selectedMemory.date}
                  </p>
                )}
              </Card>
            )}

            {/* Message input */}
            <Card className="p-5 border-0 shadow-lg">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
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
                        ? 'bg-pink-100 border-pink-400 text-pink-700'
                        : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50'
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
                className="resize-none"
              />
              <p className="text-xs text-gray-400 mt-2 text-right">
                {message.length}/150 characters
              </p>
            </Card>

            <Button
              onClick={handleSend}
              disabled={giftType === 'note' && !message.trim()}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 py-6 text-lg"
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
            <Card className="p-5 border-0 shadow-lg">
              <h3 className="font-semibold mb-4 text-center">
                This is how it will look on their widget
              </h3>

              {/* Widget preview mockup */}
              <div className="bg-gray-900 rounded-3xl p-4 mx-auto max-w-[280px]">
                <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl aspect-square relative overflow-hidden">
                  {getPreviewImage() ? (
                    <img
                      src={getPreviewImage()!}
                      alt="Widget preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Heart className="w-16 h-16 text-pink-300" />
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <p className="text-xs text-white/80 mb-1">From You</p>
                    {message && (
                      <p className="text-sm font-medium italic">"{message}"</p>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 mt-4">
                Expires in 24 hours
              </p>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep('compose')}
                variant="outline"
                className="flex-1 py-6"
              >
                <X className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={handleConfirmSend}
                disabled={sendGiftMutation.isPending}
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 py-6"
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
            <Card className="p-8 border-0 shadow-lg text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-10 h-10 text-white" />
              </motion.div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Gift Sent! 💕
              </h2>
              <p className="text-gray-600 mb-6">
                {partnerName || 'Your partner'} will see this on their home screen widget.
              </p>

              <div className="bg-pink-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-700">
                  They'll get a notification when the widget updates. The gift will be visible for 24 hours.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={resetForm}
                  variant="outline"
                  className="flex-1"
                >
                  Send Another
                </Button>
                <Button
                  onClick={onBack}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500"
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
