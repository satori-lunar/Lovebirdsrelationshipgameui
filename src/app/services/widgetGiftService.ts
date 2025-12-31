/**
 * Widget Gift Service
 *
 * Handles sending and receiving "love notes" to partner's home screen widget.
 * Gifts expire after 24 hours, then widget reverts to memory rotation.
 * Multiple pending gifts are displayed as a carousel.
 */

import { Preferences } from '@capacitor/preferences';
import { supabase } from '../lib/supabase';
import type {
  WidgetGiftData,
  WidgetGiftRow,
  CreateWidgetGiftPayload,
  WidgetGiftStatus,
  MemoryWidgetData
} from '../types/widget';
import { widgetService } from './widgetService';

const WIDGET_GIFT_KEY = 'lovebirds_widget_gift';
const LOCK_SCREEN_GIFT_KEY = 'lovebirds_lock_screen_gift';

export const widgetGiftService = {
  /**
   * Send a gift to partner's widget
   */
  async sendGift(
    senderId: string,
    payload: CreateWidgetGiftPayload
  ): Promise<WidgetGiftRow> {
    const { data, error } = await supabase
      .from('widget_gifts')
      .insert({
        sender_id: senderId,
        receiver_id: payload.receiverId,
        relationship_id: payload.relationshipId,
        gift_type: payload.giftType,
        photo_url: payload.photoUrl || null,
        memory_id: payload.memoryId || null,
        message: payload.message || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get all active (non-expired, non-dismissed) gifts for a user
   * Returns gifts in queue order (oldest first for carousel)
   */
  async getActiveGifts(userId: string): Promise<WidgetGiftData[]> {
    // Use the database function that handles expiration
    const { data, error } = await supabase
      .rpc('get_active_widget_gifts', { user_id: userId });

    if (error) {
      // Fallback to direct query if RPC not available
      return this.getActiveGiftsFallback(userId);
    }

    return (data || []).map(this.mapToWidgetGiftData);
  },

  /**
   * Fallback query if RPC function not available
   */
  async getActiveGiftsFallback(userId: string): Promise<WidgetGiftData[]> {
    const { data, error } = await supabase
      .from('widget_gifts')
      .select(`
        id,
        sender_id,
        gift_type,
        photo_url,
        memory_id,
        message,
        created_at,
        expires_at,
        memories:memory_id (
          photo_url,
          title
        ),
        sender:sender_id (
          onboarding_responses (
            partner_name
          )
        )
      `)
      .eq('receiver_id', userId)
      .in('status', ['pending', 'delivered'])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((gift: any) => ({
      id: gift.id,
      senderId: gift.sender_id,
      senderName: gift.sender?.onboarding_responses?.[0]?.partner_name || 'Your Partner',
      giftType: gift.gift_type,
      photoUrl: gift.photo_url || gift.memories?.photo_url || null,
      memoryId: gift.memory_id,
      memoryTitle: gift.memories?.title || null,
      message: gift.message,
      createdAt: gift.created_at,
      expiresAt: gift.expires_at,
    }));
  },

  /**
   * Map database response to WidgetGiftData
   */
  mapToWidgetGiftData(row: any): WidgetGiftData {
    return {
      id: row.id,
      senderId: row.sender_id,
      senderName: row.sender_name || 'Your Partner',
      giftType: row.gift_type,
      photoUrl: row.photo_url || row.memory_photo_url || null,
      memoryId: row.memory_id,
      memoryTitle: row.memory_title || null,
      message: row.message,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  },

  /**
   * Mark a gift as seen (when user opens app)
   */
  async markGiftSeen(giftId: string): Promise<void> {
    const { error } = await supabase
      .from('widget_gifts')
      .update({
        status: 'seen' as WidgetGiftStatus,
        seen_at: new Date().toISOString(),
      })
      .eq('id', giftId);

    if (error) throw error;
  },

  /**
   * Dismiss a gift (user taps dismiss on widget)
   */
  async dismissGift(giftId: string): Promise<void> {
    const { error } = await supabase
      .from('widget_gifts')
      .update({
        status: 'dismissed' as WidgetGiftStatus,
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', giftId);

    if (error) throw error;

    // Update local widget storage
    await this.syncGiftsToWidget();
  },

  /**
   * Mark gift as delivered (widget successfully displayed it)
   */
  async markGiftDelivered(giftId: string): Promise<void> {
    const { error } = await supabase
      .from('widget_gifts')
      .update({
        status: 'delivered' as WidgetGiftStatus,
        delivered_at: new Date().toISOString(),
      })
      .eq('id', giftId)
      .eq('status', 'pending'); // Only update if still pending

    if (error) throw error;
  },

  /**
   * Get gifts sent by the current user (for history)
   */
  async getSentGifts(userId: string, limit = 20): Promise<WidgetGiftRow[]> {
    const { data, error } = await supabase
      .from('widget_gifts')
      .select('*')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Get gifts received by the current user (for history)
   */
  async getReceivedGifts(userId: string, limit = 20): Promise<WidgetGiftRow[]> {
    const { data, error } = await supabase
      .from('widget_gifts')
      .select('*')
      .eq('receiver_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  /**
   * Sync active gifts to native widget storage
   * Gift takes priority over memory rotation
   * Also syncs to lock screen widget storage
   */
  async syncGiftsToWidget(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const gifts = await this.getActiveGifts(user.id);

    // Get the current (first in queue) gift
    const activeGift = gifts.length > 0 ? gifts[0] : null;

    // Store gift data for home screen widget
    await Preferences.set({
      key: WIDGET_GIFT_KEY,
      value: JSON.stringify({
        gifts,
        activeGift,
        lastChecked: new Date().toISOString(),
      }),
    });

    // Also sync to lock screen storage (same data, different key for clarity)
    await this.syncToLockScreen(activeGift);

    // If there's an active gift, mark it as delivered
    if (activeGift) {
      await this.markGiftDelivered(activeGift.id);
    }

    // Trigger widget refresh (includes lock screen widgets)
    await widgetService.notifyWidgetRefresh();
  },

  /**
   * Sync gift data to lock screen widget storage
   * Used by iOS lock screen widgets and Android lock screen notifications
   */
  async syncToLockScreen(activeGift: WidgetGiftData | null): Promise<void> {
    const lockScreenData = {
      hasActiveGift: activeGift !== null,
      gift: activeGift ? {
        id: activeGift.id,
        senderName: activeGift.senderName,
        photoUrl: activeGift.photoUrl,
        message: activeGift.message,
        expiresAt: activeGift.expiresAt,
        // Shortened message for lock screen display
        shortMessage: activeGift.message
          ? activeGift.message.substring(0, 50) + (activeGift.message.length > 50 ? '...' : '')
          : null,
      } : null,
      lastUpdated: new Date().toISOString(),
    };

    await Preferences.set({
      key: LOCK_SCREEN_GIFT_KEY,
      value: JSON.stringify(lockScreenData),
    });
  },

  /**
   * Get lock screen gift data
   */
  async getLockScreenGiftData(): Promise<{
    hasActiveGift: boolean;
    gift: {
      id: string;
      senderName: string;
      photoUrl: string | null;
      message: string | null;
      shortMessage: string | null;
      expiresAt: string;
    } | null;
    lastUpdated: string;
  } | null> {
    const { value } = await Preferences.get({ key: LOCK_SCREEN_GIFT_KEY });
    return value ? JSON.parse(value) : null;
  },

  /**
   * Dismiss lock screen notification (Android)
   * Clears the persistent notification
   */
  async dismissLockScreenNotification(): Promise<void> {
    // Clear local storage
    await Preferences.set({
      key: LOCK_SCREEN_GIFT_KEY,
      value: JSON.stringify({
        hasActiveGift: false,
        gift: null,
        lastUpdated: new Date().toISOString(),
      }),
    });

    // Native dismissal will be triggered by widget refresh
    await widgetService.notifyWidgetRefresh();
  },

  /**
   * Get locally stored gift data (for widget to read)
   */
  async getLocalGiftData(): Promise<{
    gifts: WidgetGiftData[];
    activeGift: WidgetGiftData | null;
    lastChecked: string;
  } | null> {
    const { value } = await Preferences.get({ key: WIDGET_GIFT_KEY });
    return value ? JSON.parse(value) : null;
  },

  /**
   * Upload a photo to Supabase storage for widget gift
   */
  async uploadGiftPhoto(
    userId: string,
    photoBlob: Blob
  ): Promise<string> {
    const fileName = `${userId}/${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from('widget-gifts')
      .upload(fileName, photoBlob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('widget-gifts')
      .getPublicUrl(data.path);

    return publicUrl;
  },

  /**
   * Get memories that can be sent as gifts (have photos)
   */
  async getGiftableMemories(
    relationshipId: string
  ): Promise<MemoryWidgetData[]> {
    return widgetService.getWidgetReadyMemories(relationshipId, '');
  },

  /**
   * Subscribe to incoming gifts (real-time)
   */
  subscribeToGifts(
    userId: string,
    onGiftReceived: (gift: WidgetGiftRow) => void
  ): () => void {
    const channel = supabase
      .channel('widget_gifts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'widget_gifts',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          onGiftReceived(payload.new as WidgetGiftRow);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Get time remaining until gift expires
   */
  getTimeRemaining(expiresAt: string): string {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  },
};
