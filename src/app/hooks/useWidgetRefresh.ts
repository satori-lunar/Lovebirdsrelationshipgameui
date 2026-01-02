/**
 * Hook to handle automatic widget refresh when app goes to background
 *
 * This ensures the widget displays the latest data when the user
 * returns to their home screen after using the app.
 */

import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { widgetService } from '../services/widgetService';
import { widgetGiftService } from '../services/widgetGiftService';

/**
 * Automatically refresh widgets when app moves to background
 * Should be called once at the app root level
 */
export function useWidgetRefresh() {
  useEffect(() => {
    // Only set up listeners on iOS where widgets are supported
    if (Capacitor.getPlatform() !== 'ios') {
      return;
    }

    console.log('[useWidgetRefresh] Setting up app state listeners');

    // Listen for app state changes
    const stateChangeListener = CapacitorApp.addListener('appStateChange', async (state) => {
      console.log('[useWidgetRefresh] App state changed:', state.isActive);

      // When app goes to background, refresh the widget
      if (!state.isActive) {
        console.log('[useWidgetRefresh] App backgrounded - refreshing widget');
        try {
          // Trigger widget refresh so it shows latest data on home screen
          await widgetService.notifyWidgetRefresh();
        } catch (error) {
          console.error('[useWidgetRefresh] Failed to refresh widget:', error);
        }
      }
    });

    // Cleanup on unmount
    return () => {
      console.log('[useWidgetRefresh] Cleaning up app state listeners');
      stateChangeListener.then(listener => listener.remove());
    };
  }, []);
}

/**
 * Hook to sync gifts to widget when app opens/resumes
 * Checks for new gifts from partner when app becomes active
 */
export function useWidgetGiftSync(userId: string | null) {
  useEffect(() => {
    if (!userId || Capacitor.getPlatform() !== 'ios') {
      return;
    }

    console.log('[useWidgetGiftSync] Setting up gift sync');

    // Sync gifts when app becomes active
    const stateChangeListener = CapacitorApp.addListener('appStateChange', async (state) => {
      if (state.isActive) {
        console.log('[useWidgetGiftSync] App foregrounded - checking for gifts');
        try {
          // Sync any new gifts to the widget
          await widgetGiftService.syncGiftsToWidget();
        } catch (error) {
          console.error('[useWidgetGiftSync] Failed to sync gifts:', error);
        }
      }
    });

    // Also sync on initial mount
    const syncInitial = async () => {
      try {
        await widgetGiftService.syncGiftsToWidget();
      } catch (error) {
        console.error('[useWidgetGiftSync] Failed initial gift sync:', error);
      }
    };
    syncInitial();

    // Cleanup on unmount
    return () => {
      stateChangeListener.then(listener => listener.remove());
    };
  }, [userId]);
}
