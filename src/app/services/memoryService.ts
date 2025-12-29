import { api, handleSupabaseError } from './api';
import type { Tables, Inserts, Updates } from './api';

export type Memory = Tables<'memories'>;

export const memoryService = {
  async uploadPhoto(file: File, userId: string, relationshipId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `memories/${fileName}`;

    const { error: uploadError } = await api.supabase.storage
      .from('memories')
      .upload(filePath, file);

    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = api.supabase.storage
      .from('memories')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  async createMemory(
    relationshipId: string,
    userId: string,
    data: {
      title: string;
      photoUrl?: string;
      journalEntry?: string;
      tags?: string[];
      isPrivate?: boolean;
      memoryDate: string;
    }
  ): Promise<Memory> {
    // Auto-categorize the memory based on content
    const category = this.categorizeMemory(data.title, data.journalEntry || '', data.tags || []);

    const newMemory: Inserts<'memories'> = {
      relationship_id: relationshipId,
      user_id: userId,
      title: data.title,
      photo_url: data.photoUrl || null,
      journal_entry: data.journalEntry || null,
      tags: data.tags || [],
      category: category,
      is_private: data.isPrivate ?? false,
      memory_date: data.memoryDate,
    };

    const created = await handleSupabaseError(
      api.supabase
        .from('memories')
        .insert(newMemory)
        .select()
        .single()
    );

    return created;
  },

  async getMemories(relationshipId: string, userId?: string): Promise<Memory[]> {
    let query = api.supabase
      .from('memories')
      .select('*')
      .eq('relationship_id', relationshipId)
      .order('memory_date', { ascending: false });

    // If userId provided, filter private memories
    if (userId) {
      query = query.or(`is_private.eq.false,user_id.eq.${userId}`);
    } else {
      query = query.eq('is_private', false);
    }

    const memories = await handleSupabaseError(query);
    return memories || [];
  },

  async updateMemory(
    memoryId: string,
    updates: Partial<Updates<'memories'>>
  ): Promise<Memory> {
    const updated = await handleSupabaseError(
      api.supabase
        .from('memories')
        .update(updates)
        .eq('id', memoryId)
        .select()
        .single()
    );

    return updated;
  },

  async deleteMemory(memoryId: string): Promise<void> {
    await handleSupabaseError(
      api.supabase
        .from('memories')
        .delete()
        .eq('id', memoryId)
    );
  },

  // Smart categorization based on content analysis
  categorizeMemory(title: string, journalEntry: string, tags: string[]): Memory['category'] {
    const content = `${title} ${journalEntry} ${tags.join(' ')}`.toLowerCase();

    // Date night keywords
    const dateNightKeywords = ['date', 'dinner', 'restaurant', 'movie', 'walk', 'park', 'coffee', 'wine', 'romantic', 'candlelight'];
    if (dateNightKeywords.some(keyword => content.includes(keyword))) {
      return 'date_night';
    }

    // Trip keywords
    const tripKeywords = ['trip', 'vacation', 'travel', 'hotel', 'flight', 'beach', 'mountain', 'city', 'explore', 'adventure'];
    if (tripKeywords.some(keyword => content.includes(keyword))) {
      return 'trip';
    }

    // Milestone keywords
    const milestoneKeywords = ['first', 'anniversary', 'engagement', 'proposal', 'graduation', 'promotion', 'birthday', 'wedding', 'moved', 'new job'];
    if (milestoneKeywords.some(keyword => content.includes(keyword))) {
      return 'milestone';
    }

    // Celebration keywords
    const celebrationKeywords = ['party', 'celebration', 'surprise', 'gift', 'champagne', 'cake', 'balloons', 'congratulations', 'achievement'];
    if (celebrationKeywords.some(keyword => content.includes(keyword))) {
      return 'celebration';
    }

    // Growth moment keywords
    const growthKeywords = ['learned', 'growth', 'challenge', 'overcame', 'reflection', 'grateful', 'appreciate', 'thankful', 'perspective', 'change'];
    if (growthKeywords.some(keyword => content.includes(keyword))) {
      return 'growth_moment';
    }

    // Default to everyday moment
    return 'everyday_moment';
  },

  // Suggest tags based on content and common relationship themes
  suggestTags(title: string, journalEntry: string, existingTags: string[] = []): string[] {
    const content = `${title} ${journalEntry}`.toLowerCase();
    const suggestions: string[] = [];

    // Activity-based tags
    const activityTags = {
      'cooking': ['cooking', 'baking', 'recipe', 'kitchen', 'meal'],
      'sports': ['game', 'sports', 'workout', 'exercise', 'run', 'hike'],
      'music': ['concert', 'music', 'song', 'band', 'playlist'],
      'art': ['museum', 'art', 'gallery', 'painting', 'sculpture'],
      'nature': ['beach', 'mountain', 'park', 'hiking', 'nature', 'ocean'],
      'travel': ['travel', 'vacation', 'road trip', 'airport', 'hotel'],
      'home': ['home', 'cozy', 'relax', 'movie night', 'Netflix']
    };

    // Check for activity matches
    Object.entries(activityTags).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => content.includes(keyword)) && !existingTags.includes(tag)) {
        suggestions.push(tag);
      }
    });

    // Emotional/feeling tags
    const emotionTags = {
      'romantic': ['love', 'romantic', 'passionate', 'intimate'],
      'adventurous': ['adventure', 'exciting', 'thrilling', 'exploring'],
      'peaceful': ['peaceful', 'calm', 'relaxing', 'serene'],
      'funny': ['funny', 'hilarious', 'laughing', 'joke'],
      'meaningful': ['meaningful', 'deep', 'profound', 'touching']
    };

    Object.entries(emotionTags).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => content.includes(keyword)) && !existingTags.includes(tag)) {
        suggestions.push(tag);
      }
    });

    // Seasonal/time-based tags
    const now = new Date();
    const month = now.getMonth();
    const seasonTags = {
      'spring': [2, 3, 4], // March, April, May
      'summer': [5, 6, 7], // June, July, August
      'fall': [8, 9, 10], // September, October, November
      'winter': [11, 0, 1]  // December, January, February
    };

    Object.entries(seasonTags).forEach(([tag, months]) => {
      if (months.includes(month) && !existingTags.includes(tag)) {
        suggestions.push(tag);
      }
    });

    // Return up to 3 suggestions
    return suggestions.slice(0, 3);
  },

  // Group memories by time periods for timeline view
  groupMemoriesByTime(memories: Memory[]): { [key: string]: Memory[] } {
    const groups: { [key: string]: Memory[] } = {};
    const now = new Date();

    memories.forEach(memory => {
      const memoryDate = new Date(memory.memory_date);
      const diffTime = now.getTime() - memoryDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let groupKey: string;

      if (diffDays <= 30) {
        const weeks = Math.ceil(diffDays / 7);
        groupKey = weeks === 1 ? 'This Week' : `${weeks} Weeks Ago`;
      } else if (diffDays <= 90) {
        const months = Math.ceil(diffDays / 30);
        groupKey = months === 1 ? 'This Month' : `${months} Months Ago`;
      } else {
        const year = memoryDate.getFullYear();
        groupKey = year.toString();
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(memory);
    });

    // Sort groups chronologically (most recent first)
    const sortedGroups: { [key: string]: Memory[] } = {};
    Object.keys(groups)
      .sort((a, b) => {
        // Custom sort: This Week/Month first, then numbered periods, then years
        const order = ['This Week', 'This Month', 'Last 3 Months'];
        const aIndex = order.indexOf(a);
        const bIndex = order.indexOf(b);

        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;

        // Handle numbered periods
        const aMatch = a.match(/^(\d+)\s+(Weeks?|Months?)\s+Ago$/);
        const bMatch = b.match(/^(\d+)\s+(Weeks?|Months?)\s+Ago$/);

        if (aMatch && bMatch) {
          const aNum = parseInt(aMatch[1]);
          const bNum = parseInt(bMatch[1]);
          return aNum - bNum;
        }

        // Handle years (most recent first)
        if (/^\d{4}$/.test(a) && /^\d{4}$/.test(b)) {
          return parseInt(b) - parseInt(a);
        }

        return a.localeCompare(b);
      })
      .forEach(key => {
        sortedGroups[key] = groups[key].sort((a, b) =>
          new Date(b.memory_date).getTime() - new Date(a.memory_date).getTime()
        );
      });

    return sortedGroups;
  },

  // Get memory statistics for a relationship
  async getMemoryStats(relationshipId: string): Promise<{
    total: number;
    byCategory: { [key: string]: number };
    recentActivity: number; // memories in last 30 days
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: memories } = await api.supabase
      .from('memories')
      .select('category, memory_date')
      .eq('relationship_id', relationshipId);

    if (!memories) return { total: 0, byCategory: {}, recentActivity: 0 };

    const byCategory: { [key: string]: number } = {};
    let recentActivity = 0;

    memories.forEach(memory => {
      // Count by category
      const category = memory.category || 'other';
      byCategory[category] = (byCategory[category] || 0) + 1;

      // Count recent activity
      if (new Date(memory.memory_date) >= thirtyDaysAgo) {
        recentActivity++;
      }
    });

    return {
      total: memories.length,
      byCategory,
      recentActivity
    };
  },
};

