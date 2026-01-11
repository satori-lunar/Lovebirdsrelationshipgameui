import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from './useAuth';
import { useRelationship } from './useRelationship';

export interface MoodUpdate {
  id: string;
  user_id: string;
  mood: number; // 1-10 scale
  energy_level: number; // 1-10 scale
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SupportThread {
  id: string;
  type: 'check_in' | 'celebration' | 'comfort' | 'planning' | 'quality_time';
  status: 'active' | 'paused' | 'completed';
  priority: number; // 1-5, higher = more urgent
  last_action: Date;
  mood_triggers: number[]; // Mood levels that trigger this thread
  energy_triggers: number[]; // Energy levels that trigger this thread
  action_count: number; // How many times we've acted on this thread
  created_at: Date;
  updated_at: Date;
}

export function useMoodUpdates() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const queryClient = useQueryClient();

  // Get current mood update for today
  const { data: todayMood } = useQuery({
    queryKey: ['moodUpdate', user?.id, 'today'],
    queryFn: async () => {
      if (!user?.id) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      try {
        const { data } = await api.supabase
          .from('capacity_checkins')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return data;
      } catch (error) {
        return null;
      }
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refresh every minute
  });

  // Get partner's current mood
  const { data: partnerMood } = useQuery({
    queryKey: ['partnerMood', relationship?.id],
    queryFn: async () => {
      if (!relationship?.id || !user?.id) return null;

      const partnerId = relationship.partner_a_id === user.id
        ? relationship.partner_b_id
        : relationship.partner_a_id;

      if (!partnerId) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      try {
        const { data } = await api.supabase
          .from('capacity_checkins')
          .select('*')
          .eq('user_id', partnerId)
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return data;
      } catch (error) {
        return null;
      }
    },
    enabled: !!relationship?.id && !!user?.id,
    refetchInterval: 60000,
  });

  // Update mood/capacity
  const updateMoodMutation = useMutation({
    mutationFn: async (update: { mood: number; energy_level: number; notes?: string }) => {
      if (!user?.id || !relationship?.id) throw new Error('Not authenticated');

      // Check if we already have an entry today
      const existingEntry = todayMood;

      if (existingEntry) {
        // Update existing entry
        const { data, error } = await api.supabase
          .from('capacity_checkins')
          .update({
            mood: update.mood,
            energy_level: update.energy_level,
            notes: update.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEntry.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new entry
        const { data, error } = await api.supabase
          .from('capacity_checkins')
          .insert({
            user_id: user.id,
            couple_id: relationship.id,
            mood: update.mood,
            energy_level: update.energy_level,
            notes: update.notes
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch mood data
      queryClient.invalidateQueries({ queryKey: ['moodUpdate', user?.id, 'today'] });
      queryClient.invalidateQueries({ queryKey: ['partnerMood', relationship?.id] });
    }
  });

  // Adapt support threads based on mood changes
  const adaptSupportThreads = (oldMood?: number, newMood?: number, oldEnergy?: number, newEnergy?: number) => {
    if (!oldMood || !newMood) return;

    const moodChanged = Math.abs(newMood - oldMood) >= 2;
    const energyChanged = oldEnergy && newEnergy ? Math.abs(newEnergy - oldEnergy) >= 2 : false;

    // Mood updates should modify tone and pacing, not restart flows
    if (moodChanged || energyChanged) {
      // Adjust notification timing based on energy levels
      if (newEnergy && newEnergy <= 3) {
        // Low energy - reduce notification frequency
        console.log('Adapting support: Reducing notification frequency due to low energy');
      } else if (newEnergy && newEnergy >= 8) {
        // High energy - can increase gentle check-ins
        console.log('Adapting support: Increasing gentle check-ins due to high energy');
      }

      // Adjust tone based on mood
      if (newMood <= 3) {
        // Low mood - extra gentle, focus on comfort
        console.log('Adapting support: Switching to comfort-focused support');
      } else if (newMood >= 8) {
        // High mood - celebratory tone
        console.log('Adapting support: Switching to celebratory tone');
      }
    }
  };

  // Track mood changes to adapt support threads
  useEffect(() => {
    if (todayMood && partnerMood) {
      // This would normally compare with previous mood updates
      // For now, just log the adaptation logic
      adaptSupportThreads(
        partnerMood.mood,
        partnerMood.mood, // Same mood for demo
        partnerMood.energy_level,
        partnerMood.energy_level
      );
    }
  }, [todayMood, partnerMood]);

  return {
    todayMood,
    partnerMood,
    updateMood: updateMoodMutation.mutate,
    isUpdating: updateMoodMutation.isPending,
    adaptSupportThreads
  };
}
