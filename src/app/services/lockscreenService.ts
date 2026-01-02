/**
 * Lockscreen Wallpaper Service
 *
 * Handles:
 * - Wallpaper generation using HTML canvas
 * - Configuration management
 * - Time calculations for relationship duration
 * - Growth metrics calculation
 * - Message handling
 */

import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';
import type {
  LockscreenWallpaperConfig,
  TimeWallpaperConfig,
  MessageWallpaperConfig,
  MoodWallpaperConfig,
  GrowthWallpaperConfig,
  LockscreenMessage,
  LockscreenMessageRow,
  LockscreenConfigRow,
  CreateLockscreenMessagePayload,
  WallpaperGenerationOptions,
  GeneratedWallpaper,
  RelationshipMilestone,
  GrowthMetrics,
} from '../types/lockscreen';

const LOCKSCREEN_CONFIG_KEY = 'lovebirds_lockscreen_config';
const LOCKSCREEN_MESSAGE_KEY = 'lovebirds_lockscreen_message';

export const lockscreenService = {
  /**
   * Get user's current lockscreen configuration
   */
  async getConfig(userId: string): Promise<LockscreenWallpaperConfig | null> {
    const { data, error } = await supabase
      .from('lockscreen_configs')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;

    return this.parseConfigFromRow(data);
  },

  /**
   * Save lockscreen configuration
   */
  async saveConfig(
    userId: string,
    relationshipId: string,
    config: LockscreenWallpaperConfig
  ): Promise<void> {
    const row = this.configToRow(userId, relationshipId, config);

    const { error } = await supabase
      .from('lockscreen_configs')
      .upsert(row, { onConflict: 'user_id' });

    if (error) throw error;

    // Save to local storage for offline access
    await Preferences.set({
      key: LOCKSCREEN_CONFIG_KEY,
      value: JSON.stringify(config),
    });
  },

  /**
   * Send lockscreen message to partner
   */
  async sendMessage(payload: CreateLockscreenMessagePayload): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + payload.expiryHours);

    const { error } = await supabase.from('lockscreen_messages').insert({
      sender_id: (await supabase.auth.getUser()).data.user!.id,
      receiver_id: payload.receiverId,
      relationship_id: payload.relationshipId,
      message: payload.message,
      tone: payload.tone,
      expires_at: expiresAt.toISOString(),
    });

    if (error) throw error;
  },

  /**
   * Get active lockscreen message for user
   */
  async getActiveMessage(userId: string): Promise<LockscreenMessage | null> {
    const { data, error } = await supabase
      .from('lockscreen_messages')
      .select('*')
      .eq('receiver_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    return this.parseMessageFromRow(data);
  },

  /**
   * Mark message as read
   */
  async markMessageRead(messageId: string): Promise<void> {
    await supabase
      .from('lockscreen_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId);
  },

  /**
   * Calculate relationship duration
   */
  calculateRelationshipDuration(startDate: string): {
    years: number;
    months: number;
    days: number;
    totalDays: number;
  } {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const years = Math.floor(totalDays / 365);
    const remainingDays = totalDays % 365;
    const months = Math.floor(remainingDays / 30);
    const days = remainingDays % 30;

    return { years, months, days, totalDays };
  },

  /**
   * Check for relationship milestones
   */
  checkMilestone(startDate: string): RelationshipMilestone | null {
    const { years, totalDays } = this.calculateRelationshipDuration(startDate);

    // Check for special day milestones
    const specialDays = [100, 365, 500, 1000, 1500, 2000];
    if (specialDays.includes(totalDays)) {
      return {
        type: 'days',
        value: totalDays,
        displayText: `Day ${totalDays} together`,
        emoji: totalDays === 1000 ? '💛' : '✨',
      };
    }

    // Check for year milestones
    if (totalDays % 365 === 0 && years > 0) {
      return {
        type: 'years',
        value: years,
        displayText: `${years} year${years > 1 ? 's' : ''} together`,
        emoji: '🎉',
      };
    }

    return null;
  },

  /**
   * Calculate growth metrics for growth wallpaper
   */
  async calculateGrowthMetrics(
    relationshipId: string,
    userId: string
  ): Promise<GrowthMetrics> {
    // Get engagement data from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Count daily questions answered
    const { count: questionsCount } = await supabase
      .from('daily_questions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Count mood check-ins
    const { count: moodsCount } = await supabase
      .from('capacity_responses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    const dailyQuestionsAnswered = questionsCount || 0;
    const moodsShared = moodsCount || 0;

    // Simple engagement scoring
    const totalEngagement = dailyQuestionsAnswered * 3 + moodsShared * 2;
    const growthLevel = Math.min(100, Math.floor((totalEngagement / 100) * 100));

    return {
      dailyQuestionsAnswered,
      moodsShared,
      checkInsCompleted: dailyQuestionsAnswered + moodsShared,
      totalEngagement,
      growthLevel,
    };
  },

  /**
   * Generate wallpaper image from configuration
   * Uses HTML canvas to create the wallpaper
   */
  async generateWallpaper(
    config: LockscreenWallpaperConfig,
    options: WallpaperGenerationOptions,
    additionalData?: {
      relationshipStartDate?: string;
      partnerName?: string;
      currentMessage?: string;
      growthMetrics?: GrowthMetrics;
    }
  ): Promise<GeneratedWallpaper> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Set canvas size based on device
    canvas.width = options.width * options.devicePixelRatio;
    canvas.height = options.height * options.devicePixelRatio;
    ctx.scale(options.devicePixelRatio, options.devicePixelRatio);

    // Draw background
    await this.drawBackground(ctx, config, options);

    // Draw type-specific content
    switch (config.type) {
      case 'time':
        this.drawTimeWallpaper(ctx, config, options, additionalData);
        break;
      case 'message':
        this.drawMessageWallpaper(ctx, config, options, additionalData);
        break;
      case 'mood':
        this.drawMoodWallpaper(ctx, config, options, additionalData);
        break;
      case 'growth':
        this.drawGrowthWallpaper(ctx, config, options, additionalData);
        break;
    }

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b!),
        options.format === 'png' ? 'image/png' : 'image/jpeg',
        options.quality
      );
    });

    const dataUrl = canvas.toDataURL(
      options.format === 'png' ? 'image/png' : 'image/jpeg',
      options.quality
    );

    return {
      dataUrl,
      blob,
      width: options.width,
      height: options.height,
    };
  },

  /**
   * Draw background (photo or gradient)
   */
  async drawBackground(
    ctx: CanvasRenderingContext2D,
    config: LockscreenWallpaperConfig,
    options: WallpaperGenerationOptions
  ): Promise<void> {
    if (config.photoUrl) {
      // Load and draw photo
      const img = await this.loadImage(config.photoUrl);
      const scale = Math.max(
        options.width / img.width,
        options.height / img.height
      );
      const x = (options.width - img.width * scale) / 2;
      const y = (options.height - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      // Add subtle overlay for text readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, options.width, options.height);
    } else if (config.backgroundGradient) {
      // Draw gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, options.height);
      const colors = this.parseGradient(config.backgroundGradient);
      colors.forEach((color, i) => {
        gradient.addColorStop(i / (colors.length - 1), color);
      });
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, options.width, options.height);
    } else {
      // Default soft gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, options.height);
      gradient.addColorStop(0, '#fce4ec');
      gradient.addColorStop(1, '#ffffff');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, options.width, options.height);
    }
  },

  /**
   * Draw Time Wallpaper content
   */
  drawTimeWallpaper(
    ctx: CanvasRenderingContext2D,
    config: TimeWallpaperConfig,
    options: WallpaperGenerationOptions,
    data?: any
  ): void {
    if (config.textVisibility === 'none') return;

    const startDate = data?.relationshipStartDate || config.relationshipStartDate;
    const duration = this.calculateRelationshipDuration(startDate);
    const milestone = this.checkMilestone(startDate);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Position text in bottom third
    const y = (options.height / 3) * 2;

    if (milestone && config.showMilestones) {
      // Show milestone
      this.drawText(ctx, milestone.displayText, options.width / 2, y - 30, {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#ffffff',
        fontStyle: config.fontStyle,
      });
      this.drawText(ctx, milestone.emoji, options.width / 2, y + 20, {
        fontSize: 48,
        fontWeight: 'normal',
        color: '#ffffff',
        fontStyle: config.fontStyle,
      });
    } else {
      // Show regular time
      let text = '';
      if (config.displayFormat === 'years_months' || config.displayFormat === 'both') {
        text = `${duration.years} year${duration.years !== 1 ? 's' : ''}, ${duration.months} month${duration.months !== 1 ? 's' : ''} together`;
      }
      if (config.displayFormat === 'total_days' || config.displayFormat === 'both') {
        const daysText = `Day ${duration.totalDays} with you`;
        if (config.displayFormat === 'both') {
          this.drawText(ctx, text, options.width / 2, y - 20, {
            fontSize: 24,
            fontWeight: '600',
            color: '#ffffff',
            fontStyle: config.fontStyle,
          });
          this.drawText(ctx, daysText, options.width / 2, y + 20, {
            fontSize: 20,
            fontWeight: 'normal',
            color: 'rgba(255, 255, 255, 0.8)',
            fontStyle: config.fontStyle,
          });
        } else {
          text = daysText;
          this.drawText(ctx, text, options.width / 2, y, {
            fontSize: 28,
            fontWeight: '600',
            color: '#ffffff',
            fontStyle: config.fontStyle,
          });
        }
      } else {
        this.drawText(ctx, text, options.width / 2, y, {
          fontSize: 24,
          fontWeight: '600',
          color: '#ffffff',
          fontStyle: config.fontStyle,
        });
      }
    }
  },

  /**
   * Draw Message Wallpaper content
   */
  drawMessageWallpaper(
    ctx: CanvasRenderingContext2D,
    config: MessageWallpaperConfig,
    options: WallpaperGenerationOptions,
    data?: any
  ): void {
    if (config.textVisibility === 'none') return;

    const message = data?.currentMessage || config.currentMessage?.message;
    const senderName = config.currentMessage?.senderName || data?.partnerName;

    if (!message) {
      this.drawText(
        ctx,
        'No matter the distance, you\'re my home.',
        options.width / 2,
        options.height / 2,
        {
          fontSize: 26,
          fontWeight: '600',
          color: '#ffffff',
          fontStyle: config.fontStyle,
          maxWidth: options.width * 0.8,
        }
      );
      return;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw message
    this.drawText(ctx, `"${message}"`, options.width / 2, options.height / 2, {
      fontSize: 28,
      fontWeight: '600',
      color: '#ffffff',
      fontStyle: config.fontStyle,
      maxWidth: options.width * 0.85,
    });

    // Draw sender name
    if (senderName && config.textVisibility === 'full') {
      this.drawText(
        ctx,
        `— ${senderName}`,
        options.width / 2,
        options.height / 2 + 60,
        {
          fontSize: 18,
          fontWeight: 'normal',
          color: 'rgba(255, 255, 255, 0.85)',
          fontStyle: config.fontStyle,
        }
      );
    }
  },

  /**
   * Draw Mood Wallpaper content
   */
  drawMoodWallpaper(
    ctx: CanvasRenderingContext2D,
    config: MoodWallpaperConfig,
    options: WallpaperGenerationOptions,
    data?: any
  ): void {
    if (config.textVisibility === 'none' || !config.showMoodText) return;

    const mood = config.partnerCurrentMood;
    let text = '';

    if (mood === 'needs_space') {
      text = "They're having a quiet day";
    } else if (mood === 'low_capacity') {
      text = 'They could use a little love today';
    } else if (mood === 'open_to_connection') {
      text = "They're feeling open today";
    }

    if (text) {
      this.drawText(
        ctx,
        text,
        options.width / 2,
        (options.height / 4) * 3,
        {
          fontSize: 22,
          fontWeight: '500',
          color: 'rgba(255, 255, 255, 0.9)',
          fontStyle: config.fontStyle,
        }
      );
    }
  },

  /**
   * Draw Growth Wallpaper content
   */
  drawGrowthWallpaper(
    ctx: CanvasRenderingContext2D,
    config: GrowthWallpaperConfig,
    options: WallpaperGenerationOptions,
    data?: any
  ): void {
    const centerX = options.width / 2;
    const centerY = options.height / 2;

    // Draw growth symbol based on type
    if (config.symbolType === 'plant') {
      this.drawPlant(ctx, centerX, centerY, config.growthLevel);
    } else if (config.symbolType === 'flower') {
      this.drawFlower(ctx, centerX, centerY, config.growthLevel);
    } else if (config.symbolType === 'tree') {
      this.drawTree(ctx, centerX, centerY, config.growthLevel);
    } else if (config.symbolType === 'star_constellation') {
      this.drawConstellation(ctx, centerX, centerY, config.growthLevel);
    }

    // Draw text if enabled
    if (config.showGrowthText && config.textVisibility !== 'none') {
      this.drawText(
        ctx,
        'Growing together, even apart.',
        options.width / 2,
        (options.height / 4) * 3,
        {
          fontSize: 20,
          fontWeight: '500',
          color: 'rgba(255, 255, 255, 0.85)',
          fontStyle: config.fontStyle,
        }
      );
    }
  },

  /**
   * Helper: Draw text with proper formatting
   */
  drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    options: {
      fontSize: number;
      fontWeight: string;
      color: string;
      fontStyle: string;
      maxWidth?: number;
    }
  ): void {
    const fontFamily = this.getFontFamily(options.fontStyle);
    ctx.font = `${options.fontWeight} ${options.fontSize}px ${fontFamily}`;
    ctx.fillStyle = options.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add text shadow for better readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    if (options.maxWidth) {
      // Wrap text if needed
      const words = text.split(' ');
      let line = '';
      const lines: string[] = [];
      const lineHeight = options.fontSize * 1.4;

      words.forEach((word) => {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > options.maxWidth! && line !== '') {
          lines.push(line);
          line = word + ' ';
        } else {
          line = testLine;
        }
      });
      lines.push(line);

      // Draw each line
      lines.forEach((line, i) => {
        const offsetY = (i - (lines.length - 1) / 2) * lineHeight;
        ctx.fillText(line.trim(), x, y + offsetY);
      });
    } else {
      ctx.fillText(text, x, y);
    }

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  },

  /**
   * Helper: Get font family based on style
   */
  getFontFamily(style: string): string {
    switch (style) {
      case 'elegant':
        return 'Georgia, serif';
      case 'bold':
        return '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      case 'minimal':
      default:
        return '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    }
  },

  /**
   * Helper: Load image from URL
   */
  loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  },

  /**
   * Helper: Parse gradient string
   */
  parseGradient(gradient: string): string[] {
    // Simple parser for gradient strings like "pink-to-purple"
    const gradientMap: Record<string, string[]> = {
      'pink-to-purple': ['#fce4ec', '#e1bee7'],
      'blue-to-teal': ['#bbdefb', '#b2dfdb'],
      'warm-sunset': ['#ffe0b2', '#ffccbc'],
      'calm-ocean': ['#b3e5fc', '#81d4fa'],
      'neutral-grey': ['#f5f5f5', '#e0e0e0'],
    };

    return gradientMap[gradient] || ['#fce4ec', '#ffffff'];
  },

  /**
   * Helper: Draw plant symbol
   */
  drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, growthLevel: number): void {
    const height = 100 + (growthLevel / 100) * 100;
    const leafCount = Math.floor((growthLevel / 100) * 8) + 2;

    // Draw stem
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, y + 50);
    ctx.lineTo(x, y - height);
    ctx.stroke();

    // Draw leaves
    ctx.fillStyle = '#66bb6a';
    for (let i = 0; i < leafCount; i++) {
      const leafY = y + 40 - (i * height) / leafCount;
      const side = i % 2 === 0 ? 1 : -1;

      ctx.beginPath();
      ctx.ellipse(x + side * 15, leafY, 20, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  /**
   * Helper: Draw flower symbol
   */
  drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, growthLevel: number): void {
    const petalCount = Math.floor((growthLevel / 100) * 3) + 5;
    const petalSize = 20 + (growthLevel / 100) * 20;

    // Draw petals
    ctx.fillStyle = '#ec407a';
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petalX = x + Math.cos(angle) * 30;
      const petalY = y + Math.sin(angle) * 30;

      ctx.beginPath();
      ctx.ellipse(petalX, petalY, petalSize, petalSize / 2, angle, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw center
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
  },

  /**
   * Helper: Draw tree symbol
   */
  drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, growthLevel: number): void {
    const trunkHeight = 80 + (growthLevel / 100) * 60;
    const canopySize = 40 + (growthLevel / 100) * 80;

    // Draw trunk
    ctx.fillStyle = '#795548';
    ctx.fillRect(x - 10, y - trunkHeight, 20, trunkHeight);

    // Draw canopy
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.arc(x, y - trunkHeight, canopySize, 0, Math.PI * 2);
    ctx.fill();
  },

  /**
   * Helper: Draw constellation symbol
   */
  drawConstellation(ctx: CanvasRenderingContext2D, x: number, y: number, growthLevel: number): void {
    const starCount = Math.floor((growthLevel / 100) * 8) + 4;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;

    const stars: { x: number; y: number }[] = [];

    // Draw stars
    for (let i = 0; i < starCount; i++) {
      const angle = (i / starCount) * Math.PI * 2;
      const radius = 60 + Math.random() * 40;
      const starX = x + Math.cos(angle) * radius;
      const starY = y + Math.sin(angle) * radius;

      stars.push({ x: starX, y: starY });

      ctx.beginPath();
      ctx.arc(starX, starY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw connections
    for (let i = 0; i < stars.length - 1; i++) {
      ctx.beginPath();
      ctx.moveTo(stars[i].x, stars[i].y);
      ctx.lineTo(stars[i + 1].x, stars[i + 1].y);
      ctx.stroke();
    }
  },

  /**
   * Parse config from database row
   */
  parseConfigFromRow(row: LockscreenConfigRow): LockscreenWallpaperConfig {
    const base = {
      type: row.wallpaper_type,
      photoUrl: row.photo_url,
      backgroundGradient: row.background_gradient,
      fontStyle: row.font_style as any,
      textVisibility: row.text_visibility as any,
      privacySettings: row.privacy_settings,
      lastUpdated: row.updated_at,
    };

    return { ...base, ...row.type_specific_config } as LockscreenWallpaperConfig;
  },

  /**
   * Convert config to database row
   */
  configToRow(
    userId: string,
    relationshipId: string,
    config: LockscreenWallpaperConfig
  ): Partial<LockscreenConfigRow> {
    const { type, photoUrl, backgroundGradient, fontStyle, textVisibility, privacySettings, lastUpdated, ...typeSpecific } = config;

    return {
      user_id: userId,
      relationship_id: relationshipId,
      wallpaper_type: type,
      photo_url: photoUrl,
      background_gradient: backgroundGradient,
      font_style: fontStyle,
      text_visibility: textVisibility,
      privacy_settings: privacySettings,
      type_specific_config: typeSpecific,
      updated_at: new Date().toISOString(),
    };
  },

  /**
   * Parse message from database row
   */
  parseMessageFromRow(row: LockscreenMessageRow): LockscreenMessage {
    return {
      id: row.id,
      senderId: row.sender_id,
      senderName: '', // Need to fetch from users table
      message: row.message,
      tone: row.tone,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      isRead: row.is_read,
    };
  },

  /**
   * Check if lockscreen feature is available
   */
  isLockscreenAvailable(): boolean {
    return typeof window !== 'undefined' && 'navigator' in window;
  },
};
