import { api } from './api';

export type ChallengeCategory = 'memory_reflection' | 'communication_emotional' | 'appreciation_affirmation' | 'fun_playful' | 'future_vision';

export interface CoupleChallenge {
  id: string;
  category: ChallengeCategory;
  title: string;
  prompt: string;
  created_at: string;
}

export interface ChallengeResponse {
  id: string;
  challenge_id: string;
  relationship_id: string;
  user_id: string;
  response: string;
  is_visible_to_partner: boolean;
  media_url?: string;
  media_type?: 'image' | 'video';
  created_at: string;
  updated_at: string;
}

export interface ChallengeWithResponse extends CoupleChallenge {
  myResponse?: ChallengeResponse;
  partnerResponse?: ChallengeResponse;
}

export const coupleChallengesService = {
  /**
   * Get all challenges, optionally filtered by category
   */
  async getChallenges(category?: ChallengeCategory): Promise<CoupleChallenge[]> {
    let query = api.supabase
      .from('couple_challenges')
      .select('*')
      .order('created_at', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching challenges:', error);
      throw new Error(error.message || 'Failed to fetch challenges');
    }

    return data || [];
  },

  /**
   * Get challenges with user and partner responses
   */
  async getChallengesWithResponses(
    relationshipId: string,
    userId: string,
    partnerId: string,
    category?: ChallengeCategory
  ): Promise<ChallengeWithResponse[]> {
    // Get all challenges
    const challenges = await this.getChallenges(category);

    // Get all responses for this relationship
    const { data: responses, error } = await api.supabase
      .from('couple_challenge_responses')
      .select('*')
      .eq('relationship_id', relationshipId)
      .in('user_id', [userId, partnerId]);

    if (error) {
      console.error('Error fetching challenge responses:', error);
      throw new Error(error.message || 'Failed to fetch challenge responses');
    }

    // Map responses to challenges
    return challenges.map(challenge => {
      const myResponse = responses?.find(r => r.challenge_id === challenge.id && r.user_id === userId);
      const partnerResponse = responses?.find(r => r.challenge_id === challenge.id && r.user_id === partnerId);

      return {
        ...challenge,
        myResponse,
        partnerResponse,
      };
    });
  },

  /**
   * Upload media file for a challenge response
   */
  async uploadMedia(
    userId: string,
    file: File,
    challengeId: string
  ): Promise<{ url: string; type: 'image' | 'video' }> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${challengeId}-${Date.now()}.${fileExt}`;
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

    const { data, error } = await api.supabase.storage
      .from('challenge-media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading media:', error);
      throw new Error(error.message || 'Failed to upload media');
    }

    const { data: urlData } = api.supabase.storage
      .from('challenge-media')
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      type: mediaType,
    };
  },

  /**
   * Submit a response to a challenge
   */
  async submitResponse(
    challengeId: string,
    relationshipId: string,
    userId: string,
    response: string,
    isVisibleToPartner: boolean = true,
    mediaUrl?: string,
    mediaType?: 'image' | 'video'
  ): Promise<ChallengeResponse> {
    // Check if response already exists
    const { data: existing } = await api.supabase
      .from('couple_challenge_responses')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .maybeSingle();

    const updateData: any = {
      response,
      is_visible_to_partner: isVisibleToPartner,
      updated_at: new Date().toISOString(),
    };

    if (mediaUrl !== undefined) {
      updateData.media_url = mediaUrl;
      updateData.media_type = mediaType;
    }

    if (existing) {
      // Update existing response
      const { data, error } = await api.supabase
        .from('couple_challenge_responses')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating challenge response:', error);
        throw new Error(error.message || 'Failed to update challenge response');
      }

      return data;
    } else {
      // Insert new response
      const insertData: any = {
        challenge_id: challengeId,
        relationship_id: relationshipId,
        user_id: userId,
        response,
        is_visible_to_partner: isVisibleToPartner,
      };

      if (mediaUrl) {
        insertData.media_url = mediaUrl;
        insertData.media_type = mediaType;
      }

      const { data, error } = await api.supabase
        .from('couple_challenge_responses')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error submitting challenge response:', error);
        throw new Error(error.message || 'Failed to submit challenge response');
      }

      return data;
    }
  },

  /**
   * Delete a challenge response
   */
  async deleteResponse(responseId: string): Promise<void> {
    const { error } = await api.supabase
      .from('couple_challenge_responses')
      .delete()
      .eq('id', responseId);

    if (error) {
      console.error('Error deleting challenge response:', error);
      throw new Error(error.message || 'Failed to delete challenge response');
    }
  },

  /**
   * Toggle visibility of a response to partner
   */
  async toggleResponseVisibility(responseId: string, isVisible: boolean): Promise<void> {
    const { error } = await api.supabase
      .from('couple_challenge_responses')
      .update({
        is_visible_to_partner: isVisible,
        updated_at: new Date().toISOString(),
      })
      .eq('id', responseId);

    if (error) {
      console.error('Error toggling response visibility:', error);
      throw new Error(error.message || 'Failed to toggle response visibility');
    }
  },

  /**
   * Get completion stats for a relationship
   */
  async getCompletionStats(relationshipId: string, userId: string, partnerId: string) {
    const [challenges, responses] = await Promise.all([
      this.getChallenges(),
      api.supabase
        .from('couple_challenge_responses')
        .select('challenge_id, user_id')
        .eq('relationship_id', relationshipId)
        .in('user_id', [userId, partnerId]),
    ]);

    const totalChallenges = challenges.length;
    const userResponses = new Set(responses.data?.filter(r => r.user_id === userId).map(r => r.challenge_id));
    const partnerResponses = new Set(responses.data?.filter(r => r.user_id === partnerId).map(r => r.challenge_id));
    const bothCompleted = [...userResponses].filter(id => partnerResponses.has(id)).length;

    return {
      totalChallenges,
      userCompleted: userResponses.size,
      partnerCompleted: partnerResponses.size,
      bothCompleted,
    };
  },
};
