import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircleHeart, Sparkles, X, ChevronRight } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { api } from '../services/api';
import { toast } from 'sonner';

interface RelationshipWellnessPromptProps {
  userId: string;
  coupleId: string;
  partnerName: string;
  onNavigate: (page: string) => void;
  onDismiss: () => void;
}

export function RelationshipWellnessPrompt({
  userId,
  coupleId,
  partnerName,
  onNavigate,
  onDismiss,
}: RelationshipWellnessPromptProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);

  const moods = [
    { emoji: '💕', label: 'Amazing', value: 'amazing' },
    { emoji: '😊', label: 'Good', value: 'good' },
    { emoji: '😐', label: 'Okay', value: 'okay' },
    { emoji: '😔', label: 'Struggling', value: 'struggling' },
  ];

  const handleMoodSelect = async (mood: string) => {
    setSelectedMood(mood);

    // Save the wellness check-in to the database
    try {
      await api.supabase
        .from('relationship_wellness_checkins')
        .insert({
          couple_id: coupleId || null,
          user_id: userId,
          mood: mood,
          created_at: new Date().toISOString(),
        });

      setShowActions(true);
    } catch (error) {
      console.error('Failed to save wellness check-in:', error);
      toast.error('Failed to save your response');
    }
  };

  const actions = [
    {
      icon: MessageCircleHeart,
      title: 'Send a Message',
      description: partnerName ? `Let ${partnerName} know you're thinking of them` : 'Send yourself an encouraging message',
      color: 'from-blue-500 to-indigo-500',
      action: () => onNavigate('messages'),
    },
    {
      icon: Sparkles,
      title: 'Get Suggestions',
      description: 'Discover ways to take care of yourself',
      color: 'from-purple-500 to-pink-500',
      action: () => onNavigate('weekly-suggestions'),
    },
    {
      icon: Heart,
      title: 'Check Your Capacity',
      description: partnerName ? "Let them know how you're doing today" : "Track how you're feeling over time",
      color: 'from-rose-500 to-pink-500',
      action: () => onNavigate('capacity-checkin'),
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-xl overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white relative">
              <button
                onClick={onDismiss}
                className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3 pr-8">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"
                >
                  <Heart className="w-6 h-6" fill="white" />
                </motion.div>
                <div>
                  <h3 className="font-bold text-lg">Wellness Check-In</h3>
                  <p className="text-purple-100 text-sm">How are you feeling today?</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {!showActions ? (
                <>
                  <p className="text-gray-700 mb-4 text-center">
                    How are you feeling today?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {moods.map((mood) => (
                      <motion.button
                        key={mood.value}
                        onClick={() => handleMoodSelect(mood.value)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          selectedMood === mood.value
                            ? 'border-purple-500 bg-purple-100'
                            : 'border-gray-200 bg-white hover:border-purple-300'
                        }`}
                      >
                        <div className="text-3xl mb-1">{mood.emoji}</div>
                        <div className="text-sm font-medium text-gray-700">
                          {mood.label}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-gray-700 mb-4 text-center"
                  >
                    Thanks for sharing! Here are some ways to nurture your connection:
                  </motion.p>
                  <div className="space-y-3">
                    {actions.map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => {
                            action.action();
                            onDismiss();
                          }}
                          className="w-full text-left group"
                        >
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center flex-shrink-0`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm">
                                {action.title}
                              </h4>
                              <p className="text-xs text-gray-600">
                                {action.description}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                  <div className="mt-4 text-center">
                    <button
                      onClick={onDismiss}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Maybe later
                    </button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
