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
  activeGift?: WidgetGiftData;    // Partner-sent gift takes priority
}

/**
 * Gift types that can be sent to partner's widget
 */
export type WidgetGiftType = 'photo' | 'memory' | 'note';

/**
 * Status of a widget gift
 */
export type WidgetGiftStatus = 'pending' | 'delivered' | 'seen' | 'dismissed' | 'expired';

/**
 * Data for a gift sent to partner's widget
 */
export interface WidgetGiftData {
  id: string;
  senderId: string;
  senderName: string;
  giftType: WidgetGiftType;
  photoUrl: string | null;        // For 'photo' type or memory photo
  memoryId: string | null;        // For 'memory' type
  memoryTitle: string | null;     // Title if memory type
  message: string | null;         // Sweet note (max 150 chars)
  createdAt: string;
  expiresAt: string;
}

/**
 * Database row for widget_gifts table
 */
export interface WidgetGiftRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  relationship_id: string;
  gift_type: WidgetGiftType;
  photo_url: string | null;
  memory_id: string | null;
  message: string | null;
  status: WidgetGiftStatus;
  delivered_at: string | null;
  seen_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  expires_at: string;
}

/**
 * Payload for creating a new widget gift
 */
export interface CreateWidgetGiftPayload {
  receiverId: string;
  relationshipId: string;
  giftType: WidgetGiftType;
  photoUrl?: string;
  memoryId?: string;
  message?: string;
}
