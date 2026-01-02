/**
 * Web fallback for Lovebirds Widget Plugin
 * Used when running in browser (not native)
 */

import { WebPlugin } from '@capacitor/core';
import type { LovebirdsWidgetPlugin } from './LovebirdsWidgetPlugin';

export class LovebirdsWidgetWeb extends WebPlugin implements LovebirdsWidgetPlugin {
  async reloadWidgets(): Promise<{ success: boolean; message: string }> {
    console.log('[LovebirdsWidget] Web: reloadWidgets() called (no-op)');
    return { success: false, message: 'Widgets not available on web' };
  }

  async reloadWidget(options: { kind: string }): Promise<{ success: boolean; message: string }> {
    console.log('[LovebirdsWidget] Web: reloadWidget() called (no-op)', options);
    return { success: false, message: 'Widgets not available on web' };
  }

  async saveToAppGroup(options: { key: string; value: string }): Promise<{ success: boolean; key: string }> {
    console.log('[LovebirdsWidget] Web: saveToAppGroup() called (no-op)', options.key);
    // Fallback to localStorage for web
    try {
      localStorage.setItem(`app_group_${options.key}`, options.value);
      return { success: true, key: options.key };
    } catch (e) {
      return { success: false, key: options.key };
    }
  }

  async readFromAppGroup(options: { key: string }): Promise<{ success: boolean; key: string; value: string | null }> {
    console.log('[LovebirdsWidget] Web: readFromAppGroup() called', options.key);
    // Fallback to localStorage for web
    const value = localStorage.getItem(`app_group_${options.key}`);
    return { success: true, key: options.key, value };
  }

  async getWidgetInfo(): Promise<{
    appGroupId: string;
    isWidgetAvailable: boolean;
    lockScreenWidgetAvailable?: boolean;
    widgetKinds: string[];
  }> {
    return {
      appGroupId: 'group.com.lovebirds.app',
      isWidgetAvailable: false,
      lockScreenWidgetAvailable: false,
      widgetKinds: [],
    };
  }
}
