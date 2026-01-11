import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { api } from '../services/api';
import { relationshipService } from '../services/relationshipService';

export function useActivityStats() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['questionStats', user?.id],
    queryFn: async () => {
      if (!user) return { totalCompleted: 0, currentStreak: 0 };

      // Get the user's relationship to check partner activity
      const relationship = await relationshipService.getRelationship(user.id);

      if (!relationship) {
        return { totalCompleted: 0, currentStreak: 0 };
      }

      // Get partner ID
      const partnerId = relationship.partner_a_id === user.id
        ? relationship.partner_b_id
        : relationship.partner_a_id;

      // Get all activities for current user across multiple tables
      const [userQuestions, userCapacity, userNeeds] = await Promise.all([
        // Question answers
        api.supabase
          .from('question_answers')
          .select('created_at')
          .eq('user_id', user.id),

        // Capacity check-ins
        api.supabase
          .from('capacity_checkins')
          .select('created_at')
          .eq('user_id', user.id),

        // Needs submissions (as requester)
        api.supabase
          .from('relationship_needs')
          .select('created_at')
          .eq('requester_id', user.id)
      ]);

      // Get all activities for partner across multiple tables
      const [partnerQuestions, partnerCapacity, partnerNeeds] = await Promise.all([
        // Partner question answers
        api.supabase
          .from('question_answers')
          .select('created_at')
          .eq('user_id', partnerId),

        // Partner capacity check-ins
        api.supabase
          .from('capacity_checkins')
          .select('created_at')
          .eq('user_id', partnerId),

        // Partner needs submissions (as requester)
        api.supabase
          .from('relationship_needs')
          .select('created_at')
          .eq('requester_id', partnerId)
      ]);

      // Combine all activities into date maps
      const userActivityByDate = new Map<string, boolean>();
      const partnerActivityByDate = new Map<string, boolean>();

      // Helper function to add activities to date map
      const addActivitiesToMap = (activities: any[], activityMap: Map<string, boolean>) => {
        activities.forEach(activity => {
          if (activity.created_at) {
            const date = new Date(activity.created_at);
            date.setHours(0, 0, 0, 0);
            const dateKey = date.toISOString().split('T')[0];
            activityMap.set(dateKey, true);
          }
        });
      };

      // Add all user activities
      addActivitiesToMap(userQuestions.data || [], userActivityByDate);
      addActivitiesToMap(userCapacity.data || [], userActivityByDate);
      addActivitiesToMap(userNeeds.data || [], userActivityByDate);

      // Add all partner activities
      addActivitiesToMap(partnerQuestions.data || [], partnerActivityByDate);
      addActivitiesToMap(partnerCapacity.data || [], partnerActivityByDate);
      addActivitiesToMap(partnerNeeds.data || [], partnerActivityByDate);

      const totalCompleted = userActivityByDate.size;

      // Calculate streak - consecutive days where BOTH partners were active
      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let checkDate = new Date(today);
      let streakBroken = false;

      // Check consecutive days from today backwards
      // BOTH partners must have been active on the same day for it to count
      while (!streakBroken) {
        const dateKey = checkDate.toISOString().split('T')[0];
        const userActive = userActivityByDate.has(dateKey);
        const partnerActive = partnerActivityByDate.has(dateKey);

        if (userActive && partnerActive) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          streakBroken = true;
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
