/**
 * Lockscreen Gift Service
 *
 * Handles creation, sending, and rendering of giftable lockscreen wallpapers
 */

import { supabase } from '../lib/supabase';
import type {
  LockscreenGift,
  LockscreenGiftRow,
  LockscreenWallpaperDesign,
  CreateGiftPayload,
  WallpaperGenerationOptions,
  GeneratedWallpaper,
  SavedWallpaper,
  GiftPrivacySettings,
  GiftPrivacySettingsRow,
  LayoutTemplate,
  MoodPresetDefinition,
  WallpaperImage,
  MoodPreset,
  WallpaperLayout,
} from '../types/lockscreenGift';

export const lockscreenGiftService = {
  /**
   * Mood preset definitions with colors
   */
  moodPresets: [
    {
      preset: 'soft_romantic' as MoodPreset,
      name: 'Soft & Romantic',
      emoji: '💛',
      colors: {
        textColor: '#ffffff',
        accentColor: '#ffd700',
        gradientStart: '#fce4ec',
        gradientEnd: '#f8bbd0',
      },
    },
    {
      preset: 'calm_cozy' as MoodPreset,
      name: 'Calm & Cozy',
      emoji: '🌙',
      colors: {
        textColor: '#ffffff',
        accentColor: '#b8c5d6',
        gradientStart: '#c5cae9',
        gradientEnd: '#9fa8da',
      },
    },
    {
      preset: 'bold_love' as MoodPreset,
      name: 'Bold Love',
      emoji: '❤️',
      colors: {
        textColor: '#ffffff',
        accentColor: '#ff6b9d',
        gradientStart: '#ff5252',
        gradientEnd: '#c51162',
      },
    },
    {
      preset: 'minimal_clean' as MoodPreset,
      name: 'Minimal & Clean',
      emoji: '🤍',
      colors: {
        textColor: '#333333',
        accentColor: '#999999',
        gradientStart: '#fafafa',
        gradientEnd: '#f5f5f5',
      },
    },
  ] as MoodPresetDefinition[],

  /**
   * Layout templates
   */
  layoutTemplates: [
    {
      layout: 'minimal' as WallpaperLayout,
      name: 'Minimal',
      description: 'Clean and simple with your photo',
      previewImage: '/templates/minimal.png',
      isPremium: false,
      defaultStyle: {
        moodPreset: 'soft_romantic' as MoodPreset,
        overlayGradient: 'none',
        overlayIntensity: 30,
      },
      imageSlots: {
        main: true,
        secondaryCount: 0,
      },
    },
    {
      layout: 'memory_stack' as WallpaperLayout,
      name: 'Memory Stack',
      description: 'Polaroid-style stacked photos',
      previewImage: '/templates/memory-stack.png',
      isPremium: false,
      defaultStyle: {
        moodPreset: 'calm_cozy' as MoodPreset,
        overlayGradient: 'soft_lavender',
        overlayIntensity: 20,
      },
      imageSlots: {
        main: true,
        secondaryCount: 3,
        defaultPositions: [
          { x: 15, y: 20, width: 30, height: 20 },
          { x: 50, y: 25, width: 30, height: 20 },
          { x: 30, y: 45, width: 30, height: 20 },
        ],
      },
    },
    {
      layout: 'elegant_date' as WallpaperLayout,
      name: 'Elegant Date',
      description: 'Focused on your time together',
      previewImage: '/templates/elegant-date.png',
      isPremium: false,
      defaultStyle: {
        moodPreset: 'minimal_clean' as MoodPreset,
        overlayGradient: 'rose_gold',
        overlayIntensity: 40,
      },
      imageSlots: {
        main: true,
        secondaryCount: 0,
      },
    },
    {
      layout: 'collage' as WallpaperLayout,
      name: 'Collage',
      description: 'Multiple memories beautifully arranged',
      previewImage: '/templates/collage.png',
      isPremium: true,
      defaultStyle: {
        moodPreset: 'bold_love' as MoodPreset,
        overlayGradient: 'warm_sunset',
        overlayIntensity: 25,
      },
      imageSlots: {
        main: true,
        secondaryCount: 3,
        defaultPositions: [
          { x: 10, y: 15, width: 35, height: 25 },
          { x: 55, y: 15, width: 35, height: 25 },
          { x: 32.5, y: 50, width: 35, height: 25 },
        ],
      },
    },
  ] as LayoutTemplate[],

  /**
   * Send a lockscreen gift to partner
   */
  async sendGift(payload: CreateGiftPayload): Promise<LockscreenGift> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check receiver's privacy settings
    const privacySettings = await this.getPrivacySettings(payload.receiverId);
    if (!privacySettings.allowGifts) {
      throw new Error('Recipient has disabled lockscreen gifts');
    }

    // Check frequency limit
    if (privacySettings.maxPerWeek > 0) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { count } = await supabase
        .from('lockscreen_gifts')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', payload.receiverId)
        .eq('sender_id', user.id)
        .gte('created_at', weekAgo.toISOString());

      if (count && count >= privacySettings.maxPerWeek) {
        throw new Error(`You can only send ${privacySettings.maxPerWeek} gifts per week`);
      }
    }

    // Insert gift
    const { data, error } = await supabase
      .from('lockscreen_gifts')
      .insert({
        sender_id: user.id,
        receiver_id: payload.receiverId,
        relationship_id: payload.relationshipId,
        design: payload.design,
        status: 'pending',
        sender_message: payload.senderMessage,
      })
      .select()
      .single();

    if (error) throw error;

    return this.parseGiftFromRow(data);
  },

  /**
   * Get pending gifts for user
   */
  async getPendingGifts(userId: string): Promise<LockscreenGift[]> {
    const { data, error } = await supabase
      .from('lockscreen_gifts')
      .select('*')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.parseGiftFromRow);
  },

  /**
   * Mark gift as viewed
   */
  async markGiftViewed(giftId: string): Promise<void> {
    await supabase
      .from('lockscreen_gifts')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      })
      .eq('id', giftId);
  },

  /**
   * Mark gift as applied (set as lockscreen)
   */
  async markGiftApplied(giftId: string): Promise<void> {
    await supabase
      .from('lockscreen_gifts')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
      })
      .eq('id', giftId);
  },

  /**
   * Save gift to memories vault
   */
  async saveToMemories(giftId: string, userId: string): Promise<void> {
    await supabase
      .from('lockscreen_gifts')
      .update({
        status: 'saved',
        saved_at: new Date().toISOString(),
      })
      .eq('id', giftId);
  },

  /**
   * Get saved wallpapers from memories vault
   */
  async getMemoriesVault(userId: string): Promise<SavedWallpaper[]> {
    const { data, error } = await supabase
      .from('lockscreen_gifts')
      .select('*')
      .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`)
      .not('status', 'eq', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      giftId: row.id,
      userId,
      design: row.design,
      thumbnailUrl: '', // TODO: Generate thumbnail
      savedAt: row.saved_at || row.viewed_at || row.created_at,
      fromPartner: row.receiver_id === userId,
      partnerName: undefined,
    }));
  },

  /**
   * Get user's privacy settings
   */
  async getPrivacySettings(userId: string): Promise<GiftPrivacySettings> {
    const { data, error } = await supabase
      .from('gift_privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Return defaults
      return {
        allowGifts: true,
        requireApproval: false,
        maxPerWeek: 0,
        hideRelationshipInfo: false,
      };
    }

    return {
      allowGifts: data.allow_gifts,
      requireApproval: data.require_approval,
      maxPerWeek: data.max_per_week,
      hideRelationshipInfo: data.hide_relationship_info,
    };
  },

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    settings: Partial<GiftPrivacySettings>
  ): Promise<void> {
    const row: Partial<GiftPrivacySettingsRow> = {
      user_id: userId,
      allow_gifts: settings.allowGifts,
      require_approval: settings.requireApproval,
      max_per_week: settings.maxPerWeek,
      hide_relationship_info: settings.hideRelationshipInfo,
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from('gift_privacy_settings')
      .upsert(row, { onConflict: 'user_id' });
  },

  /**
   * Generate wallpaper from design
   */
  async generateWallpaper(
    design: LockscreenWallpaperDesign,
    options: WallpaperGenerationOptions
  ): Promise<GeneratedWallpaper> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Set canvas size
    canvas.width = options.width * options.devicePixelRatio;
    canvas.height = options.height * options.devicePixelRatio;
    ctx.scale(options.devicePixelRatio, options.devicePixelRatio);

    // Draw based on layout
    await this.drawWallpaper(ctx, design, options);

    // Generate outputs
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

    // Generate thumbnail
    const thumbnailCanvas = document.createElement('canvas');
    const thumbnailCtx = thumbnailCanvas.getContext('2d')!;
    const thumbnailHeight = 400;
    const thumbnailWidth = (options.width / options.height) * thumbnailHeight;
    thumbnailCanvas.width = thumbnailWidth;
    thumbnailCanvas.height = thumbnailHeight;
    thumbnailCtx.drawImage(canvas, 0, 0, thumbnailWidth, thumbnailHeight);
    const thumbnailDataUrl = thumbnailCanvas.toDataURL('image/jpeg', 0.7);

    return {
      dataUrl,
      blob,
      thumbnailDataUrl,
      width: options.width,
      height: options.height,
      fileSize: blob.size,
    };
  },

  /**
   * Draw wallpaper on canvas
   */
  async drawWallpaper(
    ctx: CanvasRenderingContext2D,
    design: LockscreenWallpaperDesign,
    options: WallpaperGenerationOptions
  ): Promise<void> {
    const { width, height } = options;

    // 1. Draw background/main image
    await this.drawBackground(ctx, design, width, height);

    // 2. Draw overlay gradient
    this.drawOverlay(ctx, design, width, height);

    // 3. Draw secondary images based on layout
    await this.drawSecondaryImages(ctx, design, width, height);

    // 4. Draw date if enabled
    if (design.dateDisplay?.show) {
      this.drawDate(ctx, design, width, height);
    }

    // 5. Draw message
    if (design.message?.text) {
      this.drawMessage(ctx, design, width, height);
    }

    // 6. Add texture if specified
    if (design.style.textureStyle && design.style.textureStyle !== 'none') {
      this.addTexture(ctx, design, width, height);
    }
  },

  /**
   * Draw background image
   */
  async drawBackground(
    ctx: CanvasRenderingContext2D,
    design: LockscreenWallpaperDesign,
    width: number,
    height: number
  ): Promise<void> {
    const mainImage = design.images.find((img) => img.type === 'main');

    if (mainImage) {
      const img = await this.loadImage(mainImage.url);
      const scale = Math.max(width / img.width, height / img.height);
      const x = (width - img.width * scale) / 2;
      const y = (height - img.height * scale) / 2;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    } else {
      // Default gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#fce4ec');
      gradient.addColorStop(1, '#ffffff');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  },

  /**
   * Draw overlay gradient
   */
  drawOverlay(
    ctx: CanvasRenderingContext2D,
    design: LockscreenWallpaperDesign,
    width: number,
    height: number
  ): void {
    const { overlayGradient, overlayIntensity } = design.style;
    if (overlayGradient === 'none') return;

    const gradients: Record<string, [string, string]> = {
      warm_sunset: ['#FF6B35', '#F7931E'],
      soft_lavender: ['#C3B1E1', '#9FA8DA'],
      deep_night: ['#1a237e', '#000000'],
      rose_gold: ['#F8BBD0', '#FFD700'],
      ocean_breeze: ['#4FC3F7', '#26C6DA'],
    };

    const colors = gradients[overlayGradient];
    if (!colors) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    const alpha = (overlayIntensity || 30) / 100;

    gradient.addColorStop(0, this.hexToRgba(colors[0], alpha));
    gradient.addColorStop(1, this.hexToRgba(colors[1], alpha));

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  },

  /**
   * Draw secondary images
   */
  async drawSecondaryImages(
    ctx: CanvasRenderingContext2D,
    design: LockscreenWallpaperDesign,
    width: number,
    height: number
  ): Promise<void> {
    const secondaryImages = design.images.filter((img) => img.type === 'secondary');

    for (const imageData of secondaryImages) {
      if (!imageData.position || !imageData.size) continue;

      const x = (imageData.position.x / 100) * width;
      const y = (imageData.position.y / 100) * height;
      const w = (imageData.size.width / 100) * width;
      const h = (imageData.size.height / 100) * height;

      ctx.save();

      // Apply rotation if specified
      if (imageData.rotation) {
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((imageData.rotation * Math.PI) / 180);
        ctx.translate(-(x + w / 2), -(y + h / 2));
      }

      // Draw frame
      if (imageData.frameStyle === 'polaroid') {
        this.drawPolaroidFrame(ctx, x, y, w, h);
      }

      // Draw image
      const img = await this.loadImage(imageData.url);

      if (imageData.frameStyle === 'rounded') {
        this.drawRoundedImage(ctx, img, x, y, w, h, 20);
      } else {
        const imgX = imageData.frameStyle === 'polaroid' ? x + w * 0.05 : x;
        const imgY = imageData.frameStyle === 'polaroid' ? y + h * 0.05 : y;
        const imgW = imageData.frameStyle === 'polaroid' ? w * 0.9 : w;
        const imgH = imageData.frameStyle === 'polaroid' ? h * 0.75 : h;

        ctx.drawImage(img, imgX, imgY, imgW, imgH);
      }

      ctx.restore();
    }
  },

  /**
   * Draw polaroid frame
   */
  drawPolaroidFrame(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // White polaroid background
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.fillRect(x, y, width, height);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  },

  /**
   * Draw rounded image
   */
  drawRoundedImage(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, width, height);
    ctx.restore();
  },

  /**
   * Draw date display
   */
  drawDate(
    ctx: CanvasRenderingContext2D,
    design: LockscreenWallpaperDesign,
    width: number,
    height: number
  ): void {
    const dateConfig = design.dateDisplay!;
    let text = '';

    if (dateConfig.format === 'custom' && dateConfig.customText) {
      text = dateConfig.customText;
    } else if (design.relationshipStartDate) {
      const start = new Date(design.relationshipStartDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (dateConfig.format === 'days_together') {
        text = `Day ${totalDays} together`;
      } else if (dateConfig.format === 'years_months') {
        const years = Math.floor(totalDays / 365);
        const months = Math.floor((totalDays % 365) / 30);
        text = `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''} together`;
      } else {
        text = `Together since ${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
      }
    }

    if (!text) return;

    const y = this.getPlacementY(dateConfig.placement, height);

    this.drawStyledText(ctx, text, width / 2, y, {
      fontSize: dateConfig.fontSize,
      color: dateConfig.color,
      fontWeight: '600',
      textAlign: 'center',
    });
  },

  /**
   * Draw message
   */
  drawMessage(
    ctx: CanvasRenderingContext2D,
    design: LockscreenWallpaperDesign,
    width: number,
    height: number
  ): void {
    const messageConfig = design.message!;
    const y = this.getPlacementY(messageConfig.placement, height);

    const fontFamily = this.getFontFamily(messageConfig.fontStyle);

    this.drawStyledText(ctx, `"${messageConfig.text}"`, width / 2, y, {
      fontSize: messageConfig.fontSize,
      color: messageConfig.color,
      fontWeight: messageConfig.fontStyle === 'bold' ? 'bold' : 'normal',
      fontFamily,
      textAlign: messageConfig.alignment,
      lineSpacing: messageConfig.lineSpacing,
      maxWidth: width * 0.85,
    });
  },

  /**
   * Add texture overlay
   */
  addTexture(
    ctx: CanvasRenderingContext2D,
    design: LockscreenWallpaperDesign,
    width: number,
    height: number
  ): void {
    const intensity = (design.style.textureIntensity || 30) / 100;

    if (design.style.textureStyle === 'grain') {
      // Simple grain effect
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * intensity * 50;
        data[i] += noise;     // R
        data[i + 1] += noise; // G
        data[i + 2] += noise; // B
      }

      ctx.putImageData(imageData, 0, 0);
    } else if (design.style.textureStyle === 'blur') {
      // Light blur using a simple box blur approximation
      ctx.filter = `blur(${intensity * 3}px)`;
      ctx.drawImage(ctx.canvas, 0, 0);
      ctx.filter = 'none';
    }
  },

  /**
   * Helper: Get Y position based on placement
   */
  getPlacementY(placement: string, height: number): number {
    switch (placement) {
      case 'top':
        return height * 0.15;
      case 'center':
        return height * 0.5;
      case 'lower_third':
        return height * 0.65;
      case 'bottom':
        return height * 0.85;
      default:
        return height * 0.5;
    }
  },

  /**
   * Helper: Get font family
   */
  getFontFamily(style: string): string {
    switch (style) {
      case 'handwritten':
        return 'Brush Script MT, cursive';
      case 'romantic':
        return 'Georgia, serif';
      case 'bold':
        return '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      case 'clean':
      default:
        return '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    }
  },

  /**
   * Helper: Draw styled text
   */
  drawStyledText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    options: {
      fontSize: number;
      color: string;
      fontWeight?: string;
      fontFamily?: string;
      textAlign?: CanvasTextAlign;
      lineSpacing?: number;
      maxWidth?: number;
    }
  ): void {
    const fontFamily = options.fontFamily || 'sans-serif';
    const fontWeight = options.fontWeight || 'normal';

    ctx.font = `${fontWeight} ${options.fontSize}px ${fontFamily}`;
    ctx.fillStyle = options.color;
    ctx.textAlign = options.textAlign || 'center';
    ctx.textBaseline = 'middle';

    // Add shadow for readability
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    if (options.maxWidth) {
      // Word wrap
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      words.forEach((word) => {
        const testLine = currentLine + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > options.maxWidth! && currentLine !== '') {
          lines.push(currentLine);
          currentLine = word + ' ';
        } else {
          currentLine = testLine;
        }
      });
      lines.push(currentLine);

      // Draw each line
      const lineHeight = options.fontSize * (options.lineSpacing || 1.4);
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
   * Helper: Load image
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
   * Helper: Convert hex to rgba
   */
  hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  /**
   * Parse gift from database row
   */
  parseGiftFromRow(row: LockscreenGiftRow): LockscreenGift {
    return {
      id: row.id,
      senderId: row.sender_id,
      senderName: '', // TODO: Fetch from onboarding
      receiverId: row.receiver_id,
      relationshipId: row.relationship_id,
      design: row.design,
      status: row.status,
      viewedAt: row.viewed_at || undefined,
      appliedAt: row.applied_at || undefined,
      savedAt: row.saved_at || undefined,
      createdAt: row.created_at,
      message: row.sender_message || undefined,
    };
  },
};
