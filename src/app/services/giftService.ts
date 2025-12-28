import { api, handleSupabaseError } from './api';
import type { Tables } from './api';

export interface GiftIdea {
  id: string;
  title: string;
  description: string;
  category: 'sentimental' | 'experience' | 'thoughtful';
  budget: string;
  effort: string;
  occasion: string;
}

export const giftService = {
  async generateGiftIdeas(
    partnerPreferences: any,
    upcomingOccasions: any[] = []
  ): Promise<GiftIdea[]> {
    const ideas: GiftIdea[] = [];
    const loveLanguages = partnerPreferences.love_languages || [];
    const activities = partnerPreferences.favorite_activities || [];
    const budget = partnerPreferences.budget_comfort || 'medium';

    // Sentimental gifts
    if (loveLanguages.includes('gifts') || loveLanguages.includes('words')) {
      ideas.push({
        id: '1',
        title: 'Custom Photo Album',
        description: 'Create a physical photo album with your favorite memories together. Add handwritten notes on each page.',
        category: 'sentimental',
        budget: '$$',
        effort: 'High',
        occasion: 'Anniversary, Birthday',
      });
      ideas.push({
        id: '2',
        title: 'Personalized Star Map',
        description: 'A map of the night sky from a special date - your first date, when you met, or your anniversary.',
        category: 'sentimental',
        budget: '$',
        effort: 'Low',
        occasion: 'Any occasion',
      });
      ideas.push({
        id: '3',
        title: 'Love Letter Jar',
        description: 'Write 52 love letters (one for each week) and put them in a decorated jar they can open throughout the year.',
        category: 'sentimental',
        budget: '$',
        effort: 'High',
        occasion: 'Birthday, Anniversary',
      });
    }

    // Experience gifts
    if (activities.length > 0 || loveLanguages.includes('quality-time')) {
      ideas.push({
        id: '4',
        title: 'Couples Cooking Class',
        description: 'Book a cooking class to learn a new cuisine together. Based on their interest in cooking!',
        category: 'experience',
        budget: '$$',
        effort: 'Low',
        occasion: 'Just because',
      });
      ideas.push({
        id: '5',
        title: 'Weekend Getaway',
        description: 'Plan a surprise weekend trip to a nearby city or nature spot they\'ve mentioned wanting to visit.',
        category: 'experience',
        budget: '$$$',
        effort: 'Medium',
        occasion: 'Anniversary, Birthday',
      });
      ideas.push({
        id: '6',
        title: 'Concert or Show Tickets',
        description: 'Get tickets to see their favorite artist or a show they\'ve been talking about.',
        category: 'experience',
        budget: '$$',
        effort: 'Low',
        occasion: 'Any occasion',
      });
    }

    // Thoughtful everyday gifts
    ideas.push({
      id: '7',
      title: 'Custom Playlist',
      description: 'Curate a playlist of songs that remind you of them, your relationship, or songs they\'d love.',
      category: 'thoughtful',
      budget: 'Free',
      effort: 'Medium',
      occasion: 'Just because',
    });
    ideas.push({
      id: '8',
      title: 'Their Favorite Treat Subscription',
      description: 'Set up a monthly subscription box for something they love - coffee, snacks, books, etc.',
      category: 'thoughtful',
      budget: '$$',
      effort: 'Low',
      occasion: 'Just because',
    });
    ideas.push({
      id: '9',
      title: 'Homemade Care Package',
      description: 'Put together a box of things they need right now - stress relief items, comfort foods, or self-care essentials.',
      category: 'thoughtful',
      budget: '$',
      effort: 'Medium',
      occasion: 'When they need support',
    });

    // Filter by budget if specified
    if (budget === 'free' || budget === 'low') {
      return ideas.filter(g => g.budget === '$' || g.budget === 'Free');
    }
    if (budget === 'medium') {
      return ideas.filter(g => g.budget === '$$' || g.budget === '$' || g.budget === 'Free');
    }

    return ideas;
  },
};

