import { api, handleSupabaseError } from './api';
import type { Tables, Inserts } from './api';
import { dateIdeas as staticDateIdeas } from '../data/dateIdeas';

export type DateIdea = Tables<'date_ideas'>;
export type DateMatch = Tables<'date_matches'>;

export const dateService = {
  async generateDateIdeasForPartner(
    relationshipId: string,
    partnerPreferences: any,
    count: number = 3
  ): Promise<DateIdea[]> {
    const ideas: any[] = [];
    const activities = partnerPreferences.favorite_activities || [];
    const budget = partnerPreferences.budget_comfort || 'medium';
    const energyLevel = partnerPreferences.energy_level || 'balanced';

    // Generate ideas based on preferences
    const ideaTemplates = [
      {
        title: "Sunset Picnic at the Park",
        description: "Pack your favorite snacks, bring a cozy blanket, and watch the sunset together. Bonus: bring a portable speaker for background music.",
        category: "Outdoor",
        duration: "2-3 hours",
        budget: "$",
        location: "Local park",
        image_emoji: "🌅",
      },
      {
        title: "Cook a New Recipe Together",
        description: "Choose a cuisine you've never tried before, shop for ingredients together, and make it an adventure in the kitchen.",
        category: "Indoor",
        duration: "2 hours",
        budget: "$$",
        location: "Home",
        image_emoji: "👨‍🍳",
      },
      {
        title: "Museum & Coffee Date",
        description: "Explore a local museum or art gallery, then discuss your favorite pieces over coffee at a nearby café.",
        category: "Cultural",
        duration: "3-4 hours",
        budget: "$$",
        location: "Downtown",
        image_emoji: "🎨",
      },
      {
        title: "Stargazing Night",
        description: "Drive to a spot away from city lights, bring blankets and hot chocolate, and spend the evening looking at the stars.",
        category: "Outdoor",
        duration: "2-3 hours",
        budget: "$",
        location: "Outside city",
        image_emoji: "✨",
      },
      {
        title: "Spa Night at Home",
        description: "Create a relaxing spa experience with face masks, massage oils, candles, and soothing music.",
        category: "Indoor",
        duration: "2 hours",
        budget: "$",
        location: "Home",
        image_emoji: "🧖",
      },
      {
        title: "Hiking Adventure",
        description: "Explore a new trail together, pack a picnic, and enjoy nature's beauty.",
        category: "Outdoor",
        duration: "3-4 hours",
        budget: "$",
        location: "Nature trail",
        image_emoji: "🏔️",
      },
      {
        title: "Wine Tasting Evening",
        description: "Visit a local winery or create your own tasting at home with different wines and cheeses.",
        category: "Indoor",
        duration: "2-3 hours",
        budget: "$$",
        location: "Winery or Home",
        image_emoji: "🍷",
      },
      {
        title: "Concert or Live Music",
        description: "Check out a local band, open mic night, or concert venue for live entertainment.",
        category: "Entertainment",
        duration: "3-4 hours",
        budget: "$$",
        location: "Music venue",
        image_emoji: "🎵",
      },
    ];

    // Filter and select ideas based on preferences
    let filteredIdeas = ideaTemplates;
    
    if (activities.length > 0) {
      filteredIdeas = ideaTemplates.filter(idea => 
        activities.some((activity: string) => 
          idea.category.toLowerCase().includes(activity.toLowerCase()) ||
          idea.title.toLowerCase().includes(activity.toLowerCase())
        )
      );
    }

    // Adjust budget based on preference
    filteredIdeas = filteredIdeas.filter(idea => {
      if (budget === 'free' || budget === 'low') return idea.budget === '$';
      if (budget === 'medium') return idea.budget === '$$';
      return true; // high budget accepts all
    });

    // Select random ideas
    const selectedIdeas = filteredIdeas
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    // Insert ideas into database
    const inserts: Inserts<'date_ideas'>[] = selectedIdeas.map(idea => ({
      relationship_id: relationshipId,
      title: idea.title,
      description: idea.description,
      category: idea.category,
      duration: idea.duration,
      budget: idea.budget,
      location: idea.location,
      image_emoji: idea.image_emoji,
    }));

    const inserted = await handleSupabaseError(
      api.supabase
        .from('date_ideas')
        .insert(inserts)
        .select()
    );

    return inserted || [];
  },

  async generateSwipeDateIdeas(
    relationshipId: string,
    partnerPreferences: any,
    count: number = 30
  ): Promise<DateIdea[]> {
    return this.generateDateIdeasForPartner(relationshipId, partnerPreferences, count);
  },

  async scheduleDate(dateIdeaId: string, scheduledDate: string): Promise<DateIdea> {
    const updated = await handleSupabaseError(
      api.supabase
        .from('date_ideas')
        .update({ scheduled_date: scheduledDate })
        .eq('id', dateIdeaId)
        .select()
        .single()
    );

    return updated;
  },

  async likeDateIdea(
    dateIdeaId: string,
    relationshipId: string,
    userId: string,
    isPartnerA: boolean
  ): Promise<DateMatch> {
    // Check if match already exists
    const existing = await handleSupabaseError(
      api.supabase
        .from('date_matches')
        .select('*')
        .eq('date_idea_id', dateIdeaId)
        .eq('relationship_id', relationshipId)
        .single()
    );

    if (existing) {
      // Update existing match
      const updates: any = {};
      if (isPartnerA) {
        updates.partner_a_liked = true;
      } else {
        updates.partner_b_liked = true;
      }
      
      // Check if both partners liked it
      const bothLiked = 
        (isPartnerA && existing.partner_b_liked) ||
        (!isPartnerA && existing.partner_a_liked);
      
      if (bothLiked) {
        updates.is_match = true;
      }

      const updated = await handleSupabaseError(
        api.supabase
          .from('date_matches')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single()
      );

      return updated;
    } else {
      // Create new match
      const newMatch: Inserts<'date_matches'> = {
        date_idea_id: dateIdeaId,
        relationship_id: relationshipId,
        partner_a_liked: isPartnerA,
        partner_b_liked: !isPartnerA,
        is_match: false,
      };

      const created = await handleSupabaseError(
        api.supabase
          .from('date_matches')
          .insert(newMatch)
          .select()
          .single()
      );

      return created;
    }
  },

  async getMatches(relationshipId: string): Promise<DateMatch[]> {
    const matches = await handleSupabaseError(
      api.supabase
        .from('date_matches')
        .select('*')
        .eq('relationship_id', relationshipId)
        .eq('is_match', true)
        .eq('is_selected', false)
    );

    return matches || [];
  },

  async getOrCreateSwipeDateIdeas(relationshipId: string): Promise<any[]> {
    // Check if date ideas already exist for this relationship
    const existing = await handleSupabaseError(
      api.supabase
        .from('date_ideas')
        .select('*')
        .eq('relationship_id', relationshipId)
        .order('created_at', { ascending: true })
    );

    // If we have enough ideas (at least as many as the static array), return them with image mapping
    if (existing && existing.length >= staticDateIdeas.length) {
      return existing.map(idea => ({
        ...idea,
        image: idea.image_emoji, // Map image_emoji to image for compatibility
      }));
    }

    // Otherwise, create date ideas from the static array
    const inserts: Inserts<'date_ideas'>[] = staticDateIdeas.map(idea => ({
      relationship_id: relationshipId,
      title: idea.title,
      description: idea.description,
      category: idea.category,
      duration: idea.duration,
      budget: idea.budget,
      location: idea.location,
      image_emoji: idea.image,
    }));

    const created = await handleSupabaseError(
      api.supabase
        .from('date_ideas')
        .insert(inserts)
        .select()
    );

    // Map image_emoji to image for compatibility with components
    return (created || []).map(idea => ({
      ...idea,
      image: idea.image_emoji,
    }));
  },

  async selectWinningDate(dateMatchId: string): Promise<DateMatch> {
    const updated = await handleSupabaseError(
      api.supabase
        .from('date_matches')
        .update({ is_selected: true })
        .eq('id', dateMatchId)
        .select()
        .single()
    );

    return updated;
  },
};

