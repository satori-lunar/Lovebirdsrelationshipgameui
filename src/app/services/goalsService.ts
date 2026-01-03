/**
 * Goals Service
 *
 * Handles CRUD operations for couple goals
 */

import { api } from './api';

export interface CoupleGoal {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  category?: string;
  completed: boolean;
  completed_by?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalParams {
  coupleId: string;
  title: string;
  category?: string;
}

export interface UpdateGoalParams {
  goalId: string;
  completed?: boolean;
  completedBy?: string;
}

class GoalsService {
  /**
   * Get all goals for a couple
   */
  async getGoals(coupleId: string): Promise<CoupleGoal[]> {
    console.log('📋 Fetching goals for couple:', coupleId);

    const { data, error } = await api.supabase
      .from('couple_goals')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching goals:', error);
      return [];
    }

    console.log(`✅ Found ${data?.length || 0} goals`);
    return data || [];
  }

  /**
   * Create a new goal
   */
  async createGoal(userId: string, params: CreateGoalParams): Promise<CoupleGoal> {
    console.log('➕ Creating goal:', params);

    const { data, error } = await api.supabase
      .from('couple_goals')
      .insert({
        couple_id: params.coupleId,
        created_by: userId,
        title: params.title,
        category: params.category,
        completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create goal:', error);
      throw new Error('Failed to create goal');
    }

    console.log('✅ Goal created:', data.id);
    return data;
  }

  /**
   * Toggle goal completion
   */
  async toggleGoal(userId: string, goalId: string, completed: boolean): Promise<CoupleGoal> {
    console.log(`${completed ? '✓' : '○'} Toggling goal ${goalId} to ${completed ? 'completed' : 'incomplete'}`);

    const updateData: any = {
      completed,
      updated_at: new Date().toISOString(),
    };

    if (completed) {
      updateData.completed_by = userId;
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_by = null;
      updateData.completed_at = null;
    }

    const { data, error } = await api.supabase
      .from('couple_goals')
      .update(updateData)
      .eq('id', goalId)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to toggle goal:', error);
      throw new Error('Failed to update goal');
    }

    console.log('✅ Goal updated');
    return data;
  }

  /**
   * Delete a goal
   */
  async deleteGoal(goalId: string): Promise<void> {
    console.log('🗑️ Deleting goal:', goalId);

    const { error } = await api.supabase
      .from('couple_goals')
      .delete()
      .eq('id', goalId);

    if (error) {
      console.error('❌ Failed to delete goal:', error);
      throw new Error('Failed to delete goal');
    }

    console.log('✅ Goal deleted');
  }
}

export const goalsService = new GoalsService();
