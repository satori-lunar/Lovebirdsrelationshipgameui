import { useState } from 'react';
import { ChevronLeft, Heart, Sparkles, Check, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import { useAuth } from '../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { startOfWeek, format } from 'date-fns';

interface WeeklyWishesProps {
  onBack: () => void;
  partnerName: string;
}

interface WeeklyWish {
  id: string;
  user_id: string;
  week_start_date: string;
  wish_text: string;
  created_at: string;
}

export function WeeklyWishes({ onBack, partnerName }: WeeklyWishesProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [wishText, setWishText] = useState('');

  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Fetch this week's wish
  const { data: thisWeekWish, isLoading } = useQuery({
    queryKey: ['weekly-wish', user?.id, currentWeekStart],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await api.supabase
        .from('weekly_wishes')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start_date', currentWeekStart)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch past wishes
  const { data: pastWishes = [] } = useQuery({
    queryKey: ['weekly-wishes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await api.supabase
        .from('weekly_wishes')
        .select('*')
        .eq('user_id', user.id)
        .neq('week_start_date', currentWeekStart)
        .order('week_start_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Submit wish mutation
  const submitWishMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await api.supabase
        .from('weekly_wishes')
        .upsert({
          user_id: user.id,
          week_start_date: currentWeekStart,
          wish_text: text,
        }, {
          onConflict: 'user_id,week_start_date'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-wish'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-wishes'] });
      setWishText('');
      toast.success('Thank you for sharing! 💜');
    },
    onError: (error) => {
      toast.error('Failed to save wish');
      console.error('Error saving wish:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishText.trim()) {
      toast.error('Please write something');
      return;
    }
    submitWishMutation.mutate(wishText);
  };

  const hasAnsweredThisWeek = !!thisWeekWish;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 pb-12">
        <div className="max-w-md mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 mb-6 hover:opacity-80"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl">Weekly Wishes</h1>
              <p className="text-white/90 text-sm">
                Help us personalize your experience
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-6">
        {/* This Week's Question */}
        <Card className="p-6 mb-6 border-0 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-purple-500" />
            <h2 className="text-lg font-semibold">This Week's Question</h2>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 mb-4">
            <p className="text-gray-800 font-medium mb-1">
              Is there anything you wish {partnerName} would do more of?
            </p>
            <p className="text-sm text-gray-600">
              This helps us personalize your suggestions to focus on what matters most to you.
            </p>
          </div>

          {hasAnsweredThisWeek ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <p className="font-semibold text-green-900">Thank you for sharing!</p>
                </div>
                <p className="text-sm text-green-800">
                  "{thisWeekWish.wish_text}"
                </p>
              </div>

              <p className="text-sm text-gray-600 text-center">
                We'll use this to personalize your suggestions this week. Come back next Monday for a new question!
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={wishText}
                onChange={(e) => setWishText(e.target.value)}
                placeholder="e.g., Plan surprise dates, leave me notes, cook together, give me backrubs, ask about my day more often..."
                rows={4}
                className="resize-none"
              />

              <Button
                type="submit"
                disabled={submitWishMutation.isPending}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Heart className="w-4 h-4 mr-2" />
                Share My Wish
              </Button>
            </form>
          )}
        </Card>

        {/* Info Card */}
        <Card className="p-4 mb-6 border-0 shadow-lg bg-purple-50">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-purple-900 mb-1">
                How This Helps
              </p>
              <p className="text-xs text-purple-800">
                We use your wishes to tailor daily suggestions, gift ideas, and date plans to what you really want. The more specific you are, the better we can help!
              </p>
            </div>
          </div>
        </Card>

        {/* Past Wishes */}
        {pastWishes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Previous Wishes
            </h3>

            {pastWishes.map((wish) => (
              <Card key={wish.id} className="p-4 border-0 shadow-lg">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 mb-2">"{wish.wish_text}"</p>
                    <p className="text-xs text-gray-400">
                      Week of {format(new Date(wish.week_start_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
