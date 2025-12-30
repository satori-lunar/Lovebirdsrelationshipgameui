import { api, handleSupabaseError } from './api';
import type { Tables, Inserts, Updates } from './api';

export type Dragon = Tables<'dragons'>;
export type DragonItem = Tables<'dragon_items'>;
export type DragonActivityLog = Tables<'dragon_activity_log'>;
export type DragonInteraction = Tables<'dragon_interactions'>;

export interface DragonStats {
  hunger: number;
  happiness: number;
  health: number;
  bond_level: number;
  experience: number;
  level: number;
  stage: string;
}

export interface ItemReward {
  itemId: string;
  quantity: number;
}

export const dragonService = {
  // Core dragon operations
  async createDragon(userId: string, name: string = 'Dragon'): Promise<Dragon> {
    const newDragon: Inserts<'dragons'> = {
      user_id: userId,
      name,
      stage: 'egg',
      experience: 0,
      level: 1,
      hunger: 100,
      happiness: 100,
      health: 100,
      bond_level: 0,
      color: 'purple',
      accessories: [],
    };

    const created = await handleSupabaseError(
      api.supabase
        .from('dragons')
        .insert(newDragon)
        .select()
        .single()
    );

    return created;
  },

  async getDragon(userId: string): Promise<Dragon | null> {
    const { data, error } = await api.supabase
      .from('dragons')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No dragon found
        return null;
      }
      throw error;
    }

    return data;
  },

  async updateDragon(userId: string, updates: Partial<Updates<'dragons'>>): Promise<Dragon> {
    const updated = await handleSupabaseError(
      api.supabase
        .from('dragons')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single()
    );

    return updated;
  },

  async getDragonStats(userId: string): Promise<DragonStats | null> {
    const dragon = await this.getDragon(userId);
    if (!dragon) return null;

    return {
      hunger: dragon.hunger,
      happiness: dragon.happiness,
      health: dragon.health,
      bond_level: dragon.bond_level,
      experience: dragon.experience,
      level: dragon.level,
      stage: dragon.stage,
    };
  },

  async getPartnerDragon(partnerId: string): Promise<Dragon | null> {
    return this.getDragon(partnerId);
  },

  // Item management
  async getInventory(userId: string): Promise<DragonItem[]> {
    const items = await handleSupabaseError(
      api.supabase
        .from('dragon_items')
        .select('*')
        .eq('user_id', userId)
        .order('item_type', { ascending: true })
        .order('created_at', { ascending: false })
    );

    return items || [];
  },

  async addItem(userId: string, itemId: string, quantity: number = 1): Promise<void> {
    // Try to find existing item
    const { data: existing } = await api.supabase
      .from('dragon_items')
      .select('*')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .single();

    if (existing) {
      // Update quantity
      await handleSupabaseError(
        api.supabase
          .from('dragon_items')
          .update({ quantity: existing.quantity + quantity })
          .eq('id', existing.id)
      );
    } else {
      // Insert new item
      const itemType = this.getItemType(itemId);
      await handleSupabaseError(
        api.supabase
          .from('dragon_items')
          .insert({
            user_id: userId,
            item_type: itemType,
            item_id: itemId,
            quantity,
          })
      );
    }
  },

  async useItem(userId: string, itemId: string): Promise<boolean> {
    // Check if user has the item
    const { data: item } = await api.supabase
      .from('dragon_items')
      .select('*')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .single();

    if (!item || item.quantity <= 0) {
      return false;
    }

    // Decrease quantity
    const newQuantity = item.quantity - 1;

    if (newQuantity === 0) {
      // Delete item if quantity reaches 0
      await handleSupabaseError(
        api.supabase
          .from('dragon_items')
          .delete()
          .eq('id', item.id)
      );
    } else {
      // Update quantity
      await handleSupabaseError(
        api.supabase
          .from('dragon_items')
          .update({ quantity: newQuantity })
          .eq('id', item.id)
      );
    }

    return true;
  },

  async hasItem(userId: string, itemId: string): Promise<boolean> {
    const { data: item } = await api.supabase
      .from('dragon_items')
      .select('quantity')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .single();

    return item ? item.quantity > 0 : false;
  },

  // Activity tracking
  async logActivity(
    userId: string,
    activityType: string,
    activityId: string,
    xpAwarded: number,
    itemsAwarded: ItemReward[] = []
  ): Promise<void> {
    await handleSupabaseError(
      api.supabase
        .from('dragon_activity_log')
        .insert({
          user_id: userId,
          activity_type: activityType,
          activity_id: activityId,
          xp_awarded: xpAwarded,
          items_awarded: itemsAwarded,
        })
    );
  },

  async hasLoggedActivity(userId: string, activityType: string, activityId: string): Promise<boolean> {
    const { data } = await api.supabase
      .from('dragon_activity_log')
      .select('id')
      .eq('user_id', userId)
      .eq('activity_type', activityType)
      .eq('activity_id', activityId)
      .single();

    return !!data;
  },

  async getRecentActivities(userId: string, limit: number = 20): Promise<DragonActivityLog[]> {
    const activities = await handleSupabaseError(
      api.supabase
        .from('dragon_activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
    );

    return activities || [];
  },

  // Interactions
  async sendGiftToDragon(
    fromUserId: string,
    toUserId: string,
    itemId: string,
    message?: string
  ): Promise<void> {
    await handleSupabaseError(
      api.supabase
        .from('dragon_interactions')
        .insert({
          from_user_id: fromUserId,
          to_user_id: toUserId,
          interaction_type: 'gift',
          gift_item_id: itemId,
          message,
        })
    );
  },

  async getReceivedInteractions(userId: string, limit: number = 20): Promise<DragonInteraction[]> {
    const interactions = await handleSupabaseError(
      api.supabase
        .from('dragon_interactions')
        .select('*')
        .eq('to_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
    );

    return interactions || [];
  },

  async getSentInteractions(userId: string, limit: number = 20): Promise<DragonInteraction[]> {
    const interactions = await handleSupabaseError(
      api.supabase
        .from('dragon_interactions')
        .select('*')
        .eq('from_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
    );

    return interactions || [];
  },

  // Helper: Determine item type from item ID
  getItemType(itemId: string): 'food' | 'treat' | 'toy' | 'accessory' {
    // Food items
    if (['apple', 'cake', 'feast'].includes(itemId)) {
      return 'food';
    }
    // Treat items
    if (['cookie', 'ice_cream', 'party_cake'].includes(itemId)) {
      return 'treat';
    }
    // Toy items
    if (['ball', 'puzzle', 'dragon_toy'].includes(itemId)) {
      return 'toy';
    }
    // Accessory items
    return 'accessory';
  },
};
