/**
 * Capacitor Plugin for Lovebirds Widget Integration
 *
 * Provides native iOS widget functionality:
 * - Widget timeline refresh
 * - App Groups data sharing
 * - Widget availability detection
 */

import { registerPlugin } from '@capacitor/core';

export interface LovebirdsWidgetPlugin {
  /**
   * Reload all widget timelines
   * Call this when widget data changes
   */
  reloadWidgets(): Promise<{ success: boolean; message: string }>;

  /**
   * Reload a specific widget kind
   * @param options.kind - Widget kind identifier (e.g., "LovebirdsMemoryWidget")
   */
  reloadWidget(options: { kind: string }): Promise<{ success: boolean; message: string }>;

  /**
   * Save data to App Group UserDefaults for widget access
   * @param options.key - Storage key
   * @param options.value - JSON string value
   */
  saveToAppGroup(options: { key: string; value: string }): Promise<{ success: boolean; key: string }>;

  /**
   * Read data from App Group UserDefaults
   * @param options.key - Storage key
   */
  readFromAppGroup(options: { key: string }): Promise<{ success: boolean; key: string; value: string | null }>;

  /**
   * Get information about widget availability and configuration
   */
  getWidgetInfo(): Promise<{
    appGroupId: string;
    isWidgetAvailable: boolean;
    lockScreenWidgetAvailable?: boolean;
    widgetKinds: string[];
  }>;
}

const LovebirdsWidget = registerPlugin<LovebirdsWidgetPlugin>('LovebirdsWidget', {
  web: () => import('./LovebirdsWidgetWeb').then(m => new m.LovebirdsWidgetWeb()),
});

export default LovebirdsWidget;
