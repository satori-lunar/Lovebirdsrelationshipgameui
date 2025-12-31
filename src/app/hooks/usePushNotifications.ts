/**
 * Hook for managing push notifications
 *
 * Initializes push notifications on mount and provides
 * methods for requesting permission and handling notifications.
 */

import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { pushNotificationService, type PushNotificationData } from '../services/pushNotificationService';
import { useAuth } from './useAuth';

interface UsePushNotificationsOptions {
  onNotificationTap?: (data: PushNotificationData) => void;
}

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isEnabled: boolean;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unavailable';
  requestPermission: () => Promise<boolean>;
  loading: boolean;
}

export function usePushNotifications(
  options: UsePushNotificationsOptions = {}
): UsePushNotificationsReturn {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unavailable'>('unavailable');
  const [loading, setLoading] = useState(true);

  const isSupported = Capacitor.isNativePlatform();

  // Initialize push notifications
  useEffect(() => {
    const init = async () => {
      if (!isSupported) {
        setLoading(false);
        return;
      }

      await pushNotificationService.initialize();

      // Check current status
      const status = await pushNotificationService.getPermissionStatus();
      setPermissionStatus(status);
      setIsEnabled(status === 'granted');
      setLoading(false);
    };

    init();
  }, [isSupported]);

  // Set up notification tap handler
  useEffect(() => {
    if (options.onNotificationTap) {
      pushNotificationService.setTapHandler(options.onNotificationTap);
    }

    return () => {
      pushNotificationService.setTapHandler(() => {});
    };
  }, [options.onNotificationTap]);

  // Auto-request permission when user logs in (if not already granted)
  useEffect(() => {
    const autoRequest = async () => {
      if (!isSupported || !user || permissionStatus === 'granted') {
        return;
      }

      // Only auto-request if status is 'prompt' (not yet asked)
      if (permissionStatus === 'prompt') {
        const granted = await pushNotificationService.requestPermission();
        if (granted) {
          setIsEnabled(true);
          setPermissionStatus('granted');
        }
      }
    };

    autoRequest();
  }, [user, isSupported, permissionStatus]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    const granted = await pushNotificationService.requestPermission();
    if (granted) {
      setIsEnabled(true);
      setPermissionStatus('granted');
    } else {
      setPermissionStatus('denied');
    }

    return granted;
  }, [isSupported]);

  return {
    isSupported,
    isEnabled,
    permissionStatus,
    requestPermission,
    loading,
  };
}
