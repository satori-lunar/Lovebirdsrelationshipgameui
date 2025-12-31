import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { api } from '../services/api';
import { relationshipService } from '../services/relationshipService';

export function useQuestionStats() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['questionStats', user?.id],
    queryFn: async () => {
      if (!user) return { totalCompleted: 0, currentStreak: 0 };

      // Get the user's relationship to check partner activity
      const relationship = await relationshipService.getRelationship(user.id);

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

      // Calculate streak - consecutive days where BOTH partners answered
      let currentStreak = 0;
      if (answers && answers.length > 0 && relationship) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get partner ID
        const partnerId = relationship.partner_a_id === user.id
          ? relationship.partner_b_id
          : relationship.partner_a_id;

        // Get partner's answers if they exist
        const { data: partnerAnswers } = await api.supabase
          .from('question_answers')
          .select('created_at')
          .eq('user_id', partnerId)
          .order('created_at', { ascending: false });

        // Group current user's answers by date
        const userAnswersByDate = new Map<string, number>();
        answers.forEach(answer => {
          const date = new Date(answer.created_at);
          date.setHours(0, 0, 0, 0);
          const dateKey = date.toISOString().split('T')[0];
          userAnswersByDate.set(dateKey, (userAnswersByDate.get(dateKey) || 0) + 1);
        });

        // Group partner's answers by date
        const partnerAnswersByDate = new Map<string, number>();
        if (partnerAnswers) {
          partnerAnswers.forEach(answer => {
            const date = new Date(answer.created_at);
            date.setHours(0, 0, 0, 0);
            const dateKey = date.toISOString().split('T')[0];
            partnerAnswersByDate.set(dateKey, (partnerAnswersByDate.get(dateKey) || 0) + 1);
          });
        }

        // Check consecutive days from today backwards
        // BOTH partners must have answered on the same day for it to count
        let checkDate = new Date(today);
        let startedCounting = false;

        // First, check if both answered today
        const todayKey = checkDate.toISOString().split('T')[0];
        if (userAnswersByDate.has(todayKey) && partnerAnswersByDate.has(todayKey)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
          startedCounting = true;
        } else {
          // If not both answered today, start counting from yesterday
          checkDate.setDate(checkDate.getDate() - 1);
        }

        // Continue counting backwards for consecutive days
        while (true) {
          const dateKey = checkDate.toISOString().split('T')[0];
          const userAnswered = userAnswersByDate.has(dateKey);
          const partnerAnswered = partnerAnswersByDate.has(dateKey);

          if (userAnswered && partnerAnswered) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
            startedCounting = true;
          } else {
            // Only break if we've started counting (found at least one valid day)
            // or if we've checked yesterday and found nothing
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
