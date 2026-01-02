import { useState } from 'react';
import { ChevronLeft, Heart, Lightbulb, Moon, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useRelationship } from '../hooks/useRelationship';
import { lockscreenService } from '../services/lockscreenService';
import type { MessageTone } from '../types/lockscreen';

interface SendLockscreenMessageProps {
  onBack: () => void;
}

const toneOptions = [
  {
    tone: 'love' as MessageTone,
    icon: Heart,
    title: 'Love',
    description: 'Express affection and warmth',
    color: 'pink',
    examples: [
      'Missing you more than words can say',
      'You make my heart so full',
      'Distance means nothing when you mean everything',
    ],
  },
  {
    tone: 'support' as MessageTone,
    icon: Lightbulb,
    title: 'Support',
    description: 'Encourage and uplift',
    color: 'blue',
    examples: [
      "I'm proud of you today",
      'You\'re doing amazing things',
      'I believe in you, always',
    ],
  },
  {
    tone: 'quiet_presence' as MessageTone,
    icon: Moon,
    title: 'Quiet Presence',
    description: 'Gentle, calming reassurance',
    color: 'purple',
    examples: [
      "I'm here if you need me",
      'Thinking of you softly',
      'Just wanted you to know I care',
    ],
  },
];

export function SendLockscreenMessage({ onBack }: SendLockscreenMessageProps) {
  const { user } = useAuth();
  const { relationship } = useRelationship();

  const [selectedTone, setSelectedTone] = useState<MessageTone>('love');
  const [message, setMessage] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);
  const [isSending, setIsSending] = useState(false);

  const maxLength = 150;
  const remainingChars = maxLength - message.length;

  // Determine partner ID from relationship
  const partnerId = relationship
    ? user?.id === relationship.partner_a_id
      ? relationship.partner_b_id
      : relationship.partner_a_id
    : null;

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please write a message');
      return;
    }

    if (!relationship || !partnerId) {
      toast.error('No relationship found');
      return;
    }

    setIsSending(true);

    try {
      await lockscreenService.sendMessage({
        receiverId: partnerId,
        relationshipId: relationship.id,
        message: message.trim(),
        tone: selectedTone,
        expiryHours,
      });

      toast.success('Message sent!', {
        description: 'Your partner will see it on their lockscreen',
      });

      // Clear form
      setMessage('');
      setSelectedTone('love');
      setExpiryHours(24);

      // Navigate back after a brief delay
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send', {
        description: 'Please try again',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleUseExample = (example: string) => {
    setMessage(example);
  };

  const selectedToneOption = toneOptions.find((t) => t.tone === selectedTone)!;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-gray-800">
              Send Lockscreen Message
            </h1>
          </div>
          <div className="w-10" />
        </div>

        {/* Subtitle */}
        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Send an intentional message to your partner
          </p>
          <p className="text-pink-600 text-xs mt-1">
            It will appear on their lockscreen wallpaper
          </p>
        </div>

        {/* Tone Selector */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Choose a Tone</h2>
          <div className="space-y-2">
            {toneOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedTone === option.tone;
              const colorClasses = {
                pink: 'border-pink-500 bg-pink-50',
                blue: 'border-blue-500 bg-blue-50',
                purple: 'border-purple-500 bg-purple-50',
              };

              return (
                <motion.button
                  key={option.tone}
                  onClick={() => setSelectedTone(option.tone)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? colorClasses[option.color]
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      className={`w-5 h-5 mt-0.5 ${
                        isSelected ? `text-${option.color}-600` : 'text-gray-400'
                      }`}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-gray-800">
                        {option.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Message Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Your Message</h2>
            <span
              className={`text-xs ${
                remainingChars < 20
                  ? 'text-red-500'
                  : remainingChars < 50
                  ? 'text-orange-500'
                  : 'text-gray-400'
              }`}
            >
              {remainingChars} characters left
            </span>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
            placeholder="Write a heartfelt message..."
            className="w-full p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            rows={4}
          />

          {/* Example Messages */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500">Tap to use an example:</p>
            <div className="space-y-1">
              {selectedToneOption.examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleUseExample(example)}
                  className="w-full text-left p-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Expiry Settings */}
        <Card className="p-4">
          <h3 className="font-semibold text-sm text-gray-800 mb-3">
            Message Duration
          </h3>
          <div className="space-y-2">
            {[
              { hours: 12, label: '12 hours' },
              { hours: 24, label: '24 hours' },
              { hours: 48, label: '2 days' },
            ].map((option) => (
              <button
                key={option.hours}
                onClick={() => setExpiryHours(option.hours)}
                className={`w-full p-3 rounded-lg border-2 transition-all text-sm ${
                  expiryHours === option.hours
                    ? 'border-pink-500 bg-pink-50 text-pink-700 font-medium'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            After this time, the message will disappear from their lockscreen
          </p>
        </Card>

        {/* Preview */}
        <Card className="p-4 bg-gradient-to-br from-pink-50 to-purple-50 border-pink-100">
          <p className="text-xs text-gray-600 font-medium mb-2">Preview:</p>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-center text-gray-800 italic">
              {message || '"Your message will appear here"'}
            </p>
          </div>
        </Card>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className="w-full bg-pink-500 hover:bg-pink-600 h-12"
        >
          {isSending ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send to Partner
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-center text-xs text-gray-400 pb-4">
          <p>This replaces constant texting with intentional moments</p>
          <p>Your partner will receive a notification when it arrives</p>
        </div>
      </div>
    </div>
  );
}
