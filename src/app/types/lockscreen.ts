/**
 * Lockscreen Wallpaper Types for Lovebirds
 *
 * Dynamic lockscreen wallpaper system that updates based on relationship data
 * and creates intimate, meaningful visuals for couples.
 */

/**
 * Types of dynamic lockscreen wallpapers
 */
export type LockscreenWallpaperType = 'time' | 'message' | 'mood' | 'growth';

/**
 * Wallpaper update frequency settings
 */
export type WallpaperUpdateMode = 'manual' | 'daily' | 'on_event';

/**
 * Message tone options for lockscreen messages
 */
export type MessageTone = 'love' | 'support' | 'quiet_presence';

/**
 * Privacy settings for lockscreen display
 */
export interface LockscreenPrivacySettings {
  showTextWhenLocked: boolean;      // Show text overlay when phone is locked
  pauseDuringConflict: boolean;     // Pause updates during relationship conflicts
  useNeutralDesign: boolean;        // Use neutral design for work/school settings
}

/**
 * Base wallpaper configuration
 */
export interface BaseLockscreenConfig {
  type: LockscreenWallpaperType;
  photoUrl: string | null;          // User-selected background photo
  backgroundGradient: string | null; // Gradient if no photo selected
  fontStyle: 'minimal' | 'elegant' | 'bold';
  textVisibility: 'full' | 'minimal' | 'none';
  privacySettings: LockscreenPrivacySettings;
  lastUpdated: string;
}

/**
 * Relationship Time Wallpaper Configuration
 * Displays time together with milestone celebrations
 */
export interface TimeWallpaperConfig extends BaseLockscreenConfig {
  type: 'time';
  relationshipStartDate: string;    // ISO date
  displayFormat: 'years_months' | 'total_days' | 'both';
  showMilestones: boolean;          // Celebrate 1000 days, 3 years, etc.
}

/**
 * Message-Based Wallpaper Configuration
 * Updates when partner sends an intentional lockscreen message
 */
export interface MessageWallpaperConfig extends BaseLockscreenConfig {
  type: 'message';
  currentMessage: LockscreenMessage | null;
  messageExpiry: '12h' | '24h' | 'until_next';
}

/**
 * Mood-Aware Wallpaper Configuration
 * Changes based on partner's current emotional state
 */
export interface MoodWallpaperConfig extends BaseLockscreenConfig {
  type: 'mood';
  showMoodText: boolean;             // Show text hints about partner mood
  colorPalette: 'warm' | 'calm' | 'muted' | 'neutral';
  partnerCurrentMood: string | null; // Current partner mood
}

/**
 * Shared Growth Wallpaper Configuration
 * Plant/symbol that grows with relationship engagement
 */
export interface GrowthWallpaperConfig extends BaseLockscreenConfig {
  type: 'growth';
  symbolType: 'plant' | 'flower' | 'tree' | 'star_constellation';
  growthLevel: number;               // 0-100 based on engagement
  lastInteractionDate: string;       // ISO date
  showGrowthText: boolean;
}

/**
 * Union type for all wallpaper configurations
 */
export type LockscreenWallpaperConfig =
  | TimeWallpaperConfig
  | MessageWallpaperConfig
  | MoodWallpaperConfig
  | GrowthWallpaperConfig;

/**
 * Lockscreen message sent from partner
 */
export interface LockscreenMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;                   // Max 150 characters
  tone: MessageTone;
  createdAt: string;
  expiresAt: string;
  isRead: boolean;
}

/**
 * Database row for lockscreen_messages table
 */
export interface LockscreenMessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  relationship_id: string;
  message: string;
  tone: MessageTone;
  created_at: string;
  expires_at: string;
  is_read: boolean;
  read_at: string | null;
}

/**
 * Database row for lockscreen_configs table
 */
export interface LockscreenConfigRow {
  id: string;
  user_id: string;
  relationship_id: string;
  wallpaper_type: LockscreenWallpaperType;
  photo_url: string | null;
  background_gradient: string | null;
  font_style: string;
  text_visibility: string;
  privacy_settings: any;              // JSON object
  type_specific_config: any;          // JSON object with type-specific settings
  created_at: string;
  updated_at: string;
}

/**
 * Payload for creating a lockscreen message
 */
export interface CreateLockscreenMessagePayload {
  receiverId: string;
  relationshipId: string;
  message: string;
  tone: MessageTone;
  expiryHours: number;                // 12, 24, or custom
}

/**
 * Wallpaper generation options
 */
export interface WallpaperGenerationOptions {
  width: number;                      // Device screen width
  height: number;                     // Device screen height
  devicePixelRatio: number;           // For high-DPI displays
  format: 'png' | 'jpeg';
  quality: number;                    // 0-1 for jpeg
}

/**
 * Generated wallpaper data
 */
export interface GeneratedWallpaper {
  dataUrl: string;                    // Base64 data URL
  blob: Blob;                         // For download
  width: number;
  height: number;
}

/**
 * Relationship milestone for time wallpaper
 */
export interface RelationshipMilestone {
  type: 'days' | 'months' | 'years';
  value: number;
  displayText: string;
  emoji: string;
}

/**
 * Growth tracking for shared growth wallpaper
 */
export interface GrowthMetrics {
  dailyQuestionsAnswered: number;
  moodsShared: number;
  checkInsCompleted: number;
  totalEngagement: number;            // Combined score
  growthLevel: number;                // 0-100
}
