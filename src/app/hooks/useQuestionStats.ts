import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { api } from '../services/api';

export function useQuestionStats() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['questionStats', user?.id],
    queryFn: async () => {
      if (!user) return { totalCompleted: 0, currentStreak: 0 };

      // Get all question answers for this user
      const { data: answers, error } = await api.supabase
        .from('question_answers')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching question answers:', error);
        return { totalCompleted: 0, currentStreak: 0 };
      }

      const totalCompleted = answers?.length || 0;

      // Calculate streak - consecutive days with at least one answer
      let currentStreak = 0;
      if (answers && answers.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Group answers by date
        const answersByDate = new Map<string, number>();
        answers.forEach(answer => {
          const date = new Date(answer.created_at);
          date.setHours(0, 0, 0, 0);
          const dateKey = date.toISOString().split('T')[0];
          answersByDate.set(dateKey, (answersByDate.get(dateKey) || 0) + 1);
        });

        // Check consecutive days from today backwards
        let checkDate = new Date(today);
        while (true) {
          const dateKey = checkDate.toISOString().split('T')[0];
          if (answersByDate.has(dateKey)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }

      return { totalCompleted, currentStreak };
    },
    enabled: !!user,
  });

  return {
    totalCompleted: stats?.totalCompleted || 0,
    currentStreak: stats?.currentStreak || 0,
    isLoading,
  };
}
