import { api, handleSupabaseError } from './api';

export interface GiftSuggestion {
  id: string;
  name: string;
  description: string;
  category: string;
  price_range: string;
  why_its_great: string;
  is_active: boolean;
  created_at: string;
}

export interface SavedGift {
  id: string;
  gift_id: string;
  user_id: string;
  relationship_id: string;
  notes?: string;
  saved_at: string;
}

export interface GiftWithSaved extends GiftSuggestion {
  is_saved: boolean;
  saved_gift_id?: string;
  notes?: string;
}

export const GIFT_CATEGORIES = [
  { id: 'Birthday', label: 'Birthday', emoji: '🎂', color: 'from-yellow-400 to-orange-400' },
  { id: 'Anniversary', label: 'Anniversary', emoji: '💝', color: 'from-pink-400 to-rose-400' },
  { id: 'Just Because', label: 'Just Because', emoji: '💕', color: 'from-purple-400 to-pink-400' },
  { id: 'Holiday', label: 'Holiday', emoji: '🎄', color: 'from-green-400 to-emerald-400' },
  { id: 'Apology', label: 'Apology', emoji: '🙏', color: 'from-blue-400 to-cyan-400' },
  { id: 'Date Night', label: 'Date Night', emoji: '🌹', color: 'from-rose-400 to-red-400' },
  { id: 'Experience', label: 'Experience', emoji: '🎫', color: 'from-indigo-400 to-purple-400' },
  { id: 'Practical', label: 'Practical', emoji: '🎁', color: 'from-teal-400 to-cyan-400' },
];

export const giftSuggestionsService = {
  /**
   * Get all gift suggestions
   */
  async getAllGifts(): Promise<GiftSuggestion[]> {
    const gifts = await handleSupabaseError(
      api.supabase
        .from('gift_suggestions')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
    );
    return gifts || [];
  },

  /**
   * Get gift suggestions by category
   */
  async getGiftsByCategory(category: string): Promise<GiftSuggestion[]> {
    const gifts = await handleSupabaseError(
      api.supabase
        .from('gift_suggestions')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
    );
    return gifts || [];
  },

  /**
   * Get gifts with saved status for a user
   */
  async getGiftsWithSavedStatus(
    relationshipId: string,
    userId: string,
    category?: string
  ): Promise<GiftWithSaved[]> {
    let query = api.supabase
      .from('gift_suggestions')
      .select('*')
      .eq('is_active', true);

    if (category) {
      query = query.eq('category', category);
    }

    const gifts = await handleSupabaseError(
      query.order('created_at', { ascending: true })
    );

    if (!gifts) return [];

    // Get all saved gifts for this relationship
    const savedGifts = await handleSupabaseError(
      api.supabase
        .from('saved_gifts')
        .select('*')
        .eq('relationship_id', relationshipId)
        .eq('user_id', userId)
    );

    // Combine gifts with saved status
    return gifts.map((gift) => {
      const saved = savedGifts?.find((s) => s.gift_id === gift.id);
      return {
        ...gift,
        is_saved: !!saved,
        saved_gift_id: saved?.id,
        notes: saved?.notes,
      };
    });
  },

  /**
   * Save a gift to user's saved list
   */
  async saveGift(
    giftId: string,
    userId: string,
    relationshipId: string,
    notes?: string
  ): Promise<SavedGift> {
    const savedGift = await handleSupabaseError(
      api.supabase
        .from('saved_gifts')
        .insert({
          gift_id: giftId,
          user_id: userId,
          relationship_id: relationshipId,
          notes: notes || null,
        })
        .select()
        .single()
    );
    return savedGift;
  },

  /**
   * Remove a gift from saved list
   */
  async unsaveGift(savedGiftId: string): Promise<void> {
    await handleSupabaseError(
      api.supabase.from('saved_gifts').delete().eq('id', savedGiftId)
    );
  },

  /**
   * Update notes for a saved gift
   */
  async updateGiftNotes(savedGiftId: string, notes: string): Promise<SavedGift> {
    const savedGift = await handleSupabaseError(
      api.supabase
        .from('saved_gifts')
        .update({ notes })
        .eq('id', savedGiftId)
        .select()
        .single()
    );
    return savedGift;
  },

  /**
   * Get saved gifts count by category
   */
  async getSavedCountByCategory(
    relationshipId: string,
    userId: string
  ): Promise<Record<string, number>> {
    const savedGifts = await handleSupabaseError(
      api.supabase
        .from('saved_gifts')
        .select('gift_id')
        .eq('relationship_id', relationshipId)
        .eq('user_id', userId)
    );

    if (!savedGifts) return {};

    const gifts = await this.getAllGifts();
    const counts: Record<string, number> = {};

    // Count saved gifts per category
    savedGifts.forEach((saved) => {
      const gift = gifts.find((g) => g.id === saved.gift_id);
      if (gift) {
        counts[gift.category] = (counts[gift.category] || 0) + 1;
      }
    });

    return counts;
  },
};
