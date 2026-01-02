/**
 * Lockscreen Gift Types for Lovebirds
 *
 * Giftable, customizable lockscreen wallpapers that partners design and send to each other.
 * These are intentional, beautiful moments - not dynamic backgrounds.
 */

/**
 * Wallpaper layout types
 */
export type WallpaperLayout =
  | 'minimal'           // Single main image with text
  | 'collage'           // Multiple images in artistic arrangement
  | 'memory_stack'      // Polaroid-style stacked photos
  | 'elegant_date'      // Date-focused with subtle imagery
  | 'split_screen'      // Top/bottom split images
  | 'film_strip';       // Film-strip style layout

/**
 * Mood/aesthetic presets
 */
export type MoodPreset =
  | 'soft_romantic'     // 💛 Warm, gentle colors
  | 'calm_cozy'         // 🌙 Muted, comfortable tones
  | 'bold_love'         // ❤️ Vibrant, passionate
  | 'minimal_clean';    // 🤍 Simple, elegant

/**
 * Font styles for text
 */
export type FontStyle =
  | 'handwritten'       // Personal, intimate feel
  | 'clean'             // Modern, readable
  | 'romantic'          // Elegant, flowing
  | 'bold';             // Strong, impactful

/**
 * Text alignment options
 */
export type TextAlignment = 'center' | 'left' | 'right';

/**
 * Text placement on lockscreen
 */
export type TextPlacement = 'top' | 'center' | 'bottom' | 'lower_third';

/**
 * Image frame style for secondary images
 */
export type ImageFrameStyle =
  | 'polaroid'          // Classic polaroid look
  | 'rounded'           // Rounded corners
  | 'film'              // Film strip frame
  | 'none';             // No frame

/**
 * Overlay gradient styles
 */
export type OverlayGradient =
  | 'warm_sunset'       // Orange to pink
  | 'soft_lavender'     // Purple to blue
  | 'deep_night'        // Dark blue to black
  | 'rose_gold'         // Pink to gold
  | 'ocean_breeze'      // Blue to teal
  | 'none';             // No gradient

/**
 * Single image in the wallpaper
 */
export interface WallpaperImage {
  id: string;
  url: string;                    // Image URL (Supabase storage)
  type: 'main' | 'secondary';     // Main background or secondary image
  position?: {                    // Position for secondary images
    x: number;                    // Percentage from left
    y: number;                    // Percentage from top
  };
  size?: {                        // Size for secondary images
    width: number;                // Percentage of canvas width
    height: number;               // Percentage of canvas height
  };
  frameStyle?: ImageFrameStyle;   // Frame style for secondary images
  rotation?: number;              // Rotation in degrees
}

/**
 * Relationship date display configuration
 */
export interface DateDisplayConfig {
  show: boolean;                  // Whether to show the date
  format: 'full_date' | 'days_together' | 'years_months' | 'custom';
  customText?: string;            // Custom format like "2 years • 4 months • still choosing you"
  placement: TextPlacement;
  color: string;                  // Hex color
  fontSize: number;               // Font size in pixels
}

/**
 * Message configuration
 */
export interface MessageConfig {
  text: string;                   // The message (1-2 lines, max 100 chars)
  fontStyle: FontStyle;
  alignment: TextAlignment;
  placement: TextPlacement;
  color: string;                  // Hex color
  fontSize: number;               // Font size in pixels
  lineSpacing: number;            // Line spacing multiplier
}

/**
 * Color and style configuration
 */
export interface StyleConfig {
  moodPreset: MoodPreset;
  textColor: string;              // Primary text color
  accentColor: string;            // Hearts, dots, dividers
  overlayGradient: OverlayGradient;
  overlayIntensity: number;       // 0-100
  textureStyle?: 'grain' | 'blur' | 'none';
  textureIntensity?: number;      // 0-100
}

/**
 * Complete wallpaper design
 */
export interface LockscreenWallpaperDesign {
  id?: string;                    // Database ID (when saved)
  layout: WallpaperLayout;
  images: WallpaperImage[];       // 1 main + 0-3 secondary
  dateDisplay?: DateDisplayConfig;
  message?: MessageConfig;
  style: StyleConfig;
  relationshipStartDate?: string; // ISO date for date calculations
  createdAt?: string;             // When designed
}

/**
 * Gift status
 */
export type GiftStatus =
  | 'pending'           // Sent but not yet viewed
  | 'viewed'            // Receiver has seen it
  | 'applied'           // Receiver set it as lockscreen
  | 'saved';            // Saved to memories

/**
 * Lockscreen gift (sent from one partner to another)
 */
export interface LockscreenGift {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  relationshipId: string;
  design: LockscreenWallpaperDesign;
  status: GiftStatus;
  viewedAt?: string;
  appliedAt?: string;
  savedAt?: string;
  createdAt: string;
  message?: string;               // Optional personal note with the gift
}

/**
 * Database row for lockscreen_gifts table
 */
export interface LockscreenGiftRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  relationship_id: string;
  design: any;                    // JSONB - LockscreenWallpaperDesign
  status: GiftStatus;
  viewed_at: string | null;
  applied_at: string | null;
  saved_at: string | null;
  created_at: string;
  sender_message: string | null;  // Optional note from sender
}

/**
 * Saved wallpaper in memories vault
 */
export interface SavedWallpaper {
  id: string;
  giftId: string;                 // Reference to original gift
  userId: string;                 // Who saved it
  design: LockscreenWallpaperDesign;
  thumbnailUrl: string;           // Preview thumbnail
  savedAt: string;
  fromPartner: boolean;           // True if received, false if sent
  partnerName?: string;
}

/**
 * Memories vault metadata
 */
export interface MemoriesVault {
  userId: string;
  wallpapers: SavedWallpaper[];
  totalCount: number;
  receivedCount: number;
  sentCount: number;
}

/**
 * Privacy settings for lockscreen gifts
 */
export interface GiftPrivacySettings {
  allowGifts: boolean;            // Can receive gifts
  requireApproval: boolean;       // Must approve before auto-applying
  maxPerWeek: number;             // Limit frequency (0 = unlimited)
  hideRelationshipInfo: boolean;  // Hide dates/personal info
}

/**
 * Database row for gift_privacy_settings table
 */
export interface GiftPrivacySettingsRow {
  user_id: string;
  allow_gifts: boolean;
  require_approval: boolean;
  max_per_week: number;
  hide_relationship_info: boolean;
  updated_at: string;
}

/**
 * Payload for creating a new gift
 */
export interface CreateGiftPayload {
  receiverId: string;
  relationshipId: string;
  design: LockscreenWallpaperDesign;
  senderMessage?: string;
}

/**
 * Wallpaper generation options for high-quality output
 */
export interface WallpaperGenerationOptions {
  width: number;                  // Target width (e.g., 1170 for iPhone)
  height: number;                 // Target height (e.g., 2532 for iPhone)
  devicePixelRatio: number;       // Retina displays = 3
  format: 'png' | 'jpeg';
  quality: number;                // 0-1 for jpeg
  optimizeForLockscreen: boolean; // Add safe zones for time/notifications
}

/**
 * Generated wallpaper output
 */
export interface GeneratedWallpaper {
  dataUrl: string;                // Base64 data URL
  blob: Blob;                     // For download
  thumbnailDataUrl: string;       // Smaller preview
  width: number;
  height: number;
  fileSize: number;               // In bytes
}

/**
 * Layout template definition
 */
export interface LayoutTemplate {
  layout: WallpaperLayout;
  name: string;
  description: string;
  previewImage: string;
  isPremium: boolean;             // Requires premium subscription
  defaultStyle: Partial<StyleConfig>;
  imageSlots: {
    main: boolean;                // Has main image slot
    secondaryCount: number;       // Number of secondary slots
    defaultPositions?: Array<{    // Default positions for secondary images
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
  };
}

/**
 * Mood preset definition with colors
 */
export interface MoodPresetDefinition {
  preset: MoodPreset;
  name: string;
  emoji: string;
  colors: {
    textColor: string;
    accentColor: string;
    gradientStart: string;
    gradientEnd: string;
  };
}

/**
 * Step in the creation wizard
 */
export type CreationStep =
  | 'layout'            // Choose layout
  | 'images'            // Add/arrange images
  | 'date'              // Configure date display
  | 'message'           // Add message
  | 'style'             // Customize colors/mood
  | 'preview'           // Preview and finalize
  | 'gift';             // Send as gift

/**
 * Creation wizard state
 */
export interface WizardState {
  currentStep: CreationStep;
  design: Partial<LockscreenWallpaperDesign>;
  completedSteps: CreationStep[];
  canProceed: boolean;
}

/**
 * Gift notification data
 */
export interface GiftNotificationData {
  type: 'lockscreen_gift';
  giftId: string;
  senderId: string;
  senderName: string;
  thumbnailUrl?: string;
}
