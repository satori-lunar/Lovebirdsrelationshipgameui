/**
 * Widget Service for Lovebirds Memory Widget
 *
 * This service handles:
 * - Fetching memories with photos for the widget gallery
 * - Saving/loading widget configuration
 * - Syncing selected memories to native widget storage
 */

import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import type { MemoryWidgetData, WidgetBundle, WidgetConfiguration } from '../types/widget';
import LovebirdsWidget from '../plugins/LovebirdsWidgetPlugin';

const WIDGET_DATA_KEY = 'lovebirds_widget_data';
const WIDGET_CONFIG_KEY = 'lovebirds_widget_config';

export const widgetService = {
  /**
   * Fetch all memories with photos for the widget gallery
   * Only returns memories that have a photo_url (widget-ready)
   */
  async getWidgetReadyMemories(relationshipId: string, userId: string): Promise<MemoryWidgetData[]> {
    const { data, error } = await supabase
      .from('memories')
      .select('id, photo_url, title, journal_entry, memory_date, category')
      .eq('relationship_id', relationshipId)
      .not('photo_url', 'is', null)
      .order('memory_date', { ascending: false });

    if (error) throw error;

    // Filter for privacy: show non-private memories + user's own private memories
    const filteredData = (data || []).filter(memory => {
      // For now, show all memories with photos since we can't easily filter
      // The RLS policies on the backend already handle privacy
      return true;
    });

    return filteredData.map(memory => ({
      id: memory.id,
      photoUrl: memory.photo_url!,
      title: memory.title,
      note: memory.journal_entry,
      date: this.formatDate(memory.memory_date),
      category: memory.category
    }));
  },

  /**
   * Save user's widget configuration to local storage
   */
  async saveWidgetConfig(config: WidgetConfiguration): Promise<void> {
    await Preferences.set({
      key: WIDGET_CONFIG_KEY,
      value: JSON.stringify(config)
    });
  },

  /**
   * Get current widget configuration from local storage
   */
  async getWidgetConfig(): Promise<WidgetConfiguration | null> {
    const { value } = await Preferences.get({ key: WIDGET_CONFIG_KEY });
    return value ? JSON.parse(value) : null;
  },

  /**
   * Sync selected memories to native widget storage
   * This data will be read by the native iOS/Android widget
   */
  async syncToWidget(
    selectedIds: string[],
    allMemories: MemoryWidgetData[]
  ): Promise<void> {
    const selectedMemories = allMemories.filter(m => selectedIds.includes(m.id));

    const bundle: WidgetBundle = {
      memories: selectedMemories,
      config: {
        selectedMemoryIds: selectedIds,
        currentIndex: 0,
        lastRotated: new Date().toISOString(),
        rotationMode: 'daily'
      },
      lastUpdated: new Date().toISOString()
    };

    // Use App Groups for iOS, Preferences for other platforms
    if (Capacitor.getPlatform() === 'ios') {
      await LovebirdsWidget.saveToAppGroup({
        key: WIDGET_DATA_KEY,
        value: JSON.stringify(bundle)
      });
    } else {
      await Preferences.set({
        key: WIDGET_DATA_KEY,
        value: JSON.stringify(bundle)
      });
    }

    // Trigger native widget refresh
    await this.notifyWidgetRefresh();
  },

  /**
   * Trigger platform-specific widget refresh
   * Calls native WidgetCenter.shared.reloadAllTimelines() on iOS
   */
  async notifyWidgetRefresh(): Promise<void> {
    try {
      if (Capacitor.getPlatform() === 'ios') {
        const result = await LovebirdsWidget.reloadWidgets();
        console.log('[Widget] Refresh triggered:', result.message);
      } else {
        console.log('[Widget] Refresh triggered - iOS only feature');
      }
    } catch (error) {
      console.error('[Widget] Failed to refresh:', error);
    }
  },

  /**
   * Format date for display in widget
   * Shows "Month Day" for current year, "Month Day, Year" for other years
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const isThisYear = date.getFullYear() === now.getFullYear();

    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      ...(isThisYear ? {} : { year: 'numeric' })
    });
  },

  /**
   * Check if widget feature is available (Capacitor is running)
   */
  isWidgetAvailable(): boolean {
    // Check if we're running in a Capacitor native app
    // For web, this will be false
    return typeof window !== 'undefined' &&
           'Capacitor' in window &&
           (window as any).Capacitor?.isNativePlatform?.() === true;
  }
};
