/**
 * Push Notification Service
 *
 * Handles push notification registration, permissions, and receiving
 * notifications for widget gifts and other alerts.
 *
 * Uses Capacitor Push Notifications plugin for native iOS/Android support.
 */

import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import { widgetGiftService } from './widgetGiftService';

// Types for push notification data
export interface PushNotificationData {
  type: 'widget_gift' | 'message' | 'general';
  gift_id?: string;
  sender_id?: string;
  [key: string]: unknown;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  device_id?: string;
  is_active: boolean;
}

// Callback for handling notification taps
type NotificationTapHandler = (data: PushNotificationData) => void;

class PushNotificationService {
  private initialized = false;
  private tapHandler: NotificationTapHandler | null = null;
  private PushNotifications: typeof import('@capacitor/push-notifications').PushNotifications | null = null;

  /**
   * Initialize push notifications
   * Call this early in app startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Only available on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications not available on web');
      return;
    }

    try {
      // Dynamically import to avoid issues on web
      const { PushNotifications } = await import('@capacitor/push-notifications');
      this.PushNotifications = PushNotifications;

      // Register listeners
      await this.registerListeners();

      this.initialized = true;
      console.log('Push notification service initialized');
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  /**
   * Request permission and register for push notifications
   */
  async requestPermission(): Promise<boolean> {
    if (!this.PushNotifications) {
      console.log('Push notifications not available');
      return false;
    }

    try {
      // Check current permission status
      let permStatus = await this.PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        // Request permission
        permStatus = await this.PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.log('Push notification permission denied');
        return false;
      }

      // Register with APNs/FCM
      await this.PushNotifications.register();
      return true;
    } catch (error) {
      console.error('Error requesting push permission:', error);
      return false;
    }
  }

  /**
   * Register event listeners for push notifications
   */
  private async registerListeners(): Promise<void> {
    if (!this.PushNotifications) return;

    // Registration success - save token
    await this.PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success:', token.value);
      await this.saveToken(token.value);
    });

    // Registration error
    await this.PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    // Notification received while app is in foreground
    await this.PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.log('Push notification received:', notification);

      // If it's a widget gift, sync immediately
      const data = notification.data as PushNotificationData;
      if (data?.type === 'widget_gift') {
        await widgetGiftService.syncGiftsToWidget();
      }
    });

    // Notification tapped - app opened from notification
    await this.PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push notification action:', action);

      const data = action.notification.data as PushNotificationData;
      if (this.tapHandler) {
        this.tapHandler(data);
      }
    });
  }

  /**
   * Save push token to database
   */
  private async saveToken(token: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user logged in, cannot save push token');
      return;
    }

    const platform = Capacitor.getPlatform() as 'ios' | 'android';

    try {
      // Upsert token (update if exists, insert if not)
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: user.id,
          token,
          platform,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,token',
        });

      if (error) {
        console.error('Failed to save push token:', error);
      } else {
        console.log('Push token saved successfully');
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  /**
   * Get current user's push tokens
   */
  async getMyTokens(): Promise<PushToken[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('push_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to get push tokens:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Deactivate all tokens for current user (on logout)
   */
  async deactivateAllTokens(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('push_tokens')
      .update({ is_active: false })
      .eq('user_id', user.id);
  }

  /**
   * Set handler for notification taps
   */
  setTapHandler(handler: NotificationTapHandler): void {
    this.tapHandler = handler;
  }

  /**
   * Check if push notifications are supported and enabled
   */
  async isEnabled(): Promise<boolean> {
    if (!this.PushNotifications) return false;

    try {
      const permStatus = await this.PushNotifications.checkPermissions();
      return permStatus.receive === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Get current permission status
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unavailable'> {
    if (!this.PushNotifications) return 'unavailable';

    try {
      const permStatus = await this.PushNotifications.checkPermissions();
      return permStatus.receive;
    } catch {
      return 'unavailable';
    }
  }
}

export const pushNotificationService = new PushNotificationService();
