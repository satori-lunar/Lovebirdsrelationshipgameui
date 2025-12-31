/**
 * Widget Types for Lovebirds Memory Widget
 *
 * These types define the data structures used for the home screen widget
 * that displays relationship memories with photos.
 */

/**
 * Data for a single memory to display in the widget
 */
export interface MemoryWidgetData {
  id: string;
  photoUrl: string;           // Supabase CDN URL
  title: string;              // Memory title
  note: string | null;        // Journal entry (the "nice little note")
  date: string;               // Formatted memory_date
  category: string | null;    // For potential styling
}

/**
 * User's widget configuration preferences
 */
export interface WidgetConfiguration {
  selectedMemoryIds: string[];    // IDs of memories user selected
  currentIndex: number;           // Which memory is currently displayed
  lastRotated: string;            // ISO date of last rotation
  rotationMode: 'daily' | 'tap';  // How often to rotate
}

/**
 * Complete widget data bundle stored in native preferences
 * This is what the native widget reads to display content
 */
export interface WidgetBundle {
  memories: MemoryWidgetData[];   // Array of selected memories
  config: WidgetConfiguration;
  lastUpdated: string;
}
