/**
 * AI Helping Hand Service
 *
 * Generates personalized weekly suggestions for supporting one's partner
 * based on capacity, love languages, relationship context, and partner hints.
 *
 * This service integrates with an AI backend to generate contextual suggestions.
 */

import { api } from './api';
import { helpingHandService } from './helpingHandService';
import {
  HelpingHandSuggestion,
  HelpingHandUserStatus,
  HelpingHandPartnerHint,
  HelpingHandCategory,
  AIGenerationContext,
  GenerateSuggestionsRequest,
  GenerateSuggestionsResponse,
  SuggestionStep
} from '../types/helpingHand';

class AIHelpingHandService {
  /**
   * Generate personalized suggestions for a user's week
   * 
   * IMPORTANT: Suggestions are generated fresh for EACH NEW WEEK (Monday-Sunday).
   * 
   * Weekly Variation:
   * - Each week has its own unique week_start_date (Monday of that week)
   * - When a new week starts, week_start_date changes, so new suggestions are generated
   * - Previous week's suggestions remain in database but are not shown for current week
   * - This ensures users get fresh, varied suggestions every week
   * 
   * Factors that make each week's suggestions different:
   * - Current user capacity and status (may change weekly)
   * - Partner's current needs (may change weekly)
   * - Different template selection from pool (randomization)
   * - Personalized context (stress, challenges, work schedule)
   * - Seasonal/holiday context
   * - What worked/didn't work in previous weeks (learning from feedback)
   * 
   * The system will NOT reuse the same week's suggestions once generated,
   * but WILL generate new suggestions when week_start_date changes (new week).
   */
  async generateSuggestions(request: GenerateSuggestionsRequest): Promise<GenerateSuggestionsResponse> {
    console.log('🤖 Generating AI suggestions for week:', request.weekStartDate);

    // Check if suggestions already exist for THIS SPECIFIC WEEK
    // Each week (Monday-Sunday) has its own set of suggestions
    // This prevents regenerating within the same week, but allows new suggestions each week
    // BUT: If user wants to regenerate or if suggestions seem incomplete, generate new ones
    if (!request.regenerate) {
      const existingSuggestions = await helpingHandService.getSuggestions({
        userId: request.userId,
        weekStartDate: request.weekStartDate
      });

      // Only reuse if we have a good number of suggestions across categories
      if (existingSuggestions.total > 0) {
        const categoryCounts = await this.getCategoryCounts(existingSuggestions.suggestions || []);
        const categoriesWithSuggestions = Object.keys(categoryCounts).length;
        const allCategories = await helpingHandService.getCategories();
        
        // If we have suggestions for most categories, reuse them
        // Otherwise, regenerate to fill in missing categories
        if (categoriesWithSuggestions >= allCategories.length * 0.7) {
          console.log(`ℹ️ Using existing suggestions for week ${request.weekStartDate} (${categoriesWithSuggestions} categories)`);
          return {
            suggestions: existingSuggestions.suggestions || [],
            categoryCounts: categoryCounts,
            generatedAt: new Date().toISOString()
          };
        } else {
          console.log(`🔄 Regenerating suggestions - only ${categoriesWithSuggestions}/${allCategories.length} categories have suggestions`);
        }
      }
    }

    // If no suggestions exist for this week, or regenerate is true, create fresh suggestions
    console.log(`🔄 Generating NEW suggestions for week ${request.weekStartDate}`);

    // Gather context for AI generation
    const context = await this.gatherContext(request);

    // Generate suggestions for each category
    const categories = await helpingHandService.getCategories();
    const allSuggestions: HelpingHandSuggestion[] = [];

    for (const category of categories) {
      try {
        const suggestions = await this.generateSuggestionsForCategory(
          category,
          context,
          request
        );
        allSuggestions.push(...suggestions);
      } catch (error) {
        console.error(`❌ Failed to generate suggestions for category ${category.name}:`, error);
        // Continue with other categories even if one fails
      }
    }

    // Save all suggestions to database
    const savedSuggestions = await this.saveSuggestions(allSuggestions);

    return {
      suggestions: savedSuggestions || [],
      categoryCounts: await this.getCategoryCounts(savedSuggestions || []),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Gather all context needed for AI generation
   */
  private async gatherContext(request: GenerateSuggestionsRequest): Promise<AIGenerationContext> {
    console.log('📊 Gathering context for AI generation');

    // Get user's status for the week
    const userStatus = await helpingHandService.getUserStatus(
      request.userId,
      request.weekStartDate
    );

    if (!userStatus) {
      throw new Error('User status not found. Please complete weekly assessment first.');
    }

    // Get relationship data
    const { data: relationship, error: relError } = await api.supabase
      .from('relationships')
      .select('*')
      .eq('id', request.relationshipId)
      .single();

    if (relError) {
      console.error('❌ Failed to fetch relationship:', relError);
      throw relError;
    }

    // Determine partner ID
    const partnerId = relationship.partner_a_id === request.userId
      ? relationship.partner_b_id
      : relationship.partner_a_id;

    // Get user's onboarding data
    const { data: userOnboarding } = await api.supabase
      .from('onboarding_responses')
      .select('*')
      .eq('user_id', request.userId)
      .maybeSingle();

    // Get partner's onboarding data
    const { data: partnerOnboarding } = await api.supabase
      .from('onboarding_responses')
      .select('*')
      .eq('user_id', partnerId)
      .maybeSingle();

    // Get partner's status for the week (if available)
    const partnerStatus = await helpingHandService.getUserStatus(
      partnerId,
      request.weekStartDate
    );

    // Get active partner hints
    const partnerHints = await helpingHandService.getActiveHintsForPartner(request.userId);

    // Get user's calendar events for the week (if available)
    const weekStart = new Date(request.weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { data: calendarEvents } = await api.supabase
      .from('user_calendar_events')
      .select('*')
      .eq('user_id', request.userId)
      .gte('start_time', weekStart.toISOString())
      .lte('end_time', weekEnd.toISOString());

    // Get previous week's suggestions for learning
    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    const { data: previousSuggestions } = await api.supabase
      .from('helping_hand_suggestions')
      .select('*')
      .eq('user_id', request.userId)
      .eq('week_start_date', previousWeekStart.toISOString().split('T')[0]);

    return {
      userStatus,
      partnerStatus: partnerStatus || undefined,
      userOnboarding,
      partnerOnboarding,
      relationshipData: relationship,
      partnerHints: partnerHints || [],
      userCalendarEvents: calendarEvents || [],
      previousSuggestions: previousSuggestions?.map(s => helpingHandService.mapSuggestionFromDb(s)) || []
    };
  }

  /**
   * Generate suggestions for a specific category
   */
  private async generateSuggestionsForCategory(
    category: HelpingHandCategory,
    context: AIGenerationContext,
    request: GenerateSuggestionsRequest
  ): Promise<HelpingHandSuggestion[]> {
    console.log(`💡 Generating suggestions for category: ${category.name}`);

    // Check if category matches partner's love languages - if so, always include it
    const matchesLoveLanguage = await this.categoryMatchesPartnerLoveLanguage(category, context);
    
    // Filter by user's capacity, but always include if it matches love language
    if (!matchesLoveLanguage && !this.isCategoryFeasible(category, context.userStatus)) {
      console.log(`⏭️ Skipping ${category.name} - not feasible given user capacity`);
      return [];
    }

    // Build AI prompt
    const prompt = this.buildPrompt(category, context);

    // Call AI generation (this would be replaced with actual API call)
    const aiSuggestions = await this.callAIGeneration(prompt, category, context);

    // Map AI response to our suggestion format
    return aiSuggestions.map(aiSugg => ({
      id: '', // Will be generated by database
      userId: request.userId,
      relationshipId: request.relationshipId,
      weekStartDate: request.weekStartDate,
      categoryId: category.id,
      sourceType: 'ai' as const,
      ...aiSugg,
      isSelected: false,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }

  /**
   * Check if category matches partner's love languages
   */
  private async categoryMatchesPartnerLoveLanguage(
    category: HelpingHandCategory,
    context: AIGenerationContext
  ): Promise<boolean> {
    const partnerOnboarding = context.partnerOnboarding;
    if (!partnerOnboarding) return false;

    // Map love language names to category alignment
    const loveLanguageMap: Record<string, string[]> = {
      'Words of Affirmation': ['words'],
      'Quality Time': ['quality_time'],
      'Acts of Service': ['acts'],
      'Receiving Gifts': ['gifts'],
      'Physical Touch': ['touch']
    };

    const partnerPrimary = partnerOnboarding.love_language_primary;
    const partnerSecondary = partnerOnboarding.love_language_secondary;
    const partnerLanguages = partnerOnboarding.love_languages || [];

    // Check all partner love languages
    const allPartnerLanguages = [
      partnerPrimary,
      partnerSecondary,
      ...(Array.isArray(partnerLanguages) ? partnerLanguages : [])
    ].filter(Boolean) as string[];

    // Map category to potential love languages
    const categoryToLoveLanguage: Record<string, string[]> = {
      quick_wins: ['words', 'acts', 'gifts', 'touch'],
      thoughtful_messages: ['words', 'quality_time'],
      acts_of_service: ['acts'],
      quality_time: ['quality_time'],
      thoughtful_gifts: ['gifts'],
      physical_touch: ['touch'],
      planning_ahead: ['quality_time', 'acts', 'gifts']
    };

    const categoryLoveLanguages = categoryToLoveLanguage[category.name] || [];

    // Check if any partner love language matches the category
    return allPartnerLanguages.some(ll => {
      const mappedLLs = loveLanguageMap[ll] || [];
      return mappedLLs.some(mapped => categoryLoveLanguages.includes(mapped));
    });
  }

  /**
   * Check if category is feasible given user's capacity
   * Made very lenient - only filter out if truly incompatible
   * We want to include all categories and let the scoring system handle filtering
   */
  private isCategoryFeasible(category: HelpingHandCategory, userStatus: HelpingHandUserStatus): boolean {
    // Only filter out if user has very limited time AND category requires very significant time
    if (userStatus.availableTimeLevel === 'very_limited' && category.minTimeRequired > 60) {
      return false;
    }

    // Only filter out if emotional capacity is very low AND category requires very high capacity
    // But even then, we might have some low-effort suggestions in the category
    // So let's be very lenient
    return true; // Always include categories - let scoring handle it
  }

  /**
   * Build AI prompt for suggestion generation
   */
  private buildPrompt(category: HelpingHandCategory, context: AIGenerationContext): string {
    const { userStatus, partnerStatus, userOnboarding, partnerOnboarding, relationshipData, partnerHints } = context;

    const partnerName = partnerOnboarding?.name || 'your partner';
    const userName = userOnboarding?.name || 'you';

    return `You are a relationship support AI helping ${userName} show love to ${partnerName}.
Generate 3-5 personalized suggestions for the category: ${category.displayName} (${category.description})

CURRENT WEEK CONTEXT:

${userName}'s Status:
- Work: ${userStatus.workScheduleType}, ${userStatus.workHoursPerWeek || '?'} hours/week
- Available Time: ${userStatus.availableTimeLevel}
- Emotional Capacity: ${userStatus.emotionalCapacity}
- Stress: ${userStatus.stressLevel}
- Energy: ${userStatus.energyLevel}
- Current Challenges: ${userStatus.currentChallenges?.join(', ') || 'none'}
${userStatus.notes ? `- Notes: ${userStatus.notes}` : ''}

${partnerStatus ? `${partnerName}'s Status:
- Emotional Capacity: ${partnerStatus.emotionalCapacity}
- Stress: ${partnerStatus.stressLevel}
- Energy: ${partnerStatus.energyLevel}
- Current Challenges: ${partnerStatus.currentChallenges?.join(', ') || 'none'}
` : ''}

RELATIONSHIP PROFILE:

${partnerName}'s Profile:
- Love Languages: ${partnerOnboarding?.love_languages?.join(', ') || 'unknown'}
- Communication Style: ${partnerOnboarding?.communication_style || 'unknown'}
- Favorite Activities: ${partnerOnboarding?.favorite_activities?.join(', ') || 'unknown'}
- Energy Level Preference: ${partnerOnboarding?.energy_level || 'unknown'}
- Budget Comfort: ${partnerOnboarding?.budget_comfort || 'unknown'}

Relationship Context:
- Living Situation: ${relationshipData.living_together ? 'Living together' : 'Living apart'}
- Relationship Duration: ${relationshipData.relationship_duration || 'unknown'}
- Status: ${relationshipData.relationship_status || 'unknown'}

${partnerHints.length > 0 ? `
PARTNER HINTS (Private - ${partnerName} shared these):
${partnerHints.map(h => `- ${h.hintType}: "${h.hintText}"`).join('\n')}
` : ''}

CATEGORY REQUIREMENTS:
- Time Range: ${category.minTimeRequired}-${category.maxTimeRequired} minutes
- Effort Level: ${category.effortLevel}
- Emotional Capacity Needed: ${category.emotionalCapacityRequired}

For each suggestion, provide:
1. title: Clear, actionable title (max 50 chars)
2. description: 2-3 sentences explaining the idea and why it matters
3. detailedSteps: Array of 2-5 specific steps with optional tips
4. timeEstimateMinutes: Realistic time estimate within category range
5. effortLevel: ${category.effortLevel} or lower
6. bestTiming: When to do this (morning/afternoon/evening/weekend/any)
7. loveLanguageAlignment: Which love languages this serves
8. whySuggested: Explain why this fits ${userName}'s current situation and ${partnerName}'s needs
9. aiConfidenceScore: 0.00-1.00 based on how well this matches the context

Return valid JSON array of suggestions. Make them specific, personal, and achievable given the context.`;
  }

  /**
   * Call AI generation API
   * TODO: Replace with actual API call to Claude or backend service
   */
  private async callAIGeneration(
    prompt: string,
    category: HelpingHandCategory,
    context: AIGenerationContext
  ): Promise<Partial<HelpingHandSuggestion>[]> {
    console.log('🤖 Calling AI generation (mock)');

    // This is a placeholder. In production, this would call:
    // 1. A backend API endpoint that calls Claude API
    // 2. Or directly call Claude API (if API key is available client-side, which is not recommended)

    // For now, return template-based suggestions
    return this.generateTemplateSuggestions(category, context);
  }

  /**
   * Score template relevance (0-100) based on assessment, onboarding, relationship context, and weekly variety
   */
  private scoreTemplateRelevance(
    template: Partial<HelpingHandSuggestion>,
    context: AIGenerationContext,
    previousSuggestions: HelpingHandSuggestion[]
  ): number {
    const { userStatus, partnerStatus, userOnboarding, partnerOnboarding, relationshipData } = context;
    let score = 0;

    // Assessment Match (40 points max)
    const timeScore = this.scoreTimeMatch(template.timeEstimateMinutes!, userStatus.availableTimeLevel);
    const energyScore = this.scoreEnergyMatch(template.effortLevel!, userStatus.energyLevel);
    const capacityScore = this.scoreCapacityMatch(template.effortLevel!, userStatus.emotionalCapacity);
    const workScheduleScore = this.scoreWorkScheduleMatch(template.bestTiming!, userStatus.workScheduleType);
    const challengeScore = this.scoreChallengeMatch(template, userStatus.currentChallenges || []);
    
    // Normalize to 40 points: each component contributes proportionally
    const assessmentTotal = timeScore + energyScore + capacityScore + workScheduleScore + challengeScore;
    const assessmentMax = 100; // Max possible from all components
    score += (assessmentTotal / assessmentMax) * 40;

    // Onboarding Match (35 points max)
    const loveLanguageScore = this.scoreLoveLanguageMatch(template.loveLanguageAlignment || [], partnerOnboarding);
    const activityScore = this.scoreActivityMatch(template, partnerOnboarding?.favorite_activities || []);
    const dateStyleScore = this.scoreDateStyleMatch(template, partnerOnboarding?.wants_needs?.date_style);
    const giftPreferenceScore = this.scoreGiftPreferenceMatch(template, partnerOnboarding);
    const communicationScore = this.scoreCommunicationMatch(template, partnerOnboarding?.communication_style);
    
    // Normalize to 35 points
    const onboardingTotal = loveLanguageScore + activityScore + dateStyleScore + giftPreferenceScore + communicationScore;
    const onboardingMax = 50; // Max possible (20+10+10+10+10)
    score += (onboardingTotal / onboardingMax) * 35;

    // Relationship Context (15 points max)
    const livingTogetherScore = this.scoreLivingTogetherMatch(template, relationshipData?.living_together || false);
    const dateFrequencyScore = this.scoreDateFrequencyMatch(template, partnerOnboarding?.date_frequency);
    const planningStyleScore = this.scorePlanningStyleMatch(template, partnerOnboarding?.wants_needs?.planning_style);
    
    // Normalize to 15 points
    const relationshipTotal = livingTogetherScore + dateFrequencyScore + planningStyleScore;
    const relationshipMax = 15; // Max possible (5+5+5)
    score += (relationshipTotal / relationshipMax) * 15;

    // Weekly Variety (10 points max)
    const varietyScore = this.scoreWeeklyVariety(template, previousSuggestions);
    score += varietyScore; // Already 0-10

    return Math.min(100, Math.max(0, score));
  }

  // Helper scoring methods
  private scoreTimeMatch(timeMinutes: number, availableTime: string): number {
    const timeLevels: Record<string, number> = { very_limited: 10, limited: 20, moderate: 40, plenty: 60 };
    const maxTime: Record<string, number> = { very_limited: 15, limited: 30, moderate: 60, plenty: 120 };
    const baseScore = timeLevels[availableTime] || 30;
    if (timeMinutes <= maxTime[availableTime]) return baseScore;
    return Math.max(0, baseScore - (timeMinutes - maxTime[availableTime]) * 2);
  }

  private scoreEnergyMatch(effortLevel: string, energyLevel: string): number {
    const effortScores: Record<string, number> = { minimal: 1, low: 2, moderate: 3, high: 4 };
    const energyScores: Record<string, number> = { exhausted: 1, tired: 2, moderate: 3, energized: 4, very_energized: 5 };
    const effort = effortScores[effortLevel] || 2;
    const energy = energyScores[energyLevel] || 3;
    if (effort <= energy) return 10;
    return Math.max(0, 10 - (effort - energy) * 3);
  }

  private scoreCapacityMatch(effortLevel: string, capacity: string): number {
    const effortScores: Record<string, number> = { minimal: 1, low: 2, moderate: 3, high: 4 };
    const capacityScores: Record<string, number> = { very_low: 1, low: 2, moderate: 3, good: 4, excellent: 5 };
    const effort = effortScores[effortLevel] || 2;
    const cap = capacityScores[capacity] || 3;
    if (effort <= cap) return 10;
    return Math.max(0, 10 - (effort - cap) * 3);
  }

  private scoreWorkScheduleMatch(bestTiming: string, workSchedule: string): number {
    const timingMap: Record<string, string[]> = {
      full_time: ['evening', 'weekend'],
      part_time: ['any', 'evening', 'afternoon'],
      flexible: ['any'],
      unemployed: ['any'],
      student: ['afternoon', 'evening', 'weekend'],
      shift_work: ['any', 'evening']
    };
    const compatible = timingMap[workSchedule] || ['any'];
    return compatible.includes(bestTiming) || bestTiming === 'any' ? 10 : 5;
  }

  private scoreChallengeMatch(template: Partial<HelpingHandSuggestion>, challenges: string[]): number {
    if (challenges.length === 0) return 10;
    let score = 10;
    if (challenges.includes('work_deadline') && template.effortLevel === 'minimal') score += 5;
    if (challenges.includes('family_issue') && template.loveLanguageAlignment?.includes('words')) score += 5;
    if (challenges.includes('financial_stress') && template.loveLanguageAlignment?.includes('gifts')) score -= 5;
    if (challenges.includes('travel') && template.timeEstimateMinutes! > 30) score -= 3;
    return Math.min(10, Math.max(0, score));
  }

  private scoreLoveLanguageMatch(alignment: string[], partnerOnboarding: any): number {
    if (!partnerOnboarding) return 5;
    const mapLL = (ll: string) => {
      const mapping: Record<string, string> = {
        'Words of Affirmation': 'words',
        'Quality Time': 'quality_time',
        'Acts of Service': 'acts',
        'Receiving Gifts': 'gifts',
        'Physical Touch': 'touch'
      };
      return mapping[ll] || null;
    };
    const primary = mapLL(partnerOnboarding.love_language_primary || '');
    const secondary = mapLL(partnerOnboarding.love_language_secondary || '');
    if (primary && alignment.includes(primary)) return 20;
    if (secondary && alignment.includes(secondary)) return 10;
    if (alignment.some(ll => partnerOnboarding.love_languages?.some((pll: string) => mapLL(pll) === ll))) return 5;
    return 0;
  }

  private scoreActivityMatch(template: Partial<HelpingHandSuggestion>, activities: string[]): number {
    if (activities.length === 0) return 5;
    const desc = (template.description || '').toLowerCase();
    const title = (template.title || '').toLowerCase();
    const text = desc + ' ' + title;
    const matches = activities.filter(activity => text.includes(activity.toLowerCase()));
    return Math.min(10, matches.length * 3);
  }

  private scoreDateStyleMatch(template: Partial<HelpingHandSuggestion>, dateStyle?: string): number {
    if (!dateStyle || !template.loveLanguageAlignment?.includes('quality_time')) return 5;
    const desc = (template.description || '').toLowerCase();
    const styleKeywords: Record<string, string[]> = {
      'Adventurous & active': ['hike', 'outdoor', 'adventure', 'active', 'walk'],
      'Cultural (museums/theater)': ['museum', 'gallery', 'theater', 'cultural', 'art'],
      'Food-first (restaurants/foodie)': ['dinner', 'restaurant', 'food', 'cook', 'meal'],
      'At-home, sentimental': ['home', 'couch', 'movie', 'cozy', 'together'],
      'Relaxed & cozy': ['relax', 'cozy', 'quiet', 'peaceful', 'calm']
    };
    const keywords = styleKeywords[dateStyle] || [];
    const matches = keywords.filter(kw => desc.includes(kw));
    return matches.length > 0 ? 10 : 5;
  }

  private scoreGiftPreferenceMatch(template: Partial<HelpingHandSuggestion>, partnerOnboarding: any): number {
    if (!template.loveLanguageAlignment?.includes('gifts')) return 5;
    if (!partnerOnboarding) return 5;
    const budget = partnerOnboarding.preferences?.gift_budget || partnerOnboarding.budget_comfort;
    if (budget && budget.includes('Under $25') && template.timeEstimateMinutes! > 30) return 3;
    return 10;
  }

  private scoreCommunicationMatch(template: Partial<HelpingHandSuggestion>, style?: string): number {
    if (!style || !template.loveLanguageAlignment?.includes('words')) return 5;
    return 10; // All message templates work for any communication style
  }

  private scoreLivingTogetherMatch(template: Partial<HelpingHandSuggestion>, livingTogether: boolean): number {
    const desc = (template.description || '').toLowerCase();
    if (livingTogether && (desc.includes('home') || desc.includes('together'))) return 5;
    if (!livingTogether && (desc.includes('visit') || desc.includes('go'))) return 5;
    return 3;
  }

  private scoreDateFrequencyMatch(template: Partial<HelpingHandSuggestion>, frequency?: string): number {
    if (!frequency || !template.loveLanguageAlignment?.includes('quality_time')) return 3;
    if (frequency === 'rarely' || frequency === 'never') return 8; // Prioritize quality time
    return 5;
  }

  private scorePlanningStyleMatch(template: Partial<HelpingHandSuggestion>, style?: string): number {
    if (!style || !template.loveLanguageAlignment?.includes('quality_time')) return 3;
    const desc = (template.description || '').toLowerCase();
    if (style === 'Spontaneously' && desc.includes('spontaneous')) return 8;
    if (style === 'Planned in advance' && desc.includes('plan')) return 8;
    return 5;
  }

  private scoreWeeklyVariety(template: Partial<HelpingHandSuggestion>, previousSuggestions: HelpingHandSuggestion[]): number {
    const templateTitle = template.title?.toLowerCase() || '';
    
    // Check if this template was used in previous weeks
    // We want to strongly prefer templates that haven't been used recently
    const wasUsed = previousSuggestions.some(s => s.title?.toLowerCase() === templateTitle);
    
    if (!wasUsed) {
      // Never used before - highest priority for weekly variety
      return 10;
    }
    
    // Was used before - significantly reduce score to avoid repeats
    // This ensures we get different suggestions each week
    // With 15-20+ templates per category and only showing 3 per week,
    // we can go 5-6 weeks without repeating
    return 1; // Very low score to strongly discourage repeats
  }

  /**
   * Generate template-based suggestions as fallback
   * This provides basic functionality until AI API is integrated
   * Now uses scoring system to select most relevant templates
   */
  private generateTemplateSuggestions(
    category: HelpingHandCategory,
    context: AIGenerationContext
  ): Partial<HelpingHandSuggestion>[] {
    const { userStatus, partnerStatus, partnerOnboarding, partnerHints, relationshipData } = context;
    const partnerName = partnerOnboarding?.name || 'your partner';
    
    // Map partner's love languages from full names to short codes
    const mapLoveLanguageToShortCode = (fullName: string | null | undefined): string | null => {
      if (!fullName) return null;
      const mapping: Record<string, string> = {
        'Words of Affirmation': 'words',
        'Quality Time': 'quality_time',
        'Acts of Service': 'acts',
        'Receiving Gifts': 'gifts',
        'Physical Touch': 'touch'
      };
      return mapping[fullName] || null;
    };
    
    const allLoveLanguages: string[] = [];
    if (partnerOnboarding?.love_language_primary) {
      const primary = mapLoveLanguageToShortCode(partnerOnboarding.love_language_primary);
      if (primary) allLoveLanguages.push(primary);
    }
    if (partnerOnboarding?.love_language_secondary) {
      const secondary = mapLoveLanguageToShortCode(partnerOnboarding.love_language_secondary);
      if (secondary && !allLoveLanguages.includes(secondary)) allLoveLanguages.push(secondary);
    }
    if (Array.isArray(partnerOnboarding?.love_languages)) {
      partnerOnboarding.love_languages.forEach((ll: string) => {
        const shortCode = mapLoveLanguageToShortCode(ll);
        if (shortCode && !allLoveLanguages.includes(shortCode)) allLoveLanguages.push(shortCode);
      });
    }
    if (allLoveLanguages.length === 0) {
      allLoveLanguages.push('quality_time'); // Default fallback
    }
    
    const favoriteActivities = partnerOnboarding?.favorite_activities || [];
    const isLivingTogether = relationshipData?.living_together || false;
    const challenges = userStatus.currentChallenges || [];

    // Get base templates
    const baseTemplates = this.getCategoryTemplates(category.name);
    
    // Personalize each template based on context
    const personalizedTemplates = baseTemplates
      .map(template => this.personalizeTemplate(template, {
        partnerName,
        allLoveLanguages,
        favoriteActivities,
        userStatus,
        partnerStatus,
        challenges,
        isLivingTogether,
        partnerHints,
        partnerOnboarding: context.partnerOnboarding,
        relationshipData: context.relationshipData
      }))
      .filter(t => t !== null) as Partial<HelpingHandSuggestion>[];

    // Filter by user capacity and category requirements, but be lenient
    let feasibleTemplates = personalizedTemplates
      .filter(t => t.timeEstimateMinutes! <= category.maxTimeRequired)
      .filter(t => {
        const effortScore = this.getEffortScore(t.effortLevel!);
        const capacityScore = this.getEmotionalScore(userStatus.emotionalCapacity);
        // Be lenient - only filter out if effort is way too high
        return effortScore <= capacityScore + 1; // Allow one level above capacity
      });
    
    // If we filtered out too many, be more lenient
    if (feasibleTemplates.length < 3) {
      feasibleTemplates = personalizedTemplates
        .filter(t => t.timeEstimateMinutes! <= category.maxTimeRequired * 1.5) // Allow slightly over max time
        .filter(t => {
          const effortScore = this.getEffortScore(t.effortLevel!);
          const capacityScore = this.getEmotionalScore(userStatus.emotionalCapacity);
          return effortScore <= capacityScore + 2; // Allow two levels above capacity
        });
    }
    
    // If still not enough, use all personalized templates
    if (feasibleTemplates.length < 3) {
      feasibleTemplates = personalizedTemplates.filter(t => t !== null);
    }

    // Score all templates for relevance
    const previousSuggestions = context.previousSuggestions || [];
    const scoredTemplates = feasibleTemplates.map(template => ({
      template,
      score: this.scoreTemplateRelevance(template, context, previousSuggestions)
    }));
    
    console.log(`📊 Category ${category.name}: ${feasibleTemplates.length} feasible templates, scores range: ${Math.min(...scoredTemplates.map(st => st.score))}-${Math.max(...scoredTemplates.map(st => st.score))}`);

    // Filter out templates with very low scores, but keep most templates
    // Lower threshold to ensure we always have suggestions
    const relevantTemplates = scoredTemplates.filter(st => st.score >= 10);
    
    console.log(`✅ Category ${category.name}: ${relevantTemplates.length} templates passed score threshold (>=10)`);
    
    // If we still don't have enough, lower threshold even more
    if (relevantTemplates.length < 3) {
      const allTemplates = scoredTemplates.filter(st => st.score >= 0);
      if (allTemplates.length > 0) {
        // Use all templates, sorted by score
        const sorted = allTemplates.sort((a, b) => b.score - a.score);
        // Always return exactly 3
        const shuffled = [...sorted].sort(() => Math.random() - 0.5);
        const selectedCount = Math.min(3, shuffled.length);
        return shuffled.slice(0, selectedCount).map(st => st.template)
          .map(template => ({
            ...template,
            basedOnFactors: {
              userCapacity: userStatus.emotionalCapacity,
              workSchedule: userStatus.workScheduleType,
              stressLevel: userStatus.stressLevel,
              challenges: challenges,
              partnerLoveLanguages: allLoveLanguages,
              partnerActivities: favoriteActivities,
              hasPartnerHints: partnerHints.length > 0
            },
            aiConfidenceScore: 0.80,
            generatedBy: 'template'
          }));
      }
    }

    // Sort by score (highest first), but prioritize weekly variety
    // Templates that haven't been used recently get a boost
    const sorted = relevantTemplates.sort((a, b) => {
      // First priority: templates not used recently (higher weekly variety score)
      // This ensures we get different suggestions each week
      const varietyDiff = (b.score % 10) - (a.score % 10); // Weekly variety is last digit
      if (Math.abs(varietyDiff) >= 5) {
        // If one template was used recently and the other wasn't, prioritize the unused one
        return varietyDiff;
      }
      
      // Second priority: overall score (but only if significantly different)
      // Group into score tiers (0-20, 21-40, 41-60, 61-80, 81-100)
      const tierA = Math.floor(a.score / 20);
      const tierB = Math.floor(b.score / 20);
      
      if (tierA !== tierB) {
        return tierB - tierA;
      }
      
      // Within the same tier, add heavy randomization for weekly variety
      // Only use score as tiebreaker if scores are very different (>15 points)
      if (Math.abs(a.score - b.score) > 15) {
        return b.score - a.score;
      }
      
      // Heavy randomization for weekly variety - ensures different suggestions each week
      return Math.random() - 0.5;
    });

    // Select top 3-5 templates with heavy randomization for weekly variety
    let selected: Partial<HelpingHandSuggestion>[] = [];
    
    if (sorted.length > 0) {
      // For weekly variety: take a larger pool and randomly select from it
      // With 15-20+ templates per category, we have enough for 5-6 weeks of unique combinations
      // Take top 12-18 templates (or all if less) to ensure good variety
      const poolSize = Math.min(18, Math.max(12, sorted.length));
      const candidatePool = sorted.slice(0, poolSize);
      
      // Prioritize templates not used recently by filtering them first
      const unusedTemplates = candidatePool.filter(st => {
        const templateTitle = st.template.title?.toLowerCase() || '';
        return !previousSuggestions.some(s => s.title?.toLowerCase() === templateTitle);
      });
      
      // If we have enough unused templates, use those for maximum variety
      // Otherwise, use the full candidate pool
      const varietyPool = unusedTemplates.length >= 3 ? unusedTemplates : candidatePool;
      
      // Shuffle the pool for maximum weekly variety
      const shuffled = [...varietyPool].sort(() => Math.random() - 0.5);
      
      // Always select exactly 3 templates for weekly variety
      // With 15-20+ templates per category, showing 3 per week gives us 5-6 weeks before any repeat
      const selectedCount = Math.min(3, shuffled.length);
      selected = shuffled.slice(0, selectedCount).map(st => st.template);
      
      // If we somehow still don't have enough, fill with any remaining templates
      if (selected.length < 3 && sorted.length > selected.length) {
        const remaining = sorted.slice(selectedCount).map(st => st.template);
        selected.push(...remaining.slice(0, 3 - selected.length));
      }
    }
    
    // Final safety check: if we still don't have enough, use any feasible templates
    if (selected.length < 3 && feasibleTemplates.length > 0) {
      const remaining = feasibleTemplates.filter(t => !selected.some(s => s.title === t.title));
      // Shuffle remaining for variety
      const shuffledRemaining = [...remaining].sort(() => Math.random() - 0.5);
      selected.push(...shuffledRemaining.slice(0, 3 - selected.length));
    }
    
    // If we still don't have enough, use any personalized templates
    if (selected.length < 3 && personalizedTemplates.length > 0) {
      const remaining = personalizedTemplates.filter(t => !selected.some(s => s.title === t.title));
      // Shuffle remaining for variety
      const shuffledRemaining = [...remaining].sort(() => Math.random() - 0.5);
      selected.push(...shuffledRemaining.slice(0, 3 - selected.length));
    }
    
    // CRITICAL: Always return exactly 3 suggestions - no more, no less
    // Slice to ensure we never exceed 3, and pad if needed (shouldn't happen but safety)
    const finalSelected = selected.slice(0, 3);
    
    console.log(`✅ Category ${category.name}: Selected ${finalSelected.length} suggestions (titles: ${finalSelected.map(s => s.title).join(', ')})`);
    
    return finalSelected
      .map(template => ({
        ...template,
        basedOnFactors: {
          userCapacity: userStatus.emotionalCapacity,
          workSchedule: userStatus.workScheduleType,
          stressLevel: userStatus.stressLevel,
          challenges: challenges,
          partnerLoveLanguages: allLoveLanguages,
          partnerActivities: favoriteActivities,
          hasPartnerHints: partnerHints.length > 0
        },
        aiConfidenceScore: 0.80,
        generatedBy: 'template'
      }));
  }

  /**
   * Personalize a template based on user/partner context
   * Enhanced to use assessment answers and onboarding data more deeply
   */
  private personalizeTemplate(
    template: Partial<HelpingHandSuggestion>,
    context: {
      partnerName: string;
      allLoveLanguages: string[];
      favoriteActivities: string[];
      userStatus: HelpingHandUserStatus;
      partnerStatus?: HelpingHandUserStatus;
      challenges: string[];
      isLivingTogether: boolean;
      partnerHints: HelpingHandPartnerHint[];
      partnerOnboarding?: any;
      relationshipData?: any;
    }
  ): Partial<HelpingHandSuggestion> | null {
    const { 
      partnerName, 
      allLoveLanguages, 
      favoriteActivities, 
      userStatus, 
      challenges,
      isLivingTogether,
      partnerHints,
      partnerOnboarding,
      relationshipData
    } = context;

    const isStressed = userStatus.stressLevel === 'very_stressed' || userStatus.stressLevel === 'stressed';
    const isLowEnergy = userStatus.energyLevel === 'exhausted' || userStatus.energyLevel === 'tired';
    const hasWorkChallenge = challenges.includes('work_deadline');
    const hasFamilyChallenge = challenges.includes('family_issue');
    const hasHealthChallenge = challenges.includes('health_concern');
    const hasFinancialChallenge = challenges.includes('financial_stress');
    const hasTravelChallenge = challenges.includes('travel');
    const isStudent = userStatus.workScheduleType === 'student';
    const isFullTime = userStatus.workScheduleType === 'full_time';
    const isShiftWork = userStatus.workScheduleType === 'shift_work';
    const isPartTime = userStatus.workScheduleType === 'part_time';
    const isVeryLimitedTime = userStatus.availableTimeLevel === 'very_limited';
    const isLimitedTime = userStatus.availableTimeLevel === 'limited';
    
    // Parse notes for specific context
    const notes = userStatus.notes?.toLowerCase() || '';
    const workingLate = notes.includes('working late') || notes.includes('late at work');
    const specificDays = notes.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi) || [];

    // Personalize title and description with partner name
    let personalizedTitle = template.title?.replace(/\bpartner\b/gi, partnerName) || template.title || '';
    let personalizedDescription = template.description?.replace(/\bpartner\b/gi, partnerName) || template.description || '';

    // Add context-specific details to descriptions based on assessment
    if (isStressed && template.effortLevel === 'minimal') {
      personalizedDescription += ` Perfect for when you're feeling stretched - this takes almost no mental energy.`;
    }
    if (isLowEnergy && template.effortLevel === 'minimal') {
      personalizedDescription += ` This requires minimal energy, perfect for when you're feeling drained.`;
    }
    if (hasWorkChallenge && template.loveLanguageAlignment?.includes('acts')) {
      personalizedDescription += ` With your work deadline this week, this practical gesture shows care without adding pressure.`;
    }
    if (hasFamilyChallenge && template.loveLanguageAlignment?.includes('words')) {
      personalizedDescription += ` During family challenges, words of support and affirmation can be especially meaningful.`;
    }
    if (hasHealthChallenge && template.loveLanguageAlignment?.includes('acts')) {
      personalizedDescription += ` Acts of service can be especially helpful when dealing with health concerns.`;
    }
    if (hasFinancialChallenge && template.loveLanguageAlignment?.includes('gifts')) {
      // Modify expensive gift suggestions to emphasize low cost
      if (template.timeEstimateMinutes! > 30) {
        personalizedDescription += ` Consider a simpler, lower-cost version of this idea.`;
      } else {
        personalizedDescription += ` This is a thoughtful gesture that doesn't require spending money.`;
      }
    }
    if (hasTravelChallenge && template.timeEstimateMinutes! > 30) {
      personalizedDescription += ` Since you're traveling, consider a shorter version or doing this before/after your trip.`;
    }
    if (workingLate && bestTiming === 'morning') {
      personalizedDescription += ` Since you're working late this week, doing this in the morning ensures you have time.`;
    }

    // Personalize with partner's favorite activities and onboarding data
    if (favoriteActivities.length > 0) {
      const activities = favoriteActivities.slice(0, 2).join(' or ');
      
      // Replace generic activity references with specific ones
      personalizedDescription = personalizedDescription.replace(
        /activities (your partner|they) would enjoy/g,
        `${activities}`
      );
      personalizedDescription = personalizedDescription.replace(
        /something (your partner|they) would enjoy/g,
        `something related to ${activities}`
      );
      
      // For quality time suggestions, specifically mention activities
      if (template.loveLanguageAlignment?.includes('quality_time')) {
        if (!personalizedDescription.includes(activities)) {
          personalizedDescription += ` Consider activities like ${activities}.`;
        }
      }
    }
    
    // Use date style preference for quality time suggestions
    if (partnerOnboarding?.wants_needs?.date_style && template.loveLanguageAlignment?.includes('quality_time')) {
      const dateStyle = partnerOnboarding.wants_needs.date_style;
      if (dateStyle === 'Adventurous & active' && !personalizedDescription.includes('hike') && !personalizedDescription.includes('outdoor')) {
        personalizedDescription += ` Since ${partnerName} enjoys adventurous activities, consider something active.`;
      }
      if (dateStyle === 'Food-first (restaurants/foodie)' && !personalizedDescription.includes('food') && !personalizedDescription.includes('restaurant')) {
        personalizedDescription += ` Since ${partnerName} loves food experiences, consider incorporating a meal or food activity.`;
      }
      if (dateStyle === 'At-home, sentimental' && !personalizedDescription.includes('home') && !personalizedDescription.includes('couch')) {
        personalizedDescription += ` Since ${partnerName} enjoys cozy at-home time, consider something you can do together at home.`;
      }
    }
    
    // Use gift preferences for gift suggestions
    if (partnerOnboarding?.preferences?.gift_budget && template.loveLanguageAlignment?.includes('gifts')) {
      const budget = partnerOnboarding.preferences.gift_budget;
      if (budget.includes('Under $25') && template.timeEstimateMinutes! > 30) {
        personalizedDescription += ` This fits a smaller budget while still being thoughtful.`;
      }
    }
    
    // Use communication style for message suggestions
    if (partnerOnboarding?.communication_style && template.loveLanguageAlignment?.includes('words')) {
      const commStyle = partnerOnboarding.communication_style.toLowerCase();
      if (commStyle.includes('direct') || commStyle.includes('straightforward')) {
        personalizedDescription += ` Keep your message direct and clear - ${partnerName} appreciates straightforward communication.`;
      }
      if (commStyle.includes('gentle') || commStyle.includes('soft')) {
        personalizedDescription += ` Use a gentle, warm tone - ${partnerName} appreciates softer communication.`;
      }
    }
    
    // Use wishes if available
    if (partnerOnboarding?.wants_needs?.wishes && template.loveLanguageAlignment) {
      const wishes = partnerOnboarding.wants_needs.wishes.toLowerCase();
      // Check if template aligns with any mentioned wishes
      const wishKeywords = wishes.split(/[,\s]+/).filter(w => w.length > 3);
      const templateText = (template.description || '').toLowerCase();
      const matchesWish = wishKeywords.some(keyword => templateText.includes(keyword));
      if (matchesWish) {
        personalizedDescription += ` This aligns with something ${partnerName} has mentioned wanting.`;
      }
    }
    
    // Use planning style for planning_ahead suggestions
    if (partnerOnboarding?.wants_needs?.planning_style && template.loveLanguageAlignment?.includes('quality_time')) {
      const planningStyle = partnerOnboarding.wants_needs.planning_style;
      if (planningStyle === 'Spontaneously' && personalizedDescription.includes('plan')) {
        personalizedDescription = personalizedDescription.replace(/plan/gi, 'suggest spontaneously');
      }
      if (planningStyle === 'Planned in advance') {
        personalizedDescription += ` Since ${partnerName} prefers planning ahead, you can start organizing this now.`;
      }
    }

    // Adjust timing based on work schedule and notes
    let bestTiming = template.bestTiming || 'any';
    if (isFullTime && bestTiming === 'any') {
      bestTiming = workingLate ? 'morning' : 'evening';
    }
    if (isStudent && bestTiming === 'any') {
      bestTiming = 'afternoon';
    }
    if (isShiftWork && bestTiming === 'any') {
      bestTiming = 'any'; // Shift workers have variable schedules
    }
    if (isPartTime && bestTiming === 'any') {
      bestTiming = 'afternoon';
    }
    
    // Adjust time estimates for very limited time
    let adjustedTimeEstimate = template.timeEstimateMinutes || 0;
    let adjustedSteps = template.detailedSteps || [];
    if (isVeryLimitedTime && adjustedTimeEstimate > 10) {
      // Suggest shorter versions for very limited time
      adjustedTimeEstimate = Math.min(adjustedTimeEstimate, 10);
      if (adjustedSteps.length > 2) {
        adjustedSteps = adjustedSteps.slice(0, 2);
      }
    }

    // Use partner hints if available
    let whySuggested = template.whySuggested || '';
    if (partnerHints.length > 0 && template.loveLanguageAlignment?.includes('gifts')) {
      const giftHint = partnerHints.find(h => h.hintType === 'like' || h.hintType === 'preference');
      if (giftHint) {
        personalizedDescription += ` ${partnerName} mentioned they like things related to "${giftHint.hintText}" - this could align with that.`;
      }
    }

    // Adjust love language alignment to prioritize partner's languages
    const templateLanguages = template.loveLanguageAlignment || [];
    const alignedLanguages = new Set([...templateLanguages]);
    // Add partner's love languages if category supports them
    allLoveLanguages.forEach(ll => {
      if (templateLanguages.includes(ll)) {
        alignedLanguages.add(ll);
      }
    });

      // Enhance whySuggested with specific context
      if (!whySuggested || whySuggested === template.whySuggested) {
        const reasons: string[] = [];
        
        if (allLoveLanguages.length > 0 && template.loveLanguageAlignment?.some(ll => allLoveLanguages.includes(ll))) {
          reasons.push(`This aligns with ${partnerName}'s love language`);
        }
        
        if (userStatus.availableTimeLevel !== 'plenty') {
          reasons.push(`fits your ${userStatus.availableTimeLevel} available time`);
        }
        
        if (isStressed || isLowEnergy) {
          reasons.push(`perfect for when you're feeling ${isStressed ? 'stressed' : 'low on energy'}`);
        }
        
        if (favoriteActivities.length > 0 && template.loveLanguageAlignment?.includes('quality_time')) {
          reasons.push(`incorporates activities ${partnerName} enjoys`);
        }
        
        whySuggested = reasons.length > 0 
          ? reasons.join(', ') + '.'
          : `This fits your current capacity and ${partnerName}'s preferences.`;
      }

    return {
      ...template,
      title: personalizedTitle,
      description: personalizedDescription,
      bestTiming: bestTiming as any,
      timeEstimateMinutes: adjustedTimeEstimate,
      detailedSteps: adjustedSteps.length > 0 ? adjustedSteps : template.detailedSteps,
      loveLanguageAlignment: Array.from(alignedLanguages),
      whySuggested: whySuggested
    };
  }

  /**
   * Get template suggestions for each category (base templates, will be personalized)
   * 
   * Template counts per category (for weekly variety):
   * Target: 36+ templates per category for 3 months (12 weeks) without repeats
   * - quick_wins: 36+ templates (12+ weeks of unique combinations showing 3/week)
   * - thoughtful_messages: 36+ templates (12+ weeks of unique combinations)
   * - acts_of_service: 36+ templates (12+ weeks of unique combinations)
   * - quality_time: 36+ templates (12+ weeks of unique combinations)
   * - thoughtful_gifts: 36+ templates (12+ weeks of unique combinations)
   * - physical_touch: 36+ templates (12+ weeks of unique combinations)
   * - planning_ahead: 36+ templates (12+ weeks of unique combinations)
   * 
   * Total: 250+ templates across all categories
   * With 3 suggestions per category per week, we can go 12+ weeks (3 months) without repeating
   * Combined with randomization and weekly variety tracking, this ensures fresh suggestions each week
   */
  private getCategoryTemplates(
    categoryName: string
  ): Partial<HelpingHandSuggestion>[] {
    const templates: Record<string, Partial<HelpingHandSuggestion>[]> = {
      quick_wins: [
        {
          title: 'Send a sweet good morning text',
          description: `Start your partner's day with a thoughtful message. A simple "thinking of you" can set a positive tone for their whole day.`,
          detailedSteps: [
            { step: 1, action: 'Think of something specific you appreciate about them', tip: 'Be genuine and specific' },
            { step: 2, action: 'Send the text when they usually wake up', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 3,
          effortLevel: 'minimal',
          bestTiming: 'morning',
          loveLanguageAlignment: ['words'],
          whySuggested: 'A quick morning message requires minimal time and energy but can brighten their entire day.'
        },
        {
          title: 'Leave a sticky note surprise',
          description: `Hide a loving note where your partner will find it unexpectedly. These small surprises create moments of joy throughout the day.`,
          detailedSteps: [
            { step: 1, action: 'Write a short loving message on a sticky note', estimatedMinutes: 2 },
            { step: 2, action: 'Place it somewhere they\'ll discover (mirror, laptop, lunch bag)', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 3,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words', 'acts'],
          whySuggested: 'Takes just a few minutes but creates a delightful surprise moment.'
        },
        {
          title: 'Send a quick compliment',
          description: `Tell your partner something you love about them right now. Genuine compliments build connection and make them feel seen.`,
          detailedSteps: [
            { step: 1, action: 'Notice something positive about them today', tip: 'Be specific - not just "you\'re pretty"' },
            { step: 2, action: 'Send it via text or say it in person', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Compliments take seconds but make a lasting positive impact.'
        },
        {
          title: 'Make their favorite drink',
          description: `Surprise your partner with their preferred coffee, tea, or other beverage. Small acts of service show you pay attention to their preferences.`,
          detailedSteps: [
            { step: 1, action: 'Prepare their favorite drink just how they like it', estimatedMinutes: 3 },
            { step: 2, action: 'Bring it to them without being asked', tip: 'The surprise element makes it special' }
          ],
          timeEstimateMinutes: 3,
          effortLevel: 'minimal',
          bestTiming: 'morning',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Shows thoughtfulness and care with minimal effort.'
        },
        {
          title: 'Give a quick hug or kiss',
          description: `Physical affection is powerful. A brief moment of touch can communicate love and support without words.`,
          detailedSteps: [
            { step: 1, action: 'Initiate physical contact when you see them', tip: 'Make eye contact and smile' },
            { step: 2, action: 'Hold it for a moment longer than usual', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 1,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Physical touch is one of the fastest ways to show love and connection.'
        },
        {
          title: 'Send a "thinking of you" text',
          description: `Send a simple message letting them know they're on your mind. These small check-ins show you care throughout the day.`,
          detailedSteps: [
            { step: 1, action: 'Send a brief "thinking of you" or "hope your day is going well" message', estimatedMinutes: 1 },
            { step: 2, action: 'Maybe add a heart emoji or mention something specific', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Quick check-ins show you care even when you\'re busy.'
        },
        {
          title: 'Put away something they left out',
          description: `Quietly tidy up something small they left behind. These tiny acts of service show you notice and care.`,
          detailedSteps: [
            { step: 1, action: 'Notice something small they left out', estimatedMinutes: 1 },
            { step: 2, action: 'Put it away without mentioning it', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Small acts of service show love without requiring recognition.'
        },
        {
          title: 'Send a funny meme or joke',
          description: `Share something that made you laugh and think of them. Humor and shared laughter strengthen bonds.`,
          detailedSteps: [
            { step: 1, action: 'Find a meme, joke, or funny video they\'d appreciate', estimatedMinutes: 2 },
            { step: 2, action: 'Send it with a note about why it made you think of them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 3,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Sharing humor shows you think of them and want to make them smile.'
        },
        {
          title: 'Fill up their water bottle',
          description: `Notice if their water bottle or glass is empty and refill it. Small gestures of care add up.`,
          detailedSteps: [
            { step: 1, action: 'Check if their water bottle or glass needs refilling', estimatedMinutes: 1 },
            { step: 2, action: 'Fill it up and bring it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Small acts of service show you pay attention to their needs.'
        },
        {
          title: 'Send a voice message',
          description: `Record a quick voice message instead of texting. Hearing your voice can feel more personal and intimate.`,
          detailedSteps: [
            { step: 1, action: 'Record a 30-60 second voice message', tip: 'Say something genuine and from the heart', estimatedMinutes: 2 },
            { step: 2, action: 'Send it when they\'ll have time to listen', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 3,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Voice messages feel more personal than text and show extra effort.'
        },
        {
          title: 'Set out their favorite snack',
          description: `Place their favorite snack somewhere they'll find it. Small surprises show you think about what they enjoy.`,
          detailedSteps: [
            { step: 1, action: 'Get their favorite snack or treat', estimatedMinutes: 2 },
            { step: 2, action: 'Place it where they\'ll discover it (desk, counter, etc.)', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 3,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts', 'acts'],
          whySuggested: 'Small surprises show you pay attention to what makes them happy.'
        },
        {
          title: 'Send a photo of something that reminded you of them',
          description: `Share a photo of something that made you think of them. It shows they're on your mind throughout the day.`,
          detailedSteps: [
            { step: 1, action: 'Take or find a photo that reminds you of them', estimatedMinutes: 2 },
            { step: 2, action: 'Send it with a brief note about why it reminded you of them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 3,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Sharing moments shows you think of them even when apart.'
        },
        {
          title: 'Turn on their favorite music',
          description: `Play their favorite song or playlist when they're around. Music can set a positive mood and show you know their preferences.`,
          detailedSteps: [
            { step: 1, action: 'Find their favorite song or playlist', estimatedMinutes: 1 },
            { step: 2, action: 'Play it when they\'re nearby', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts', 'quality_time'],
          whySuggested: 'Playing their music shows you pay attention to what they enjoy.'
        },
        {
          title: 'Send a "good luck" or "you got this" message',
          description: `If they have something coming up, send encouragement. Supportive messages show you believe in them.`,
          detailedSteps: [
            { step: 1, action: 'Think about what they have coming up', estimatedMinutes: 1 },
            { step: 2, action: 'Send an encouraging message before or during it', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Encouragement shows you support them and believe in their abilities.'
        },
        {
          title: 'Adjust the temperature or lighting for them',
          description: `Notice if they seem too hot, cold, or need better lighting and adjust it. Small comfort gestures show care.`,
          detailedSteps: [
            { step: 1, action: 'Notice if they seem uncomfortable with temperature or lighting', estimatedMinutes: 1 },
            { step: 2, action: 'Adjust it without being asked', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Paying attention to their comfort shows you care about their wellbeing.'
        },
        {
          title: 'Send a "miss you" message',
          description: `If you're apart, let them know you miss them. These messages maintain connection even when separated.`,
          detailedSteps: [
            { step: 1, action: 'Send a brief message saying you miss them', tip: 'Be genuine and specific about what you miss', estimatedMinutes: 2 },
            { step: 2, action: 'Maybe mention when you\'ll see them next', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 3,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Letting them know you miss them strengthens connection when apart.'
        },
        {
          title: 'Offer to grab something for them',
          description: `If you're going somewhere, offer to pick something up for them. Small helpful gestures show you think of them.`,
          detailedSteps: [
            { step: 1, action: 'Before you leave, ask if they need anything', estimatedMinutes: 1 },
            { step: 2, action: 'Pick it up and bring it back', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 6,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Offering to help shows you think of them even when you\'re out.'
        },
        {
          title: 'Send a sunset or nature photo',
          description: `Share a beautiful moment you're experiencing. Sharing beauty with them creates connection.`,
          detailedSteps: [
            { step: 1, action: 'Take a photo of something beautiful you see', estimatedMinutes: 1 },
            { step: 2, action: 'Send it with a note like "wish you were here" or "thinking of you"', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Sharing beautiful moments shows you want to include them in your experiences.'
        },
        {
          title: 'Give them a high-five or playful touch',
          description: `Offer a high-five or playful touch for something they did well. Celebratory touch builds connection.`,
          detailedSteps: [
            { step: 1, action: 'Notice something they accomplished or did well', estimatedMinutes: 1 },
            { step: 2, action: 'Give them a high-five, fist bump, or playful touch', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch', 'words'],
          whySuggested: 'Playful physical gestures celebrate wins and show you notice their successes.'
        },
        {
          title: 'Write a quick "I appreciate you" note',
          description: `Leave a short note expressing appreciation for something specific they do or are. Gratitude strengthens bonds.`,
          detailedSteps: [
            { step: 1, action: 'Think of something specific you appreciate about them', estimatedMinutes: 1 },
            { step: 2, action: 'Write a quick note on paper or sticky note', estimatedMinutes: 2 },
            { step: 3, action: 'Leave it where they\'ll find it', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 4,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Quick appreciation notes show you notice and value them.'
        },
        {
          title: 'Send a voice note instead of text',
          description: `Record a quick voice message instead of texting. Hearing your voice feels more personal and intimate.`,
          detailedSteps: [
            { step: 1, action: 'Record a 20-30 second voice message', tip: 'Say something genuine from the heart', estimatedMinutes: 1 },
            { step: 2, action: 'Send it when they\'ll have time to listen', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Voice notes feel more personal and show extra effort.'
        },
        {
          title: 'Bring them a glass of water',
          description: `Notice if they need water and bring it to them. Small acts of service show you pay attention to their needs.`,
          detailedSteps: [
            { step: 1, action: 'Notice if their glass is empty or they seem thirsty', estimatedMinutes: 1 },
            { step: 2, action: 'Bring them a fresh glass of water', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Small acts of service show you notice and care about their comfort.'
        },
        {
          title: 'Tell them one thing you love about them today',
          description: `Share something specific you love about them right now. Being present and noticing them daily matters.`,
          detailedSteps: [
            { step: 1, action: 'Think of something specific you love about them today', estimatedMinutes: 1 },
            { step: 2, action: 'Tell them in person or via text', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Daily appreciation shows you notice and love them consistently.'
        },
        {
          title: 'Open the door for them',
          description: `Hold the door open when going somewhere together. Small gestures of care add up.`,
          detailedSteps: [
            { step: 1, action: 'When going through a door together, hold it open', estimatedMinutes: 1 },
            { step: 2, action: 'Maybe smile or make eye contact as they pass', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Small gestures of courtesy show care and respect.'
        },
        {
          title: 'Send them a song that reminds you of them',
          description: `Share a song that makes you think of them or your relationship. Music creates emotional connection.`,
          detailedSteps: [
            { step: 1, action: 'Find a song that reminds you of them or your relationship', estimatedMinutes: 2 },
            { step: 2, action: 'Send it with a note about why it reminds you of them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 3,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Sharing music creates emotional connection and shows you think of them.'
        },
        {
          title: 'Squeeze their hand or arm gently',
          description: `Give their hand or arm a gentle squeeze when you're together. Small touches maintain physical connection.`,
          detailedSteps: [
            { step: 1, action: 'When sitting or standing together, give their hand or arm a gentle squeeze', estimatedMinutes: 1 },
            { step: 2, action: 'Maybe make eye contact and smile', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Small physical gestures maintain connection throughout the day.'
        },
        {
          title: 'Send them a motivational quote or affirmation',
          description: `Share a quote or affirmation that you think applies to them or your relationship. Positive words inspire.`,
          detailedSteps: [
            { step: 1, action: 'Find a quote or affirmation that fits them or your relationship', estimatedMinutes: 2 },
            { step: 2, action: 'Send it with a note about why it made you think of them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 3,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Positive words and affirmations show support and belief in them.'
        },
        {
          title: 'Offer them the last bite of something',
          description: `If you're sharing food, offer them the last bite. Small gestures of generosity show care.`,
          detailedSteps: [
            { step: 1, action: 'If sharing food, notice when there\'s one bite left', estimatedMinutes: 1 },
            { step: 2, action: 'Offer it to them with a smile', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts', 'gifts'],
          whySuggested: 'Small gestures of generosity show you want them to have the best.'
        },
        {
          title: 'Send them a "hope you\'re having a good day" check-in',
          description: `Check in during their day to see how they're doing. Regular check-ins show ongoing care.`,
          detailedSteps: [
            { step: 1, action: 'Send a brief message asking how their day is going', estimatedMinutes: 1 },
            { step: 2, action: 'Maybe add that you\'re thinking of them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Regular check-ins show ongoing care and interest in their wellbeing.'
        },
        {
          title: 'Give them a forehead kiss',
          description: `Give them a gentle kiss on the forehead. This tender gesture shows deep affection and care.`,
          detailedSteps: [
            { step: 1, action: 'Give them a gentle kiss on the forehead', estimatedMinutes: 1 },
            { step: 2, action: 'Maybe say something sweet', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Forehead kisses are tender gestures that show deep affection.'
        },
        {
          title: 'Share a funny memory or inside joke',
          description: `Bring up a funny memory or inside joke you share. Shared humor strengthens your bond.`,
          detailedSteps: [
            { step: 1, action: 'Think of a funny memory or inside joke you share', estimatedMinutes: 1 },
            { step: 2, action: 'Bring it up in conversation or via text', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Shared humor and inside jokes strengthen your unique bond.'
        },
        {
          title: 'Turn off the lights or TV when they leave',
          description: `Notice if they forgot to turn something off and do it for them. Small acts of service show you notice.`,
          detailedSteps: [
            { step: 1, action: 'Notice if they left a light or TV on', estimatedMinutes: 1 },
            { step: 2, action: 'Turn it off for them without mentioning it', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Small acts of service show you notice and help without being asked.'
        },
        {
          title: 'Send them a screenshot of something funny you saw',
          description: `Share a screenshot of something funny or interesting you saw online. Sharing moments creates connection.`,
          detailedSteps: [
            { step: 1, action: 'Take a screenshot of something funny or interesting', estimatedMinutes: 1 },
            { step: 2, action: 'Send it with a comment about why you thought of them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Sharing funny moments shows you think of them throughout the day.'
        },
        {
          title: 'Give them a quick back rub or shoulder squeeze',
          description: `Offer a quick back rub or shoulder squeeze. Physical touch helps relieve stress and shows care.`,
          detailedSteps: [
            { step: 1, action: 'Offer a quick back rub or shoulder squeeze', estimatedMinutes: 1 },
            { step: 2, action: 'Do it for 30-60 seconds', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Quick physical touch relieves stress and shows you want to help them feel better.'
        },
        {
          title: 'Send them a "you\'re doing great" message',
          description: `Let them know you think they're doing great at something. Encouragement builds confidence.`,
          detailedSteps: [
            { step: 1, action: 'Think of something they\'re doing well', estimatedMinutes: 1 },
            { step: 2, action: 'Send a message letting them know you think they\'re doing great', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Encouragement shows you believe in them and notice their efforts.'
        },
        {
          title: 'Pick up something they dropped',
          description: `Notice if they dropped something and pick it up for them. Small helpful gestures show care.`,
          detailedSteps: [
            { step: 1, action: 'Notice if they dropped something', estimatedMinutes: 1 },
            { step: 2, action: 'Pick it up and hand it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Small helpful gestures show you pay attention and want to help.'
        }
      ],
      thoughtful_messages: [
        {
          title: 'Share a favorite memory together',
          description: `Remind your partner of a special moment you shared. Reminiscing strengthens your bond and shows you cherish your time together.`,
          detailedSteps: [
            { step: 1, action: 'Think of a recent happy memory', tip: 'Choose something specific and meaningful', estimatedMinutes: 2 },
            { step: 2, action: 'Write 2-3 sentences about why that moment was special', estimatedMinutes: 5 },
            { step: 3, action: 'Send it with a heart emoji', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 8,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Sharing memories takes minimal effort but creates deep emotional connection.'
        },
        {
          title: 'Write them a thank you message',
          description: `Express gratitude for something specific they did recently. Acknowledging their efforts makes them feel appreciated.`,
          detailedSteps: [
            { step: 1, action: 'Think of something they did that helped you or made you happy', estimatedMinutes: 2 },
            { step: 2, action: 'Write a message explaining why it mattered to you', estimatedMinutes: 5 },
            { step: 3, action: 'Send it when they\'ll have time to read it', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 8,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Gratitude strengthens relationships and shows you notice their contributions.'
        },
        {
          title: 'Send an encouraging message',
          description: `If your partner has something coming up or is going through a challenge, send words of support and belief in them.`,
          detailedSteps: [
            { step: 1, action: 'Think about what they\'re facing or working toward', estimatedMinutes: 2 },
            { step: 2, action: 'Write a message of encouragement and belief', tip: 'Be specific about why you believe in them', estimatedMinutes: 5 },
            { step: 3, action: 'Send it at a meaningful time (before an event, during a tough day)', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 8,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Encouragement during challenges shows deep care and support.'
        },
        {
          title: 'Tell them why you love them today',
          description: `Share something specific about them that you're grateful for right now. Be present and genuine.`,
          detailedSteps: [
            { step: 1, action: 'Reflect on what you appreciate about them at this moment', estimatedMinutes: 3 },
            { step: 2, action: 'Write a heartfelt message explaining why', tip: 'Focus on qualities, not just appearance', estimatedMinutes: 5 },
            { step: 3, action: 'Send it or tell them in person', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Regular expressions of love keep the relationship strong and connected.'
        },
        {
          title: 'Write a love letter or long message',
          description: `Take time to write a longer, more detailed message expressing your feelings. Longer messages show extra thought and care.`,
          detailedSteps: [
            { step: 1, action: 'Set aside 10-15 minutes to write', tip: 'Find a quiet moment to reflect', estimatedMinutes: 2 },
            { step: 2, action: 'Write about what you love about them, memories, or your future together', estimatedMinutes: 10 },
            { step: 3, action: 'Read it over and send it when they\'ll have time to read', estimatedMinutes: 3 }
          ],
          timeEstimateMinutes: 15,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Longer messages show you\'re willing to invest time in expressing your feelings.'
        },
        {
          title: 'Send a message about something they did well',
          description: `Acknowledge something specific they accomplished or handled well. Recognition makes them feel seen and valued.`,
          detailedSteps: [
            { step: 1, action: 'Think of something they did recently that impressed you', estimatedMinutes: 2 },
            { step: 2, action: 'Write about what they did and why it mattered', estimatedMinutes: 5 },
            { step: 3, action: 'Send it to celebrate their success', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 8,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Acknowledging their accomplishments shows you notice and appreciate their efforts.'
        },
        {
          title: 'Send a message about how they make you feel',
          description: `Express how being with them makes you feel. Sharing emotions deepens intimacy and connection.`,
          detailedSteps: [
            { step: 1, action: 'Reflect on how they make you feel (safe, happy, loved, etc.)', estimatedMinutes: 3 },
            { step: 2, action: 'Write a message expressing these feelings', estimatedMinutes: 6 },
            { step: 3, action: 'Send it when they\'ll have time to read and appreciate it', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 10,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Sharing how they make you feel deepens emotional intimacy.'
        },
        {
          title: 'Write a message about your future together',
          description: `Share your hopes and dreams for your future together. Talking about the future shows commitment and excitement.`,
          detailedSteps: [
            { step: 1, action: 'Think about what you look forward to with them', estimatedMinutes: 3 },
            { step: 2, action: 'Write about your shared dreams or plans', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to show you\'re thinking long-term', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 10,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Sharing future dreams shows commitment and excitement about your relationship.'
        },
        {
          title: 'Send a message about a small thing you noticed',
          description: `Point out something small you noticed about them - a new habit, something they said, or a way they handled something.`,
          detailedSteps: [
            { step: 1, action: 'Think of something small you noticed about them recently', estimatedMinutes: 2 },
            { step: 2, action: 'Write about what you noticed and why it stood out to you', estimatedMinutes: 5 },
            { step: 3, action: 'Send it to show you pay attention to the details', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 8,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Noticing small details shows you pay attention and care about them.'
        },
        {
          title: 'Send a message when they\'re having a tough day',
          description: `If you know they\'re struggling, send a supportive message. Being there during hard times strengthens bonds.`,
          detailedSteps: [
            { step: 1, action: 'Think about what they\'re going through', estimatedMinutes: 2 },
            { step: 2, action: 'Write a message of support and understanding', tip: 'Don\'t try to fix it, just be there', estimatedMinutes: 6 },
            { step: 3, action: 'Send it when they need it most', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Support during tough times shows you\'re there for them no matter what.'
        },
        {
          title: 'Write a message about how you\'ve grown together',
          description: `Reflect on how your relationship has grown and evolved. Acknowledging growth shows you value the journey.`,
          detailedSteps: [
            { step: 1, action: 'Think about how you\'ve both grown since you met', estimatedMinutes: 3 },
            { step: 2, action: 'Write about specific ways you\'ve grown together', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to celebrate your journey', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 10,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Reflecting on growth shows you value the relationship and its evolution.'
        },
        {
          title: 'Send a message about what you learned from them',
          description: `Share something they taught you or helped you understand. Acknowledging their impact shows gratitude.`,
          detailedSteps: [
            { step: 1, action: 'Think of something they taught you or helped you see differently', estimatedMinutes: 3 },
            { step: 2, action: 'Write about what you learned and how it impacted you', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to show their influence on your life', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 10,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Acknowledging what you\'ve learned from them shows you value their perspective.'
        },
        {
          title: 'Write a message about a moment you\'re grateful for',
          description: `Express gratitude for a specific moment or experience you shared. Gratitude strengthens relationships.`,
          detailedSteps: [
            { step: 1, action: 'Think of a recent moment you\'re grateful for', estimatedMinutes: 2 },
            { step: 2, action: 'Write about why that moment meant so much to you', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to share your gratitude', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Expressing gratitude for shared moments strengthens your bond.'
        },
        {
          title: 'Send a message about their strengths',
          description: `Tell them about a strength or quality you admire in them. Acknowledging their strengths builds confidence.`,
          detailedSteps: [
            { step: 1, action: 'Think of a specific strength or quality they have', estimatedMinutes: 2 },
            { step: 2, action: 'Write about that strength and give a specific example', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to build them up', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Acknowledging their strengths shows you see and value who they are.'
        },
        {
          title: 'Write a message about how they inspire you',
          description: `Share how they inspire you to be better. Letting them know their impact motivates and strengthens the relationship.`,
          detailedSteps: [
            { step: 1, action: 'Think about how they inspire you', estimatedMinutes: 3 },
            { step: 2, action: 'Write about specific ways they inspire you', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to let them know their impact', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 10,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Sharing how they inspire you shows you value their influence on your life.'
        },
        {
          title: 'Send a message about missing them',
          description: `If you\'re apart, write about what you miss about them. Expressing what you miss shows how much they mean to you.`,
          detailedSteps: [
            { step: 1, action: 'Think about what you miss about them', estimatedMinutes: 2 },
            { step: 2, action: 'Write about specific things you miss', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to let them know they\'re on your mind', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Expressing what you miss shows how much they mean to you.'
        },
        {
          title: 'Write a message about a small win they had',
          description: `Celebrate a small victory or accomplishment they had. Celebrating wins together strengthens your bond.`,
          detailedSteps: [
            { step: 1, action: 'Think of something they accomplished recently', estimatedMinutes: 2 },
            { step: 2, action: 'Write a message celebrating their win', estimatedMinutes: 5 },
            { step: 3, action: 'Send it to show you\'re proud of them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 8,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Celebrating their wins shows you\'re their biggest cheerleader.'
        },
        {
          title: 'Write a message about a quality you admire',
          description: `Share something specific about their character or qualities that you admire. Recognition builds confidence.`,
          detailedSteps: [
            { step: 1, action: 'Think of a quality or trait they have that you admire', estimatedMinutes: 2 },
            { step: 2, action: 'Write about that quality and give a specific example', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to build them up', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Acknowledging their qualities shows you see and value who they are.'
        },
        {
          title: 'Send a message about how you felt when you met',
          description: `Share how you felt when you first met them or early in your relationship. Sharing origin stories deepens connection.`,
          detailedSteps: [
            { step: 1, action: 'Think back to when you first met or early in your relationship', estimatedMinutes: 3 },
            { step: 2, action: 'Write about how you felt and what stood out to you', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to share your origin story', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 10,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Sharing origin stories deepens connection and reminds you why you fell in love.'
        },
        {
          title: 'Write about a moment they made you laugh',
          description: `Share a specific moment when they made you laugh. Shared humor strengthens bonds and creates joy.`,
          detailedSteps: [
            { step: 1, action: 'Think of a moment when they made you laugh', estimatedMinutes: 2 },
            { step: 2, action: 'Write about that moment and why it made you happy', estimatedMinutes: 5 },
            { step: 3, action: 'Send it to share the joy', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 8,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Sharing laughter and humor strengthens your bond and creates joy.'
        },
        {
          title: 'Send a message about how you see your future together',
          description: `Share your hopes and dreams for your future together. Talking about the future shows commitment and excitement.`,
          detailedSteps: [
            { step: 1, action: 'Think about what you look forward to with them', estimatedMinutes: 3 },
            { step: 2, action: 'Write about your shared dreams or plans', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to show you\'re thinking long-term', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 10,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Sharing future dreams shows commitment and excitement about your relationship.'
        },
        {
          title: 'Write about what you admire in their work or hobbies',
          description: `Acknowledge something specific about their work, hobbies, or interests that you admire. Recognition builds confidence.`,
          detailedSteps: [
            { step: 1, action: 'Think about their work or hobbies', estimatedMinutes: 2 },
            { step: 2, action: 'Write about what you admire about their skills or dedication', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to show you notice and appreciate their interests', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Acknowledging their work and interests shows you pay attention to what matters to them.'
        },
        {
          title: 'Send a message about a small thing they do that you love',
          description: `Point out something small they do regularly that you love. Noticing small details shows you pay attention.`,
          detailedSteps: [
            { step: 1, action: 'Think of a small habit or thing they do that you love', estimatedMinutes: 2 },
            { step: 2, action: 'Write about that small thing and why it matters to you', estimatedMinutes: 5 },
            { step: 3, action: 'Send it to show you notice the details', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 8,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Noticing small details shows you pay attention and care about them.'
        },
        {
          title: 'Write about how they helped you through something',
          description: `Share how they helped or supported you through a difficult time. Acknowledging their support shows gratitude.`,
          detailedSteps: [
            { step: 1, action: 'Think of a time when they helped or supported you', estimatedMinutes: 2 },
            { step: 2, action: 'Write about how they helped and why it mattered', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to show your gratitude', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Acknowledging their support shows gratitude and strengthens your bond.'
        },
        {
          title: 'Send a message about a characteristic that makes them unique',
          description: `Share something unique about them that you love. Celebrating their uniqueness shows you value who they are.`,
          detailedSteps: [
            { step: 1, action: 'Think of something unique about them that you love', estimatedMinutes: 2 },
            { step: 2, action: 'Write about that unique characteristic and why it matters', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to celebrate what makes them special', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Celebrating their uniqueness shows you value who they are as an individual.'
        },
        {
          title: 'Write about a way they\'ve changed your perspective',
          description: `Share how they helped you see something differently. Acknowledging their influence shows you value their perspective.`,
          detailedSteps: [
            { step: 1, action: 'Think of a way they changed how you see something', estimatedMinutes: 3 },
            { step: 2, action: 'Write about that change and why it matters to you', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to show their impact on your life', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 10,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Acknowledging how they changed your perspective shows you value their influence.'
        },
        {
          title: 'Send a message about a time they surprised you',
          description: `Share a moment when they surprised you in a good way. Celebrating surprises shows you notice and appreciate their thoughtfulness.`,
          detailedSteps: [
            { step: 1, action: 'Think of a time when they surprised you', estimatedMinutes: 2 },
            { step: 2, action: 'Write about that surprise and how it made you feel', estimatedMinutes: 5 },
            { step: 3, action: 'Send it to show you remember and appreciate it', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 8,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Celebrating surprises shows you notice and appreciate their thoughtfulness.'
        },
        {
          title: 'Write about how they handle challenges',
          description: `Acknowledge how they handle difficult situations or challenges. Recognition of their strength builds confidence.`,
          detailedSteps: [
            { step: 1, action: 'Think of a challenge they faced and how they handled it', estimatedMinutes: 2 },
            { step: 2, action: 'Write about their strength and resilience', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to show you notice their strength', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Acknowledging their strength in facing challenges builds confidence and shows support.'
        },
        {
          title: 'Send a message about something they taught you about yourself',
          description: `Share how they helped you learn something about yourself. Acknowledging their role in your growth shows gratitude.`,
          detailedSteps: [
            { step: 1, action: 'Think of something you learned about yourself because of them', estimatedMinutes: 3 },
            { step: 2, action: 'Write about that learning and their role in it', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to show your gratitude for their role in your growth', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 10,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Acknowledging their role in your growth shows gratitude and deepens connection.'
        },
        {
          title: 'Write about a moment when you felt proud of them',
          description: `Share a moment when you felt proud of them. Sharing pride strengthens bonds and shows support.`,
          detailedSteps: [
            { step: 1, action: 'Think of a moment when you felt proud of them', estimatedMinutes: 2 },
            { step: 2, action: 'Write about that moment and why you felt proud', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to share your pride in them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Sharing pride in them strengthens bonds and shows you\'re their biggest supporter.'
        },
        {
          title: 'Send a message about what you love about their personality',
          description: `Share something specific about their personality that you love. Personality compliments are deeply meaningful.`,
          detailedSteps: [
            { step: 1, action: 'Think of a personality trait you love about them', estimatedMinutes: 2 },
            { step: 2, action: 'Write about that trait and give a specific example', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to show you love who they are', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Personality compliments are deeply meaningful and show you love who they are.'
        },
        {
          title: 'Write about a way they show you love',
          description: `Share how they show you love in their own way. Acknowledging their love language shows you notice their efforts.`,
          detailedSteps: [
            { step: 1, action: 'Think of a way they show you love', estimatedMinutes: 2 },
            { step: 2, action: 'Write about that way and why it matters to you', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to show you notice their efforts', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Acknowledging how they show love shows you notice their efforts and appreciate them.'
        },
        {
          title: 'Send a message about a memory from your first date',
          description: `Share something specific from your first date. Revisiting early memories strengthens your bond.`,
          detailedSteps: [
            { step: 1, action: 'Think back to your first date', estimatedMinutes: 2 },
            { step: 2, action: 'Write about a specific moment or detail that stood out', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to revisit that memory together', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Revisiting early memories strengthens your bond and reminds you of your beginning.'
        },
        {
          title: 'Write about how they make everyday moments special',
          description: `Share how they make ordinary moments feel special. Noticing their magic in everyday life shows appreciation.`,
          detailedSteps: [
            { step: 1, action: 'Think of an ordinary moment they made special', estimatedMinutes: 2 },
            { step: 2, action: 'Write about that moment and how they made it special', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to show you notice their magic', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Noticing how they make everyday moments special shows deep appreciation.'
        },
        {
          title: 'Send a message about what you look forward to with them',
          description: `Share something you're looking forward to doing with them. Anticipation creates excitement and connection.`,
          detailedSteps: [
            { step: 1, action: 'Think of something you\'re looking forward to with them', estimatedMinutes: 2 },
            { step: 2, action: 'Write about what you\'re excited about and why', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to share your excitement', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words', 'quality_time'],
          whySuggested: 'Sharing what you look forward to creates excitement and anticipation together.'
        },
        {
          title: 'Write about how they comforted you',
          description: `Share a time when they comforted you. Acknowledging their support during tough times shows gratitude.`,
          detailedSteps: [
            { step: 1, action: 'Think of a time when they comforted you', estimatedMinutes: 2 },
            { step: 2, action: 'Write about how they comforted you and how it helped', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to show your gratitude for their comfort', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Acknowledging their comfort shows gratitude for their support during tough times.'
        },
        {
          title: 'Send a message about a way they make you feel safe',
          description: `Share how they make you feel safe or secure. Feeling safe is fundamental to deep connection.`,
          detailedSteps: [
            { step: 1, action: 'Think of a way they make you feel safe or secure', estimatedMinutes: 2 },
            { step: 2, action: 'Write about that feeling and what they do that creates it', estimatedMinutes: 6 },
            { step: 3, action: 'Send it to show how much that safety means to you', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 9,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['words'],
          whySuggested: 'Feeling safe is fundamental to deep connection - acknowledging it strengthens that bond.'
        }
      ],
      acts_of_service: [
        {
          title: `Do a chore your partner usually handles`,
          description: `Take something off your partner's plate by handling a task they usually do. Actions speak louder than words.`,
          detailedSteps: [
            { step: 1, action: 'Notice a task they usually handle', tip: 'Choose something you can do well', estimatedMinutes: 5 },
            { step: 2, action: 'Complete it before they have to think about it', estimatedMinutes: 20 },
            { step: 3, action: 'No need to announce it - let them discover it', tip: 'The surprise makes it more meaningful' }
          ],
          timeEstimateMinutes: 25,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Practical help shows you notice what they do and want to lighten their load.'
        },
        {
          title: 'Make their lunch or prepare a meal',
          description: `Prepare food for your partner - whether it's packing their lunch, making breakfast, or cooking dinner. Food is love in action.`,
          detailedSteps: [
            { step: 1, action: 'Decide what they would enjoy', tip: 'Think about their preferences and what they like', estimatedMinutes: 3 },
            { step: 2, action: 'Prepare it with care and attention', estimatedMinutes: 20 },
            { step: 3, action: 'Present it nicely or pack it up for them', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 25,
          effortLevel: 'moderate',
          bestTiming: 'morning',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Preparing food shows care and consideration for their wellbeing.'
        },
        {
          title: 'Clean up something they left out',
          description: `Without asking or making a big deal, tidy up something they left behind. Small acts of service show you care about their comfort.`,
          detailedSteps: [
            { step: 1, action: 'Notice something they left out that needs tidying', estimatedMinutes: 1 },
            { step: 2, action: 'Put it away or clean it up without mention', estimatedMinutes: 10 },
            { step: 3, action: 'Don\'t make a big deal about it', tip: 'The quiet service is more meaningful' }
          ],
          timeEstimateMinutes: 11,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Quiet acts of service show love without expecting recognition.'
        },
        {
          title: 'Take care of an errand for them',
          description: `Run an errand they need to do but haven't gotten to yet. Lightening their to-do list shows you pay attention and want to help.`,
          detailedSteps: [
            { step: 1, action: 'Think of an errand or task they\'ve mentioned needing to do', estimatedMinutes: 2 },
            { step: 2, action: 'Handle it without being asked', estimatedMinutes: 30 },
            { step: 3, action: 'Let them know casually or let them discover it', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 33,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Taking care of errands shows proactive care and reduces their stress.'
        },
        {
          title: 'Do the dishes without being asked',
          description: `Take care of the dishes after a meal. This simple act of service shows you want to help and lighten their load.`,
          detailedSteps: [
            { step: 1, action: 'After a meal, start doing the dishes', estimatedMinutes: 1 },
            { step: 2, action: 'Complete the task thoroughly', estimatedMinutes: 15 },
            { step: 3, action: 'Don\'t make a big deal about it', tip: 'The quiet service is more meaningful' }
          ],
          timeEstimateMinutes: 16,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Doing dishes without being asked shows proactive care and consideration.'
        },
        {
          title: 'Take out the trash or recycling',
          description: `Handle the trash or recycling before they have to think about it. Small tasks add up and show you notice what needs doing.`,
          detailedSteps: [
            { step: 1, action: 'Check if trash or recycling needs to be taken out', estimatedMinutes: 1 },
            { step: 2, action: 'Take it out without mentioning it', estimatedMinutes: 5 },
            { step: 3, action: 'Replace the bag if needed', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 8,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Handling routine tasks shows you pay attention and want to help.'
        },
        {
          title: 'Make the bed or tidy a room',
          description: `Tidy up a shared space or make the bed. A clean, organized space shows you care about their comfort.`,
          detailedSteps: [
            { step: 1, action: 'Choose a room or space to tidy', estimatedMinutes: 1 },
            { step: 2, action: 'Tidy it up or make the bed', estimatedMinutes: 10 },
            { step: 3, action: 'Let them discover it', tip: 'The surprise makes it more meaningful' }
          ],
          timeEstimateMinutes: 11,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Tidying shared spaces shows you care about their comfort and environment.'
        },
        {
          title: 'Pick up groceries or something they need',
          description: `If you're going to the store, pick up something they need or mentioned wanting. This shows you listen and care.`,
          detailedSteps: [
            { step: 1, action: 'Think of something they need or mentioned wanting', estimatedMinutes: 2 },
            { step: 2, action: 'Pick it up while you\'re out', estimatedMinutes: 15 },
            { step: 3, action: 'Bring it home and surprise them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 18,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts', 'gifts'],
          whySuggested: 'Picking up things they need shows you listen and pay attention to their needs.'
        },
        {
          title: 'Handle a bill or administrative task',
          description: `Take care of a bill, appointment, or other administrative task they need to do. This reduces their mental load.`,
          detailedSteps: [
            { step: 1, action: 'Identify a bill or task they need to handle', estimatedMinutes: 2 },
            { step: 2, action: 'Take care of it for them', estimatedMinutes: 10 },
            { step: 3, action: 'Let them know it\'s done', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 13,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Handling administrative tasks reduces their stress and mental load.'
        },
        {
          title: 'Do their laundry or fold their clothes',
          description: `Take care of their laundry or fold their clean clothes. This practical help shows you want to lighten their load.`,
          detailedSteps: [
            { step: 1, action: 'Check if they have laundry that needs doing', estimatedMinutes: 1 },
            { step: 2, action: 'Do the laundry or fold their clean clothes', estimatedMinutes: 20 },
            { step: 3, action: 'Put it away or leave it where they\'ll find it', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 23,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Taking care of laundry shows practical care and reduces their to-do list.'
        },
        {
          title: 'Clean their car or organize their space',
          description: `Tidy up their car or organize a space they use. This shows you care about their comfort and environment.`,
          detailedSteps: [
            { step: 1, action: 'Choose their car or a space they use', estimatedMinutes: 1 },
            { step: 2, action: 'Clean or organize it', estimatedMinutes: 25 },
            { step: 3, action: 'Let them discover it', tip: 'The surprise makes it more meaningful' }
          ],
          timeEstimateMinutes: 26,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Cleaning their space shows you care about their comfort and environment.'
        },
        {
          title: 'Prepare their work bag or things for tomorrow',
          description: `Get their things ready for the next day - work bag, clothes, lunch, etc. This helps them start their day smoothly.`,
          detailedSteps: [
            { step: 1, action: 'Think about what they need for tomorrow', estimatedMinutes: 2 },
            { step: 2, action: 'Prepare and organize it for them', estimatedMinutes: 10 },
            { step: 3, action: 'Leave it where they\'ll find it in the morning', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 13,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Preparing things for tomorrow helps them start their day smoothly and shows you care.'
        },
        {
          title: 'Fix something that\'s been broken',
          description: `Fix a small thing that\'s been broken or not working. Taking initiative shows you notice and care.`,
          detailedSteps: [
            { step: 1, action: 'Identify something that needs fixing', estimatedMinutes: 2 },
            { step: 2, action: 'Fix it or arrange to have it fixed', estimatedMinutes: 20 },
            { step: 3, action: 'Let them know it\'s done', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 23,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Fixing things shows you notice what needs attention and take initiative.'
        },
        {
          title: 'Take care of a pet or plant for them',
          description: `If they have pets or plants, take extra care of them. This shows you care about what matters to them.`,
          detailedSteps: [
            { step: 1, action: 'Think about what their pets or plants need', estimatedMinutes: 2 },
            { step: 2, action: 'Take care of it - feed, water, walk, etc.', estimatedMinutes: 15 },
            { step: 3, action: 'Maybe send a photo or let them know', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 18,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Caring for their pets or plants shows you care about what matters to them.'
        },
        {
          title: 'Handle a phone call or appointment for them',
          description: `Make a phone call or schedule an appointment they need. This reduces their mental load and shows you want to help.`,
          detailedSteps: [
            { step: 1, action: 'Identify a call or appointment they need to make', estimatedMinutes: 2 },
            { step: 2, action: 'Handle it for them', estimatedMinutes: 10 },
            { step: 3, action: 'Let them know the details', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 13,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Handling calls or appointments reduces their stress and mental load.'
        },
        {
          title: 'Organize or declutter a shared space',
          description: `Take time to organize or declutter a space you share. A tidy space reduces stress and shows you care.`,
          detailedSteps: [
            { step: 1, action: 'Choose a shared space to organize', estimatedMinutes: 1 },
            { step: 2, action: 'Organize or declutter it', estimatedMinutes: 30 },
            { step: 3, action: 'Let them discover the improvement', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 32,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Organizing shared spaces shows you care about your environment together.'
        },
        {
          title: 'Do yard work or outdoor maintenance',
          description: `Take care of outdoor tasks like yard work or maintenance. This shows you care about your shared space.`,
          detailedSteps: [
            { step: 1, action: 'Identify outdoor tasks that need doing', estimatedMinutes: 2 },
            { step: 2, action: 'Complete the yard work or maintenance', estimatedMinutes: 40 },
            { step: 3, action: 'Let them discover it', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 43,
          effortLevel: 'moderate',
          bestTiming: 'weekend',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Taking care of outdoor tasks shows you care about your shared space.'
        },
        {
          title: 'Set up something they\'ve been wanting to do',
          description: `Set up or prepare something they\'ve mentioned wanting to do. This shows you listen and take initiative.`,
          detailedSteps: [
            { step: 1, action: 'Think of something they\'ve mentioned wanting to do', estimatedMinutes: 2 },
            { step: 2, action: 'Set it up or prepare it for them', estimatedMinutes: 20 },
            { step: 3, action: 'Surprise them with it', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 23,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Setting up something they want shows you listen and take initiative.'
        },
        {
          title: 'Organize their closet or a drawer',
          description: `Tidy up their closet or organize a drawer they use. A clean, organized space reduces stress and shows care.`,
          detailedSteps: [
            { step: 1, action: 'Choose a closet or drawer to organize', estimatedMinutes: 2 },
            { step: 2, action: 'Organize it thoughtfully', estimatedMinutes: 25 },
            { step: 3, action: 'Let them discover the improvement', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 28,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Organizing their space shows care about their comfort and environment.'
        },
        {
          title: 'Put fresh sheets on the bed',
          description: `Change the bed sheets for them. Fresh sheets are comfortable and show you care about their rest.`,
          detailedSteps: [
            { step: 1, action: 'Get fresh sheets', estimatedMinutes: 2 },
            { step: 2, action: 'Change the bed sheets', estimatedMinutes: 10 },
            { step: 3, action: 'Maybe add a nice touch like fluffing pillows', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 14,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Fresh sheets show you care about their comfort and rest.'
        },
        {
          title: 'Fill up their car with gas',
          description: `If you use their car, fill it up with gas. This practical gesture shows care and reduces their mental load.`,
          detailedSteps: [
            { step: 1, action: 'Check if their car needs gas', estimatedMinutes: 1 },
            { step: 2, action: 'Fill it up for them', estimatedMinutes: 10 },
            { step: 3, action: 'Maybe leave a note or let them discover it', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 12,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Filling up their car shows practical care and reduces their mental load.'
        },
        {
          title: 'Take care of their plants or garden',
          description: `Water their plants or tend to their garden. Taking care of what they care about shows you notice and value it.`,
          detailedSteps: [
            { step: 1, action: 'Check what their plants or garden need', estimatedMinutes: 2 },
            { step: 2, action: 'Water, prune, or tend to them', estimatedMinutes: 15 },
            { step: 3, action: 'Maybe send them a photo or let them discover it', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 18,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Taking care of their plants shows you notice and value what matters to them.'
        },
        {
          title: 'Prepare their morning routine items',
          description: `Set out items they need for their morning routine. Helping them start the day smoothly shows care.`,
          detailedSteps: [
            { step: 1, action: 'Think about what they need for their morning routine', estimatedMinutes: 2 },
            { step: 2, action: 'Set out those items for them', estimatedMinutes: 5 },
            { step: 3, action: 'Leave them where they\'ll find them in the morning', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 8,
          effortLevel: 'minimal',
          bestTiming: 'evening',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Preparing their morning routine helps them start the day smoothly and shows care.'
        },
        {
          title: 'Handle their mail or packages',
          description: `Sort their mail or bring in their packages. Handling routine tasks shows you want to help.`,
          detailedSteps: [
            { step: 1, action: 'Check for mail or packages', estimatedMinutes: 1 },
            { step: 2, action: 'Sort the mail or bring in packages', estimatedMinutes: 5 },
            { step: 3, action: 'Leave them organized for when they get home', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 8,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Handling routine tasks shows you want to help and reduce their mental load.'
        },
        {
          title: 'Organize the fridge or pantry',
          description: `Tidy up the fridge or pantry. An organized space makes life easier and shows you care about shared spaces.`,
          detailedSteps: [
            { step: 1, action: 'Check what needs organizing in the fridge or pantry', estimatedMinutes: 2 },
            { step: 2, action: 'Organize it - group similar items, check dates, etc.', estimatedMinutes: 20 },
            { step: 3, action: 'Maybe throw away expired items', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 27,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Organizing shared spaces shows care about your home together.'
        },
        {
          title: 'Clean the bathroom',
          description: `Clean the bathroom - sink, mirror, toilet, etc. A clean bathroom is comfortable and shows care.`,
          detailedSteps: [
            { step: 1, action: 'Clean the sink and mirror', estimatedMinutes: 5 },
            { step: 2, action: 'Clean the toilet and floor', estimatedMinutes: 10 },
            { step: 3, action: 'Restock toilet paper or other essentials', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 17,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'A clean bathroom is comfortable and shows care about shared spaces.'
        },
        {
          title: 'Take out the recycling',
          description: `Handle the recycling before it builds up. Taking care of routine tasks shows you notice and want to help.`,
          detailedSteps: [
            { step: 1, action: 'Check if recycling needs to be taken out', estimatedMinutes: 1 },
            { step: 2, action: 'Take it out without mentioning it', estimatedMinutes: 5 },
            { step: 3, action: 'Maybe bring the bins back in', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 8,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Taking care of routine tasks shows you notice and want to help.'
        },
        {
          title: 'Clean their car',
          description: `Clean their car inside and out. A clean car is comfortable and shows you care about their space.`,
          detailedSteps: [
            { step: 1, action: 'Clean the inside - remove trash, vacuum, etc.', estimatedMinutes: 20 },
            { step: 2, action: 'Clean the outside if needed', estimatedMinutes: 15 },
            { step: 3, action: 'Maybe add an air freshener', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 37,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Cleaning their car shows care about their space and comfort.'
        },
        {
          title: 'Organize their workspace or desk',
          description: `Tidy up their workspace or desk. An organized workspace reduces stress and shows you care about their productivity.`,
          detailedSteps: [
            { step: 1, action: 'Check what needs organizing on their desk', estimatedMinutes: 2 },
            { step: 2, action: 'Organize it - group papers, tidy supplies, etc.', estimatedMinutes: 20 },
            { step: 3, action: 'Maybe add something nice like a plant or photo', estimatedMinutes: 3 }
          ],
          timeEstimateMinutes: 25,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'An organized workspace reduces stress and shows care about their productivity.'
        },
        {
          title: 'Make the bed',
          description: `Make the bed for them. A made bed makes the room feel more put together and shows care.`,
          detailedSteps: [
            { step: 1, action: 'Straighten the sheets and blankets', estimatedMinutes: 2 },
            { step: 2, action: 'Fluff the pillows', estimatedMinutes: 1 },
            { step: 3, action: 'Maybe add a decorative touch', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 4,
          effortLevel: 'minimal',
          bestTiming: 'morning',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'A made bed makes the room feel more put together and shows care.'
        },
        {
          title: 'Handle a return or exchange for them',
          description: `Take care of a return or exchange they need to do. Handling logistics shows you want to lighten their load.`,
          detailedSteps: [
            { step: 1, action: 'Identify what needs to be returned or exchanged', estimatedMinutes: 2 },
            { step: 2, action: 'Handle the return or exchange', estimatedMinutes: 25 },
            { step: 3, action: 'Let them know it\'s done', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 28,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Handling returns shows you want to lighten their load and help with logistics.'
        },
        {
          title: 'Organize the garage or storage area',
          description: `Tidy up the garage or a storage area. Organized storage makes life easier and shows care about shared spaces.`,
          detailedSteps: [
            { step: 1, action: 'Check what needs organizing', estimatedMinutes: 3 },
            { step: 2, action: 'Organize items - group similar things, label boxes, etc.', estimatedMinutes: 40 },
            { step: 3, action: 'Make sure everything is accessible', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 48,
          effortLevel: 'moderate',
          bestTiming: 'weekend',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Organizing storage shows care about shared spaces and makes life easier.'
        },
        {
          title: 'Clean the kitchen',
          description: `Do a thorough cleaning of the kitchen. A clean kitchen is comfortable and shows care about shared spaces.`,
          detailedSteps: [
            { step: 1, action: 'Wash dishes and put them away', estimatedMinutes: 15 },
            { step: 2, action: 'Clean counters, sink, and stove', estimatedMinutes: 15 },
            { step: 3, action: 'Maybe organize the fridge or pantry', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 40,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'A clean kitchen is comfortable and shows care about shared spaces.'
        },
        {
          title: 'Take care of something they\'ve been procrastinating',
          description: `Handle a task they\'ve been putting off. Taking initiative on something they\'ve been avoiding shows care.`,
          detailedSteps: [
            { step: 1, action: 'Think of a task they\'ve mentioned needing to do', estimatedMinutes: 2 },
            { step: 2, action: 'Handle it for them', estimatedMinutes: 30 },
            { step: 3, action: 'Let them know it\'s done', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 33,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Taking initiative on something they\'ve been avoiding shows care and reduces stress.'
        },
        {
          title: 'Organize a shared space',
          description: `Tidy up a shared space like the living room or entryway. Organized shared spaces show care about your home together.`,
          detailedSteps: [
            { step: 1, action: 'Choose a shared space to organize', estimatedMinutes: 1 },
            { step: 2, action: 'Tidy it up - put things away, organize, etc.', estimatedMinutes: 20 },
            { step: 3, action: 'Maybe add a nice touch like flowers or candles', estimatedMinutes: 3 }
          ],
          timeEstimateMinutes: 24,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Organizing shared spaces shows care about your home together.'
        },
        {
          title: 'Handle a repair or maintenance task',
          description: `Take care of a small repair or maintenance task. Handling practical issues shows care and reduces stress.`,
          detailedSteps: [
            { step: 1, action: 'Identify a repair or maintenance task that needs doing', estimatedMinutes: 2 },
            { step: 2, action: 'Handle it or arrange for someone to do it', estimatedMinutes: 30 },
            { step: 3, action: 'Let them know it\'s done', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 33,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Handling repairs shows care and reduces stress about practical issues.'
        },
        {
          title: 'Prepare their favorite breakfast',
          description: `Make their favorite breakfast for them. Food is love in action, and breakfast starts the day right.`,
          detailedSteps: [
            { step: 1, action: 'Think of their favorite breakfast', estimatedMinutes: 2 },
            { step: 2, action: 'Prepare it with care', estimatedMinutes: 15 },
            { step: 3, action: 'Serve it to them or set it up nicely', estimatedMinutes: 3 }
          ],
          timeEstimateMinutes: 20,
          effortLevel: 'low',
          bestTiming: 'morning',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Preparing their favorite breakfast starts their day right and shows care.'
        },
        {
          title: 'Take care of the pet if they have one',
          description: `Handle pet care tasks like feeding, walking, or cleaning up. Taking care of their pets shows you care about what matters to them.`,
          detailedSteps: [
            { step: 1, action: 'Check what the pet needs', estimatedMinutes: 1 },
            { step: 2, action: 'Take care of it - feed, walk, clean, etc.', estimatedMinutes: 20 },
            { step: 3, action: 'Maybe send them a photo or update', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 22,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['acts'],
          whySuggested: 'Taking care of their pets shows you care about what matters to them.'
        }
      ],
      quality_time: [
        {
          title: 'Have a device-free dinner together',
          description: `Share a meal with your partner with phones put away. Undivided attention is one of the greatest gifts you can give.`,
          detailedSteps: [
            { step: 1, action: 'Suggest a device-free dinner', estimatedMinutes: 1 },
            { step: 2, action: 'Both put phones in another room', estimatedMinutes: 2 },
            { step: 3, action: 'Share about your days and really listen', tip: 'Ask follow-up questions', estimatedMinutes: 45 }
          ],
          timeEstimateMinutes: 60,
          effortLevel: 'moderate',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Quality time is most meaningful when you\'re fully present with each other.'
        },
        {
          title: 'Go for a walk together',
          description: `Take a walk together, whether around the neighborhood or a favorite park. Walking side-by-side creates natural conversation and connection.`,
          detailedSteps: [
            { step: 1, action: 'Suggest going for a walk', tip: 'Pick a nice time of day', estimatedMinutes: 1 },
            { step: 2, action: 'Walk together at a comfortable pace', estimatedMinutes: 30 },
            { step: 3, action: 'Talk, listen, and enjoy being together', tip: 'Let conversation flow naturally' }
          ],
          timeEstimateMinutes: 35,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Walking together creates relaxed quality time and natural conversation.'
        },
        {
          title: 'Watch a show or movie together',
          description: `Pick something you both want to watch and enjoy it together. Shared entertainment creates connection and gives you things to discuss.`,
          detailedSteps: [
            { step: 1, action: 'Choose something you\'ll both enjoy', tip: 'Take turns or find mutual interest', estimatedMinutes: 5 },
            { step: 2, action: 'Settle in together and watch', tip: 'Put phones away', estimatedMinutes: 60 },
            { step: 3, action: 'Discuss it afterward', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 75,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Shared entertainment experiences create bonding and conversation topics.'
        },
        {
          title: 'Have a coffee or tea break together',
          description: `Take 20-30 minutes to sit together with drinks and just be together. Sometimes the simplest quality time is the most meaningful.`,
          detailedSteps: [
            { step: 1, action: 'Suggest taking a break together', estimatedMinutes: 1 },
            { step: 2, action: 'Make or get drinks for both of you', estimatedMinutes: 5 },
            { step: 3, action: 'Sit together and chat, or just enjoy quiet companionship', estimatedMinutes: 20 }
          ],
          timeEstimateMinutes: 26,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Simple moments of togetherness strengthen connection without requiring elaborate plans.'
        },
        {
          title: 'Cook a meal together',
          description: `Prepare a meal together. Cooking side-by-side creates connection and gives you something to focus on together.`,
          detailedSteps: [
            { step: 1, action: 'Choose a recipe you\'ll both enjoy', estimatedMinutes: 5 },
            { step: 2, action: 'Cook together, dividing tasks', tip: 'Work as a team', estimatedMinutes: 45 },
            { step: 3, action: 'Enjoy the meal you made together', estimatedMinutes: 30 }
          ],
          timeEstimateMinutes: 80,
          effortLevel: 'moderate',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time', 'acts'],
          whySuggested: 'Cooking together creates teamwork and shared accomplishment.'
        },
        {
          title: 'Play a board game or card game',
          description: `Spend time playing a game together. Games create fun, laughter, and friendly competition.`,
          detailedSteps: [
            { step: 1, action: 'Choose a game you both enjoy', estimatedMinutes: 2 },
            { step: 2, action: 'Set it up and play together', estimatedMinutes: 45 },
            { step: 3, action: 'Enjoy the time together', tip: 'Keep it light and fun' }
          ],
          timeEstimateMinutes: 47,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Playing games together creates fun and shared experiences.'
        },
        {
          title: 'Go for a drive together',
          description: `Take a drive together, maybe to a favorite spot or just around. Being in the car together creates natural conversation.`,
          detailedSteps: [
            { step: 1, action: 'Suggest going for a drive', estimatedMinutes: 1 },
            { step: 2, action: 'Drive together, maybe to a favorite spot or just around', estimatedMinutes: 30 },
            { step: 3, action: 'Talk and enjoy the time together', tip: 'Put phones away' }
          ],
          timeEstimateMinutes: 31,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Driving together creates relaxed quality time and natural conversation.'
        },
        {
          title: 'Do a puzzle together',
          description: `Work on a puzzle together. Puzzles require collaboration and create a shared focus.`,
          detailedSteps: [
            { step: 1, action: 'Get a puzzle you\'ll both enjoy', estimatedMinutes: 2 },
            { step: 2, action: 'Work on it together', tip: 'Take turns or work on different sections', estimatedMinutes: 60 },
            { step: 3, action: 'Enjoy the progress you make together', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 63,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Working on puzzles together creates collaboration and shared focus.'
        },
        {
          title: 'Have a picnic together',
          description: `Pack a simple picnic and go somewhere nice together. Picnics create relaxed, intimate quality time.`,
          detailedSteps: [
            { step: 1, action: 'Pack some simple food and drinks', estimatedMinutes: 10 },
            { step: 2, action: 'Go to a nice spot - park, beach, or even your backyard', estimatedMinutes: 15 },
            { step: 3, action: 'Enjoy the picnic together', estimatedMinutes: 45 }
          ],
          timeEstimateMinutes: 70,
          effortLevel: 'moderate',
          bestTiming: 'afternoon',
          loveLanguageAlignment: ['quality_time', 'acts'],
          whySuggested: 'Picnics create relaxed, intimate quality time in a beautiful setting.'
        },
        {
          title: 'Go to a farmers market or local market',
          description: `Browse a farmers market or local market together. Exploring together creates connection and shared experiences.`,
          detailedSteps: [
            { step: 1, action: 'Find a farmers market or local market', estimatedMinutes: 5 },
            { step: 2, action: 'Browse together, maybe pick up some things', estimatedMinutes: 45 },
            { step: 3, action: 'Enjoy the time exploring together', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 51,
          effortLevel: 'low',
          bestTiming: 'morning',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Exploring markets together creates shared experiences and connection.'
        },
        {
          title: 'Visit a bookstore or library together',
          description: `Browse a bookstore or library together. Sharing interests and discovering things together creates connection.`,
          detailedSteps: [
            { step: 1, action: 'Go to a bookstore or library', estimatedMinutes: 10 },
            { step: 2, action: 'Browse together, share recommendations', estimatedMinutes: 40 },
            { step: 3, action: 'Maybe pick out something for each other', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 60,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Browsing books together creates shared interests and connection.'
        },
        {
          title: 'Go stargazing together',
          description: `Find a spot with a good view of the sky and stargaze together. Quiet, peaceful activities create deep connection.`,
          detailedSteps: [
            { step: 1, action: 'Find a spot with a good view of the sky', estimatedMinutes: 10 },
            { step: 2, action: 'Bring blankets and maybe snacks', estimatedMinutes: 5 },
            { step: 3, action: 'Stargaze together, talk, and enjoy the quiet', estimatedMinutes: 60 }
          ],
          timeEstimateMinutes: 75,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Stargazing creates peaceful, intimate quality time together.'
        },
        {
          title: 'Have a breakfast date',
          description: `Start the day together with a special breakfast. Morning quality time sets a positive tone for the day.`,
          detailedSteps: [
            { step: 1, action: 'Plan a special breakfast - maybe make it or go out', estimatedMinutes: 5 },
            { step: 2, action: 'Enjoy breakfast together, put phones away', estimatedMinutes: 45 },
            { step: 3, action: 'Talk and connect before the day gets busy', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 51,
          effortLevel: 'low',
          bestTiming: 'morning',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Breakfast dates create quality time before the day gets busy.'
        },
        {
          title: 'Go to a museum or art gallery',
          description: `Visit a museum or art gallery together. Cultural activities create conversation and shared experiences.`,
          detailedSteps: [
            { step: 1, action: 'Find a museum or gallery you\'d both enjoy', estimatedMinutes: 5 },
            { step: 2, action: 'Visit together, discuss what you see', estimatedMinutes: 90 },
            { step: 3, action: 'Maybe grab coffee or lunch afterward', estimatedMinutes: 30 }
          ],
          timeEstimateMinutes: 125,
          effortLevel: 'low',
          bestTiming: 'afternoon',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Visiting museums together creates cultural connection and conversation.'
        },
        {
          title: 'Have a technology-free evening',
          description: `Spend an evening together with all devices put away. Undistracted time creates deeper connection.`,
          detailedSteps: [
            { step: 1, action: 'Agree to put all devices away', estimatedMinutes: 1 },
            { step: 2, action: 'Spend the evening together - talk, play games, read, etc.', estimatedMinutes: 120 },
            { step: 3, action: 'Enjoy the undistracted time together', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 122,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Technology-free time creates deeper, more meaningful connection.'
        },
        {
          title: 'Go to a local event or festival',
          description: `Attend a local event, festival, or community gathering together. Shared experiences create lasting memories.`,
          detailedSteps: [
            { step: 1, action: 'Find a local event or festival', estimatedMinutes: 5 },
            { step: 2, action: 'Attend together, explore and enjoy', estimatedMinutes: 90 },
            { step: 3, action: 'Talk about what you experienced', estimatedMinutes: 15 }
          ],
          timeEstimateMinutes: 110,
          effortLevel: 'low',
          bestTiming: 'afternoon',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Attending events together creates shared experiences and memories.'
        },
        {
          title: 'Have a conversation with intentional questions',
          description: `Set aside time for a deeper conversation using intentional questions. Deep conversations strengthen emotional connection.`,
          detailedSteps: [
            { step: 1, action: 'Find a quiet time and place', estimatedMinutes: 2 },
            { step: 2, action: 'Ask each other deeper questions', tip: 'Use conversation starter cards or your own questions', estimatedMinutes: 60 },
            { step: 3, action: 'Really listen and share', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 63,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Deep conversations strengthen emotional intimacy and connection.'
        },
        {
          title: 'Go to a park and just sit together',
          description: `Find a nice park and just sit together. Sometimes the simplest quality time - just being together - is the most meaningful.`,
          detailedSteps: [
            { step: 1, action: 'Go to a nice park or outdoor spot', estimatedMinutes: 10 },
            { step: 2, action: 'Sit together, maybe bring a blanket', estimatedMinutes: 45 },
            { step: 3, action: 'Talk, people-watch, or just enjoy quiet togetherness', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 56,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Simple time together in nature creates peaceful connection.'
        },
        {
          title: 'Do a craft or creative project together',
          description: `Work on a craft or creative project together. Creating together builds connection and shared accomplishment.`,
          detailedSteps: [
            { step: 1, action: 'Choose a craft or project you\'ll both enjoy', estimatedMinutes: 5 },
            { step: 2, action: 'Work on it together', estimatedMinutes: 60 },
            { step: 3, action: 'Enjoy what you created together', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 70,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Creating together builds connection and shared accomplishment.'
        },
        {
          title: 'Have a deep conversation over drinks',
          description: `Set aside time for a meaningful conversation over drinks. Deep conversations strengthen emotional intimacy.`,
          detailedSteps: [
            { step: 1, action: 'Suggest having drinks and a conversation', estimatedMinutes: 1 },
            { step: 2, action: 'Get drinks for both of you', estimatedMinutes: 5 },
            { step: 3, action: 'Sit together and have a meaningful conversation', tip: 'Put phones away and really listen', estimatedMinutes: 60 }
          ],
          timeEstimateMinutes: 66,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Deep conversations strengthen emotional intimacy and connection.'
        },
        {
          title: 'Go to a bookstore and browse together',
          description: `Browse a bookstore together and share recommendations. Sharing interests and discovering things together creates connection.`,
          detailedSteps: [
            { step: 1, action: 'Go to a bookstore', estimatedMinutes: 10 },
            { step: 2, action: 'Browse together, share recommendations', estimatedMinutes: 45 },
            { step: 3, action: 'Maybe pick out books for each other', estimatedMinutes: 15 }
          ],
          timeEstimateMinutes: 70,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time', 'gifts'],
          whySuggested: 'Browsing books together creates shared interests and connection.'
        },
        {
          title: 'Have a slow morning together',
          description: `Spend a slow, relaxed morning together with no agenda. Simple, unhurried time strengthens connection.`,
          detailedSteps: [
            { step: 1, action: 'Block out a morning with no plans', estimatedMinutes: 1 },
            { step: 2, action: 'Enjoy slow time together - maybe coffee, breakfast, talking', estimatedMinutes: 120 },
            { step: 3, action: 'Let the morning unfold naturally', tip: 'No agenda, just being together' }
          ],
          timeEstimateMinutes: 121,
          effortLevel: 'low',
          bestTiming: 'morning',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Slow, unhurried mornings create peaceful connection without pressure.'
        },
        {
          title: 'Watch the sunset together',
          description: `Find a spot to watch the sunset together. Beautiful moments shared create lasting memories.`,
          detailedSteps: [
            { step: 1, action: 'Find a spot with a good sunset view', estimatedMinutes: 10 },
            { step: 2, action: 'Arrive before sunset', estimatedMinutes: 30 },
            { step: 3, action: 'Watch the sunset together, talk, or just enjoy', estimatedMinutes: 30 }
          ],
          timeEstimateMinutes: 70,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Sharing beautiful moments like sunsets creates lasting memories.'
        },
        {
          title: 'Go to a coffee shop and work side by side',
          description: `Go to a coffee shop and work or study side by side. Being together even while doing separate activities creates connection.`,
          detailedSteps: [
            { step: 1, action: 'Find a nice coffee shop', estimatedMinutes: 5 },
            { step: 2, action: 'Get drinks and sit together', estimatedMinutes: 10 },
            { step: 3, action: 'Work or study side by side', tip: 'Share moments, but do your own thing too', estimatedMinutes: 90 }
          ],
          timeEstimateMinutes: 105,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Being together while doing separate activities creates comfortable companionship.'
        },
        {
          title: 'Have a conversation while cooking together',
          description: `Cook together and have a meaningful conversation. Cooking side by side creates natural connection.`,
          detailedSteps: [
            { step: 1, action: 'Choose a recipe you\'ll both enjoy making', estimatedMinutes: 5 },
            { step: 2, action: 'Cook together, dividing tasks', tip: 'Use this time to really talk and connect', estimatedMinutes: 60 },
            { step: 3, action: 'Enjoy the meal you made together', estimatedMinutes: 30 }
          ],
          timeEstimateMinutes: 95,
          effortLevel: 'moderate',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time', 'acts'],
          whySuggested: 'Cooking together creates natural conversation and shared accomplishment.'
        },
        {
          title: 'Go for a bike ride together',
          description: `Take a bike ride together. Active quality time creates fun and connection.`,
          detailedSteps: [
            { step: 1, action: 'Find a nice route for biking', estimatedMinutes: 5 },
            { step: 2, action: 'Ride together at a comfortable pace', estimatedMinutes: 45 },
            { step: 3, action: 'Maybe stop somewhere nice along the way', estimatedMinutes: 15 }
          ],
          timeEstimateMinutes: 65,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Active quality time creates fun and connection through shared activity.'
        },
        {
          title: 'Have a breakfast date at a diner or cafe',
          description: `Go out for breakfast together at a diner or cafe. Morning dates are special and start the day right.`,
          detailedSteps: [
            { step: 1, action: 'Find a nice diner or cafe', estimatedMinutes: 5 },
            { step: 2, action: 'Go out for breakfast together', tip: 'Put phones away and really talk', estimatedMinutes: 60 },
            { step: 3, action: 'Take your time and enjoy each other\'s company', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 66,
          effortLevel: 'low',
          bestTiming: 'morning',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Breakfast dates start the day right and create special morning time together.'
        },
        {
          title: 'Visit a new neighborhood or area together',
          description: `Explore a new neighborhood or area together. Discovering new places creates shared adventure.`,
          detailedSteps: [
            { step: 1, action: 'Choose a neighborhood or area you haven\'t explored', estimatedMinutes: 5 },
            { step: 2, action: 'Walk around and explore together', estimatedMinutes: 60 },
            { step: 3, action: 'Maybe stop at a cafe or shop you discover', estimatedMinutes: 20 }
          ],
          timeEstimateMinutes: 85,
          effortLevel: 'low',
          bestTiming: 'afternoon',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Exploring new places together creates shared adventure and discovery.'
        },
        {
          title: 'Have a game night at home',
          description: `Play board games or card games together at home. Game nights create fun and friendly competition.`,
          detailedSteps: [
            { step: 1, action: 'Choose games you\'ll both enjoy', estimatedMinutes: 3 },
            { step: 2, action: 'Set up snacks and drinks', estimatedMinutes: 5 },
            { step: 3, action: 'Play together, have fun, and enjoy the competition', estimatedMinutes: 90 }
          ],
          timeEstimateMinutes: 98,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Game nights create fun and friendly competition together.'
        },
        {
          title: 'Go to a local market or farmers market',
          description: `Browse a farmers market or local market together. Exploring markets creates shared experiences and connection.`,
          detailedSteps: [
            { step: 1, action: 'Find a farmers market or local market', estimatedMinutes: 5 },
            { step: 2, action: 'Browse together, maybe pick up some things', estimatedMinutes: 50 },
            { step: 3, action: 'Maybe grab coffee or food there', estimatedMinutes: 20 }
          ],
          timeEstimateMinutes: 75,
          effortLevel: 'low',
          bestTiming: 'morning',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Exploring markets together creates shared experiences and connection.'
        },
        {
          title: 'Have a conversation in the car',
          description: `Take a drive together just to talk. Car conversations create natural, focused time for connection.`,
          detailedSteps: [
            { step: 1, action: 'Suggest going for a drive to talk', estimatedMinutes: 1 },
            { step: 2, action: 'Drive together, maybe to a nice spot', estimatedMinutes: 20 },
            { step: 3, action: 'Park somewhere and continue the conversation', tip: 'No distractions, just talking', estimatedMinutes: 60 }
          ],
          timeEstimateMinutes: 81,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Car conversations create natural, focused time for connection.'
        },
        {
          title: 'Go to a local park and sit together',
          description: `Find a nice park and just sit together. Simple time in nature creates peaceful connection.`,
          detailedSteps: [
            { step: 1, action: 'Go to a nice park', estimatedMinutes: 10 },
            { step: 2, action: 'Find a nice spot to sit', estimatedMinutes: 2 },
            { step: 3, action: 'Sit together, talk, people-watch, or just enjoy quiet companionship', estimatedMinutes: 60 }
          ],
          timeEstimateMinutes: 72,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Simple time in nature creates peaceful connection and relaxation.'
        },
        {
          title: 'Have a lunch date together',
          description: `Go out for lunch together. Midday dates break up the day and create special time.`,
          detailedSteps: [
            { step: 1, action: 'Choose a place you\'ll both enjoy', estimatedMinutes: 5 },
            { step: 2, action: 'Go out for lunch together', tip: 'Put phones away and really connect', estimatedMinutes: 60 },
            { step: 3, action: 'Take your time and enjoy each other\'s company', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 66,
          effortLevel: 'low',
          bestTiming: 'afternoon',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Lunch dates break up the day and create special midday time together.'
        },
        {
          title: 'Do a home workout together',
          description: `Do a workout together at home. Exercising together creates shared accomplishment and energy.`,
          detailedSteps: [
            { step: 1, action: 'Choose a workout you\'ll both enjoy', estimatedMinutes: 3 },
            { step: 2, action: 'Do it together', estimatedMinutes: 30 },
            { step: 3, action: 'Maybe stretch together afterward', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 43,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Exercising together creates shared accomplishment and positive energy.'
        },
        {
          title: 'Go window shopping together',
          description: `Browse shops together without buying anything. Window shopping creates relaxed exploration and connection.`,
          detailedSteps: [
            { step: 1, action: 'Find an area with interesting shops', estimatedMinutes: 5 },
            { step: 2, action: 'Browse together, share opinions, dream together', estimatedMinutes: 60 },
            { step: 3, action: 'Maybe stop for coffee or ice cream', estimatedMinutes: 15 }
          ],
          timeEstimateMinutes: 80,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Window shopping creates relaxed exploration and connection without pressure.'
        },
        {
          title: 'Have a conversation while gardening together',
          description: `Garden or do yard work together while talking. Working side by side creates natural conversation.`,
          detailedSteps: [
            { step: 1, action: 'Choose gardening or yard work tasks', estimatedMinutes: 3 },
            { step: 2, action: 'Work together while talking', tip: 'Use this time to really connect', estimatedMinutes: 60 },
            { step: 3, action: 'Maybe take breaks to appreciate what you\'ve done', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 68,
          effortLevel: 'moderate',
          bestTiming: 'afternoon',
          loveLanguageAlignment: ['quality_time', 'acts'],
          whySuggested: 'Working side by side creates natural conversation and shared accomplishment.'
        }
      ],
      thoughtful_gifts: [
        {
          title: `Get your partner's favorite snack`,
          description: `Pick up something they love next time you're out. Small thoughtful gestures show you pay attention to what makes them happy.`,
          detailedSteps: [
            { step: 1, action: 'Think of a treat or snack they enjoy', estimatedMinutes: 2 },
            { step: 2, action: 'Pick it up next time you\'re at the store', estimatedMinutes: 15 },
            { step: 3, action: 'Surprise them with it', tip: 'Say "I saw this and thought of you"' }
          ],
          timeEstimateMinutes: 20,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Small gifts show thoughtfulness without requiring much time or money.'
        },
        {
          title: 'Pick flowers or a small plant',
          description: `Bring home flowers or a small plant they would like. The gesture shows you were thinking of them while you were away.`,
          detailedSteps: [
            { step: 1, action: 'Stop by a flower shop or grocery store', estimatedMinutes: 10 },
            { step: 2, action: 'Choose something you think they\'d appreciate', tip: 'Consider their favorite colors or flowers', estimatedMinutes: 5 },
            { step: 3, action: 'Present it to them with a smile', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 16,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Flowers are a classic way to show you were thinking of them.'
        },
        {
          title: 'Get them something small from a place you visited',
          description: `If you went somewhere without them, bring back a small token - even a postcard or local treat. It shows you thought of them.`,
          detailedSteps: [
            { step: 1, action: 'While you\'re out, look for something small they\'d like', estimatedMinutes: 5 },
            { step: 2, action: 'Pick something that represents where you were or what you did', estimatedMinutes: 5 },
            { step: 3, action: 'Give it to them and share a bit about your experience', estimatedMinutes: 3 }
          ],
          timeEstimateMinutes: 13,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Small souvenirs show you thought of them even when you were apart.'
        },
        {
          title: 'Leave them a small surprise on their desk or workspace',
          description: `Place something thoughtful where they\'ll find it at work or home. Small surprises brighten their day unexpectedly.`,
          detailedSteps: [
            { step: 1, action: 'Choose a small gift or treat they\'d enjoy', estimatedMinutes: 2 },
            { step: 2, action: 'Place it where they\'ll discover it', tip: 'Their desk, workspace, or a spot they frequent', estimatedMinutes: 2 },
            { step: 3, action: 'Maybe add a small note', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 6,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Surprise gifts discovered during the day create unexpected moments of joy.'
        },
        {
          title: 'Get them a book they\'d enjoy',
          description: `Pick out a book you think they\'d like. Thoughtful gifts show you know their interests and want to share something meaningful.`,
          detailedSteps: [
            { step: 1, action: 'Think about books or genres they enjoy', estimatedMinutes: 2 },
            { step: 2, action: 'Find a book you think they\'d like', estimatedMinutes: 15 },
            { step: 3, action: 'Give it to them with a note about why you chose it', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 19,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Books show you know their interests and want to share something meaningful.'
        },
        {
          title: 'Get them a small item related to their hobby',
          description: `Pick up something small related to a hobby or interest they have. These gifts show you pay attention to what they love.`,
          detailedSteps: [
            { step: 1, action: 'Think about their hobbies or interests', estimatedMinutes: 2 },
            { step: 2, action: 'Find a small item related to that hobby', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them with a note', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 24,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Gifts related to their hobbies show you pay attention to what they love.'
        },
        {
          title: 'Make them a small handmade gift',
          description: `Create something small for them - a card, a drawing, or something simple. Handmade gifts show extra thought and care.`,
          detailedSteps: [
            { step: 1, action: 'Think of something simple you can make', estimatedMinutes: 2 },
            { step: 2, action: 'Create it with care', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them with a note', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 24,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Handmade gifts show extra thought and care.'
        },
        {
          title: 'Get them a magazine or subscription they\'d enjoy',
          description: `Pick up a magazine or start a small subscription for something they\'re interested in. Ongoing gifts show continued thoughtfulness.`,
          detailedSteps: [
            { step: 1, action: 'Think about magazines or subscriptions they\'d enjoy', estimatedMinutes: 2 },
            { step: 2, action: 'Get it or set up the subscription', estimatedMinutes: 10 },
            { step: 3, action: 'Give it to them or let them know about it', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 13,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Magazines or subscriptions show continued thoughtfulness.'
        },
        {
          title: 'Get them something for their workspace',
          description: `Pick up something small for their desk or workspace - a plant, a nice pen, or something decorative.`,
          detailedSteps: [
            { step: 1, action: 'Think about what would make their workspace nicer', estimatedMinutes: 2 },
            { step: 2, action: 'Find something small and thoughtful', estimatedMinutes: 15 },
            { step: 3, action: 'Place it on their desk or give it to them', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 19,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts', 'acts'],
          whySuggested: 'Gifts for their workspace show you care about their comfort and environment.'
        },
        {
          title: 'Get them a nice coffee or tea they\'d enjoy',
          description: `Pick up a special coffee, tea, or beverage they\'d like. Small treats show you think about what they enjoy.`,
          detailedSteps: [
            { step: 1, action: 'Think about their beverage preferences', estimatedMinutes: 1 },
            { step: 2, action: 'Find something special they\'d enjoy', estimatedMinutes: 10 },
            { step: 3, action: 'Give it to them or prepare it for them', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 13,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Special beverages show you think about what they enjoy.'
        },
        {
          title: 'Get them a small piece of art or decoration',
          description: `Pick up a small piece of art, print, or decoration you think they\'d like. These gifts show you know their style.`,
          detailedSteps: [
            { step: 1, action: 'Think about their style and what they\'d like', estimatedMinutes: 2 },
            { step: 2, action: 'Find something small that matches their style', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them with a note', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 24,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Art or decorations show you know their style and taste.'
        },
        {
          title: 'Get them something for a hobby they want to start',
          description: `If they\'ve mentioned wanting to try something new, get them a small starter item. This shows you listen and support their interests.`,
          detailedSteps: [
            { step: 1, action: 'Think about hobbies they\'ve mentioned wanting to try', estimatedMinutes: 2 },
            { step: 2, action: 'Find a small starter item for that hobby', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them with encouragement', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 24,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Gifts for new hobbies show you listen and support their interests.'
        },
        {
          title: 'Get them a small item from a place that\'s meaningful',
          description: `Pick up something from a place that\'s meaningful to your relationship - where you met, first date, etc.`,
          detailedSteps: [
            { step: 1, action: 'Think about meaningful places in your relationship', estimatedMinutes: 2 },
            { step: 2, action: 'Get something small from that place', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them with a note about why', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 24,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Gifts from meaningful places show you cherish your shared memories.'
        },
        {
          title: 'Get them a small item they mentioned wanting',
          description: `If they\'ve mentioned wanting something small, get it for them. This shows you listen and remember what they say.`,
          detailedSteps: [
            { step: 1, action: 'Think about small things they\'ve mentioned wanting', estimatedMinutes: 2 },
            { step: 2, action: 'Get it for them', estimatedMinutes: 15 },
            { step: 3, action: 'Surprise them with it', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 18,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Getting something they mentioned shows you listen and remember what they say.'
        },
        {
          title: 'Get them a small item for their favorite activity',
          description: `Pick up something small that enhances their favorite activity - a new accessory, tool, or item.`,
          detailedSteps: [
            { step: 1, action: 'Think about their favorite activities', estimatedMinutes: 2 },
            { step: 2, action: 'Find something small that enhances that activity', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them with a note', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 24,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Gifts for their favorite activities show you support what they love.'
        },
        {
          title: 'Get them a small item that matches their style',
          description: `Pick up something small that matches their personal style - clothing, accessories, or decor.`,
          detailedSteps: [
            { step: 1, action: 'Think about their personal style', estimatedMinutes: 2 },
            { step: 2, action: 'Find something small that matches', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 23,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Gifts that match their style show you know and appreciate their taste.'
        },
        {
          title: 'Get them a small item for their collection',
          description: `If they collect something, add to their collection. This shows you pay attention to their interests.`,
          detailedSteps: [
            { step: 1, action: 'Think about what they collect', estimatedMinutes: 1 },
            { step: 2, action: 'Find something to add to their collection', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 22,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Adding to their collection shows you pay attention to their interests.'
        },
        {
          title: 'Get them a small item that solves a problem they have',
          description: `If they\'ve mentioned a small problem, get something that solves it. Practical gifts show you listen and care.`,
          detailedSteps: [
            { step: 1, action: 'Think about small problems they\'ve mentioned', estimatedMinutes: 2 },
            { step: 2, action: 'Find something that solves it', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them with a note', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 24,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts', 'acts'],
          whySuggested: 'Practical gifts that solve problems show you listen and care.'
        },
        {
          title: 'Get them a candle with a scent they love',
          description: `Pick out a candle with a scent they love or would enjoy. Scented candles create ambiance and show thoughtfulness.`,
          detailedSteps: [
            { step: 1, action: 'Think about scents they like or enjoy', estimatedMinutes: 2 },
            { step: 2, action: 'Find a candle with that scent', estimatedMinutes: 15 },
            { step: 3, action: 'Give it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 18,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Scented candles show thoughtfulness and create ambiance they\'ll enjoy.'
        },
        {
          title: 'Get them a book they\'d enjoy',
          description: `Pick out a book you think they\'d enjoy reading. Books show you know their interests and want to share experiences.`,
          detailedSteps: [
            { step: 1, action: 'Think about books or genres they like', estimatedMinutes: 2 },
            { step: 2, action: 'Find a book you think they\'d enjoy', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them, maybe with a note inside', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 24,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts', 'quality_time'],
          whySuggested: 'Books show you know their interests and want to share experiences.'
        },
        {
          title: 'Get them a coffee or tea they love',
          description: `Pick up their favorite coffee or tea. Simple gifts show you notice what they enjoy.`,
          detailedSteps: [
            { step: 1, action: 'Think about their favorite coffee or tea', estimatedMinutes: 1 },
            { step: 2, action: 'Pick it up at a store', estimatedMinutes: 15 },
            { step: 3, action: 'Give it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 17,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Simple gifts like favorite drinks show you notice what they enjoy.'
        },
        {
          title: 'Get them something cozy',
          description: `Pick out something cozy like socks, a blanket, or a sweater. Cozy items show care for their comfort.`,
          detailedSteps: [
            { step: 1, action: 'Think about cozy items they might need or enjoy', estimatedMinutes: 2 },
            { step: 2, action: 'Find something cozy that suits them', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 23,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Cozy items show care for their comfort and wellbeing.'
        },
        {
          title: 'Get them a small item from a trip or place',
          description: `If you went somewhere, bring back a small item for them. Souvenirs show you think of them when apart.`,
          detailedSteps: [
            { step: 1, action: 'While on a trip or at a place, look for something they\'d like', estimatedMinutes: 5 },
            { step: 2, action: 'Get a small souvenir for them', estimatedMinutes: 10 },
            { step: 3, action: 'Give it to them when you see them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 16,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Souvenirs show you think of them when you\'re apart and want to share experiences.'
        },
        {
          title: 'Get them a magazine or subscription they\'d enjoy',
          description: `Pick up a magazine they\'d enjoy or get them a subscription. Magazines show you know their interests.`,
          detailedSteps: [
            { step: 1, action: 'Think about magazines or topics they enjoy', estimatedMinutes: 2 },
            { step: 2, action: 'Find a magazine they\'d like', estimatedMinutes: 15 },
            { step: 3, action: 'Give it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 18,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Magazines show you know their interests and want to share them.'
        },
        {
          title: 'Get them a small item for their hobby',
          description: `Pick out something small related to their hobby. Gifts related to hobbies show you support their interests.`,
          detailedSteps: [
            { step: 1, action: 'Think about their hobby and what they might need', estimatedMinutes: 2 },
            { step: 2, action: 'Find something small related to that hobby', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 23,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Gifts related to hobbies show you support their interests and passions.'
        },
        {
          title: 'Get them a small item that matches their interests',
          description: `Pick out something small that relates to their interests. Gifts related to interests show you pay attention.`,
          detailedSteps: [
            { step: 1, action: 'Think about their interests', estimatedMinutes: 2 },
            { step: 2, action: 'Find something small that matches', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 23,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Gifts related to interests show you pay attention to what matters to them.'
        },
        {
          title: 'Get them a small item for their workspace',
          description: `Pick out something small for their workspace or desk. Workspace items show care for their productivity.`,
          detailedSteps: [
            { step: 1, action: 'Think about something that would improve their workspace', estimatedMinutes: 2 },
            { step: 2, action: 'Find something small for their desk or workspace', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 23,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts', 'acts'],
          whySuggested: 'Workspace items show care for their productivity and comfort.'
        },
        {
          title: 'Get them a small item from their favorite store',
          description: `Pick out something small from their favorite store. Shopping at their favorite place shows you know their taste.`,
          detailedSteps: [
            { step: 1, action: 'Think about their favorite store', estimatedMinutes: 1 },
            { step: 2, action: 'Go there and find something small they\'d like', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 22,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Shopping at their favorite store shows you know their taste and preferences.'
        },
        {
          title: 'Get them a small item that\'s nostalgic',
          description: `Pick out something that reminds them of a memory or time you share. Nostalgic gifts show you cherish memories.`,
          detailedSteps: [
            { step: 1, action: 'Think about a shared memory or time', estimatedMinutes: 2 },
            { step: 2, action: 'Find something that relates to that memory', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them and explain the connection', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 24,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts', 'words'],
          whySuggested: 'Nostalgic gifts show you cherish memories and shared experiences.'
        },
        {
          title: 'Get them a small item that\'s practical',
          description: `Pick out something practical they need or would use. Practical gifts show you notice their needs.`,
          detailedSteps: [
            { step: 1, action: 'Think about practical items they might need', estimatedMinutes: 2 },
            { step: 2, action: 'Find something practical they\'d use', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 23,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts', 'acts'],
          whySuggested: 'Practical gifts show you notice their needs and want to help.'
        },
        {
          title: 'Get them a small item that\'s funny',
          description: `Pick out something funny or silly that fits your inside jokes. Funny gifts show shared humor and joy.`,
          detailedSteps: [
            { step: 1, action: 'Think about your inside jokes or funny moments', estimatedMinutes: 2 },
            { step: 2, action: 'Find something funny that relates', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them and enjoy the laugh together', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 24,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts', 'quality_time'],
          whySuggested: 'Funny gifts show shared humor and create joy together.'
        },
        {
          title: 'Get them a small item that\'s thoughtful',
          description: `Pick out something thoughtful that shows you know them. Thoughtful gifts show deep care and attention.`,
          detailedSteps: [
            { step: 1, action: 'Think about what would be meaningful to them', estimatedMinutes: 3 },
            { step: 2, action: 'Find something thoughtful that shows you know them', estimatedMinutes: 25 },
            { step: 3, action: 'Give it to them with a note explaining why', estimatedMinutes: 3 }
          ],
          timeEstimateMinutes: 31,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts', 'words'],
          whySuggested: 'Thoughtful gifts show deep care and attention to who they are.'
        },
        {
          title: 'Get them a small item that\'s personalized',
          description: `Pick out or create something personalized for them. Personalized gifts show extra thought and care.`,
          detailedSteps: [
            { step: 1, action: 'Think about how to personalize something', estimatedMinutes: 3 },
            { step: 2, action: 'Find or create something personalized', estimatedMinutes: 30 },
            { step: 3, action: 'Give it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 34,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Personalized gifts show extra thought and care about who they are.'
        },
        {
          title: 'Get them a small item that\'s seasonal',
          description: `Pick out something seasonal that fits the time of year. Seasonal gifts show you notice and celebrate moments.`,
          detailedSteps: [
            { step: 1, action: 'Think about what\'s seasonal right now', estimatedMinutes: 2 },
            { step: 2, action: 'Find something seasonal they\'d enjoy', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 23,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Seasonal gifts show you notice and celebrate the moment.'
        },
        {
          title: 'Get them a small item that\'s eco-friendly',
          description: `Pick out something eco-friendly if that matters to them. Eco-friendly gifts show you respect their values.`,
          detailedSteps: [
            { step: 1, action: 'Think about eco-friendly items they might appreciate', estimatedMinutes: 2 },
            { step: 2, action: 'Find something eco-friendly', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 23,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Eco-friendly gifts show you respect their values and care about what matters to them.'
        },
        {
          title: 'Get them a small item that\'s from a local business',
          description: `Pick out something from a local business they support or would appreciate. Supporting local shows care for their community.`,
          detailedSteps: [
            { step: 1, action: 'Think about local businesses they support or would appreciate', estimatedMinutes: 2 },
            { step: 2, action: 'Find something from a local business', estimatedMinutes: 20 },
            { step: 3, action: 'Give it to them', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 23,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Supporting local businesses shows care for their community and values.'
        }
      ],
      physical_touch: [
        {
          title: 'Give a shoulder massage',
          description: `Offer your partner a gentle shoulder massage. Physical touch is a powerful way to show care and help them relax.`,
          detailedSteps: [
            { step: 1, action: 'Ask if they\'d like a shoulder massage', estimatedMinutes: 1 },
            { step: 2, action: 'Massage their shoulders and neck for 5-10 minutes', tip: 'Ask about pressure preference', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 15,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Physical touch helps them relax and feel cared for after a long day.'
        },
        {
          title: 'Hold hands while walking or sitting',
          description: `Simple physical connection through hand-holding. It's a gentle way to maintain closeness throughout the day.`,
          detailedSteps: [
            { step: 1, action: 'Reach for their hand when walking together', estimatedMinutes: 1 },
            { step: 2, action: 'Hold it naturally and comfortably', tip: 'Don\'t force it if they\'re doing something', estimatedMinutes: 15 }
          ],
          timeEstimateMinutes: 16,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Hand-holding is a simple but powerful way to maintain physical connection.'
        },
        {
          title: 'Give them a long hug',
          description: `Offer a genuine, longer hug - not just a quick peck. Physical affection releases oxytocin and strengthens bonds.`,
          detailedSteps: [
            { step: 1, action: 'Initiate a hug when you greet them or say goodbye', estimatedMinutes: 1 },
            { step: 2, action: 'Hold it for 10-20 seconds', tip: 'Let it be meaningful, not rushed', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Longer hugs release bonding hormones and create deeper connection.'
        },
        {
          title: 'Sit close together on the couch',
          description: `Simply be physically close while doing other activities. Sometimes just being near each other is meaningful touch.`,
          detailedSteps: [
            { step: 1, action: 'Sit next to them instead of across the room', estimatedMinutes: 1 },
            { step: 2, action: 'Let your legs or shoulders touch, or put an arm around them', estimatedMinutes: 30 }
          ],
          timeEstimateMinutes: 31,
          effortLevel: 'minimal',
          bestTiming: 'evening',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Physical proximity even during other activities maintains connection.'
        },
        {
          title: 'Give them a foot massage',
          description: `Offer a foot massage after a long day. Foot massages are relaxing and show you want to help them unwind.`,
          detailedSteps: [
            { step: 1, action: 'Ask if they\'d like a foot massage', estimatedMinutes: 1 },
            { step: 2, action: 'Massage their feet for 10-15 minutes', tip: 'Use lotion and ask about pressure', estimatedMinutes: 15 }
          ],
          timeEstimateMinutes: 16,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Foot massages are relaxing and show you want to help them unwind.'
        },
        {
          title: 'Put your arm around them',
          description: `Put your arm around them when sitting together. Simple physical contact maintains connection and closeness.`,
          detailedSteps: [
            { step: 1, action: 'When sitting together, put your arm around them', estimatedMinutes: 1 },
            { step: 2, action: 'Let it be natural and comfortable', estimatedMinutes: 30 }
          ],
          timeEstimateMinutes: 31,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Putting your arm around them maintains physical connection and closeness.'
        },
        {
          title: 'Give them a back scratch or rub',
          description: `Offer a gentle back scratch or rub. This simple touch can be very relaxing and comforting.`,
          detailedSteps: [
            { step: 1, action: 'Ask if they\'d like a back scratch or rub', estimatedMinutes: 1 },
            { step: 2, action: 'Give them a gentle back scratch or rub', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 11,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Back scratches or rubs are simple but very relaxing and comforting.'
        },
        {
          title: 'Cuddle while watching something',
          description: `Cuddle together while watching a show or movie. Physical closeness during shared activities strengthens bonds.`,
          detailedSteps: [
            { step: 1, action: 'Sit close together while watching', estimatedMinutes: 1 },
            { step: 2, action: 'Cuddle - put your arm around them or lean against each other', estimatedMinutes: 60 }
          ],
          timeEstimateMinutes: 61,
          effortLevel: 'minimal',
          bestTiming: 'evening',
          loveLanguageAlignment: ['touch', 'quality_time'],
          whySuggested: 'Cuddling during shared activities combines physical touch with quality time.'
        },
        {
          title: 'Give them a kiss on the forehead',
          description: `Give them a gentle kiss on the forehead. This tender gesture shows affection and care.`,
          detailedSteps: [
            { step: 1, action: 'Give them a gentle kiss on the forehead', estimatedMinutes: 1 },
            { step: 2, action: 'Maybe say something sweet', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Forehead kisses are tender gestures that show affection and care.'
        },
        {
          title: 'Hold them while they talk',
          description: `Hold them or put your arm around them while they\'re talking about their day. Physical support during conversation shows care.`,
          detailedSteps: [
            { step: 1, action: 'When they\'re talking, hold them or put your arm around them', estimatedMinutes: 1 },
            { step: 2, action: 'Listen while maintaining physical contact', estimatedMinutes: 20 }
          ],
          timeEstimateMinutes: 21,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch', 'quality_time'],
          whySuggested: 'Holding them while they talk combines physical touch with emotional support.'
        },
        {
          title: 'Give them a gentle head scratch',
          description: `Give them a gentle head scratch or play with their hair. This simple touch can be very soothing.`,
          detailedSteps: [
            { step: 1, action: 'Gently scratch their head or play with their hair', estimatedMinutes: 1 },
            { step: 2, action: 'Continue for a few minutes', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 6,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Head scratches are simple but very soothing and comforting.'
        },
        {
          title: 'Spoon or cuddle in bed',
          description: `Cuddle or spoon together in bed, maybe before sleep or when waking up. Physical closeness in bed creates intimacy.`,
          detailedSteps: [
            { step: 1, action: 'Get into bed together', estimatedMinutes: 1 },
            { step: 2, action: 'Spoon or cuddle together', estimatedMinutes: 30 }
          ],
          timeEstimateMinutes: 31,
          effortLevel: 'minimal',
          bestTiming: 'evening',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Cuddling in bed creates intimate physical connection and closeness.'
        },
        {
          title: 'Give them a gentle hand massage',
          description: `Give them a gentle hand massage. Hand massages are relaxing and show you want to help them unwind.`,
          detailedSteps: [
            { step: 1, action: 'Take their hand', estimatedMinutes: 1 },
            { step: 2, action: 'Gently massage their hand for 5-10 minutes', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 11,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Hand massages are relaxing and show you want to help them unwind.'
        },
        {
          title: 'Dance together',
          description: `Put on some music and dance together, even if it\'s just swaying. Dancing creates physical connection and fun.`,
          detailedSteps: [
            { step: 1, action: 'Put on some music', estimatedMinutes: 1 },
            { step: 2, action: 'Dance together - hold each other and sway or dance', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 11,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch', 'quality_time'],
          whySuggested: 'Dancing together creates physical connection, fun, and quality time.'
        },
        {
          title: 'Give them a gentle back rub',
          description: `Give them a gentle back rub. Back rubs are relaxing and show you want to help them feel better.`,
          detailedSteps: [
            { step: 1, action: 'Ask if they\'d like a back rub', estimatedMinutes: 1 },
            { step: 2, action: 'Give them a gentle back rub for 10-15 minutes', tip: 'Ask about pressure', estimatedMinutes: 15 }
          ],
          timeEstimateMinutes: 16,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Back rubs are relaxing and show you want to help them feel better.'
        },
        {
          title: 'Hold them when they\'re stressed',
          description: `When they\'re stressed or having a tough time, hold them. Physical comfort during difficult times shows deep care.`,
          detailedSteps: [
            { step: 1, action: 'Notice when they\'re stressed or having a tough time', estimatedMinutes: 1 },
            { step: 2, action: 'Hold them or put your arms around them', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 11,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Holding them when they\'re stressed provides physical comfort and shows deep care.'
        },
        {
          title: 'Give them random touches throughout the day',
          description: `Give them small, random touches throughout the day - a touch on the arm, a pat on the back, etc.`,
          detailedSteps: [
            { step: 1, action: 'Throughout the day, give them small touches', tip: 'A touch on the arm, pat on the back, etc.', estimatedMinutes: 1 },
            { step: 2, action: 'Make it natural and not forced', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 2,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Random touches throughout the day maintain physical connection and show affection.'
        },
        {
          title: 'Hold hands while walking together',
          description: `Hold hands while walking together. Hand-holding is a simple gesture that maintains connection and shows affection.`,
          detailedSteps: [
            { step: 1, action: 'Reach for their hand while walking', estimatedMinutes: 1 },
            { step: 2, action: 'Hold hands and walk together', estimatedMinutes: 15 },
            { step: 3, action: 'Maybe interlace fingers or give their hand a squeeze', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 17,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Hand-holding while walking maintains connection and shows affection.'
        },
        {
          title: 'Give them a foot rub',
          description: `Offer a foot rub after a long day. Foot rubs relieve tension and show care for their comfort.`,
          detailedSteps: [
            { step: 1, action: 'Offer a foot rub', estimatedMinutes: 1 },
            { step: 2, action: 'Massage their feet for 5-10 minutes', tip: 'Ask about pressure preference', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 15,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Foot rubs relieve tension and show care for their comfort and wellbeing.'
        },
        {
          title: 'Sit close together on the couch',
          description: `Sit close together while watching TV or just relaxing. Physical proximity creates connection and comfort.`,
          detailedSteps: [
            { step: 1, action: 'Sit close together on the couch', estimatedMinutes: 1 },
            { step: 2, action: 'Maybe put an arm around them or lean against them', estimatedMinutes: 60 },
            { step: 3, action: 'Enjoy the physical closeness', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 62,
          effortLevel: 'minimal',
          bestTiming: 'evening',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Sitting close together creates connection and comfortable intimacy.'
        },
        {
          title: 'Give them a back scratch',
          description: `Offer to scratch their back. Back scratches are comforting and show care.`,
          detailedSteps: [
            { step: 1, action: 'Offer to scratch their back', estimatedMinutes: 1 },
            { step: 2, action: 'Scratch their back for a few minutes', tip: 'Ask where they need it most', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 8,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Back scratches are comforting and show care for their comfort.'
        },
        {
          title: 'Give them a scalp massage',
          description: `Massage their scalp while they relax. Scalp massages relieve tension and feel amazing.`,
          detailedSteps: [
            { step: 1, action: 'Offer a scalp massage', estimatedMinutes: 1 },
            { step: 2, action: 'Massage their scalp gently for 5-10 minutes', tip: 'Use your fingertips, not nails', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 13,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Scalp massages relieve tension and create deep relaxation.'
        },
        {
          title: 'Put your arm around them',
          description: `Put your arm around them while sitting or walking together. This simple gesture shows affection and closeness.`,
          detailedSteps: [
            { step: 1, action: 'Put your arm around them', estimatedMinutes: 1 },
            { step: 2, action: 'Keep it there while you\'re together', estimatedMinutes: 30 },
            { step: 3, action: 'Maybe give them a gentle squeeze', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 32,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Putting your arm around them shows affection and creates closeness.'
        },
        {
          title: 'Play with their hair',
          description: `Gently play with or stroke their hair. Hair play is intimate and calming.`,
          detailedSteps: [
            { step: 1, action: 'Gently play with or stroke their hair', estimatedMinutes: 1 },
            { step: 2, action: 'Continue for a few minutes', tip: 'Be gentle and ask if they like it', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 8,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Playing with their hair is intimate and calming.'
        },
        {
          title: 'Give them a side hug',
          description: `Give them a side hug when you see them or say goodbye. Side hugs are warm and friendly.`,
          detailedSteps: [
            { step: 1, action: 'Put your arm around them for a side hug', estimatedMinutes: 1 },
            { step: 2, action: 'Give them a gentle squeeze', estimatedMinutes: 1 },
            { step: 3, action: 'Maybe hold it for a moment longer than usual', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 3,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Side hugs are warm, friendly, and show affection.'
        },
        {
          title: 'Rest your head on their shoulder',
          description: `Rest your head on their shoulder while sitting together. This gesture shows trust and closeness.`,
          detailedSteps: [
            { step: 1, action: 'Sit next to them', estimatedMinutes: 1 },
            { step: 2, action: 'Rest your head on their shoulder', estimatedMinutes: 20 },
            { step: 3, action: 'Maybe they\'ll rest their head on yours too', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 22,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Resting your head on their shoulder shows trust and creates closeness.'
        },
        {
          title: 'Give them a full-body hug',
          description: `Give them a full, warm hug. Full-body hugs create deep connection and comfort.`,
          detailedSteps: [
            { step: 1, action: 'Open your arms for a hug', estimatedMinutes: 1 },
            { step: 2, action: 'Give them a full, warm hug', tip: 'Hold it for a moment and really connect', estimatedMinutes: 30 },
            { step: 3, action: 'Maybe give them a squeeze before letting go', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 36,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Full-body hugs create deep connection and comfort.'
        },
        {
          title: 'Massage their hands',
          description: `Massage their hands. Hand massages relieve tension and show care.`,
          detailedSteps: [
            { step: 1, action: 'Offer to massage their hands', estimatedMinutes: 1 },
            { step: 2, action: 'Massage each hand for a few minutes', tip: 'Focus on palms, fingers, and wrists', estimatedMinutes: 8 }
          ],
          timeEstimateMinutes: 10,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Hand massages relieve tension and show care for their comfort.'
        },
        {
          title: 'Give them a bear hug',
          description: `Give them a big, tight bear hug. Bear hugs are warm and make them feel secure and loved.`,
          detailedSteps: [
            { step: 1, action: 'Open your arms wide', estimatedMinutes: 1 },
            { step: 2, action: 'Give them a big, tight hug', tip: 'Hold it tight and make them feel secure', estimatedMinutes: 10 },
            { step: 3, action: 'Maybe lift them up if appropriate', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 16,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Bear hugs make them feel secure, loved, and deeply cared for.'
        },
        {
          title: 'Cuddle while watching something',
          description: `Cuddle together while watching TV or a movie. Cuddling creates comfort and connection.`,
          detailedSteps: [
            { step: 1, action: 'Sit or lie close together', estimatedMinutes: 1 },
            { step: 2, action: 'Cuddle while watching', estimatedMinutes: 60 },
            { step: 3, action: 'Maybe adjust positions for comfort', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 63,
          effortLevel: 'minimal',
          bestTiming: 'evening',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Cuddling while watching creates comfort and connection together.'
        },
        {
          title: 'Give them a neck massage',
          description: `Massage their neck and upper shoulders. Neck massages relieve tension and stress.`,
          detailedSteps: [
            { step: 1, action: 'Offer to massage their neck', estimatedMinutes: 1 },
            { step: 2, action: 'Massage their neck and upper shoulders for 5-10 minutes', tip: 'Ask about pressure preference', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 13,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Neck massages relieve tension and stress, showing care for their wellbeing.'
        },
        {
          title: 'Hold hands while in the car',
          description: `Hold hands while driving or riding in the car together. Car hand-holding maintains connection while on the go.`,
          detailedSteps: [
            { step: 1, action: 'Reach for their hand in the car', estimatedMinutes: 1 },
            { step: 2, action: 'Hold hands while driving or riding', estimatedMinutes: 30 },
            { step: 3, action: 'Maybe give their hand a gentle squeeze', estimatedMinutes: 1 }
          ],
          timeEstimateMinutes: 32,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Holding hands in the car maintains connection even while on the go.'
        },
        {
          title: 'Give them a tight squeeze',
          description: `Give them a tight, secure squeeze when you hug them. Tight squeezes make them feel safe and loved.`,
          detailedSteps: [
            { step: 1, action: 'Hug them', estimatedMinutes: 1 },
            { step: 2, action: 'Give them a tight, secure squeeze', tip: 'Make them feel safe and loved', estimatedMinutes: 10 },
            { step: 3, action: 'Hold it for a moment before letting go', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 16,
          effortLevel: 'minimal',
          bestTiming: 'any',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Tight squeezes make them feel safe, secure, and deeply loved.'
        },
        {
          title: 'Snuggle in bed together',
          description: `Snuggle close together in bed. Bed snuggling creates deep comfort and intimacy.`,
          detailedSteps: [
            { step: 1, action: 'Get into bed together', estimatedMinutes: 1 },
            { step: 2, action: 'Snuggle close together', estimatedMinutes: 30 },
            { step: 3, action: 'Maybe talk or just enjoy the closeness', estimatedMinutes: 15 }
          ],
          timeEstimateMinutes: 46,
          effortLevel: 'minimal',
          bestTiming: 'evening',
          loveLanguageAlignment: ['touch'],
          whySuggested: 'Snuggling in bed creates deep comfort, intimacy, and connection.'
        }
      ],
      planning_ahead: [
        {
          title: 'Plan a weekend date together',
          description: `Take the initiative to plan something fun for the upcoming weekend. Having something to look forward to brightens the whole week.`,
          detailedSteps: [
            { step: 1, action: `Research activities your partner would enjoy`, estimatedMinutes: 15 },
            { step: 2, action: 'Pick 2-3 options and present them', estimatedMinutes: 5 },
            { step: 3, action: 'Make reservations or plans once you decide together', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 30,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time', 'acts'],
          whySuggested: 'Planning ahead shows you prioritize your time together and want to create special moments.'
        },
        {
          title: 'Plan a surprise outing',
          description: `Organize a surprise activity or outing for your partner. Planning something special shows you want to create memorable experiences together.`,
          detailedSteps: [
            { step: 1, action: 'Think of something they would enjoy that\'s a surprise', estimatedMinutes: 10 },
            { step: 2, action: 'Make any necessary reservations or arrangements', estimatedMinutes: 15 },
            { step: 3, action: 'Tell them when to be ready, but keep the destination a surprise', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 30,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time', 'acts'],
          whySuggested: 'Surprise outings create anticipation and show thoughtfulness in planning.'
        },
        {
          title: 'Schedule a special evening at home',
          description: `Plan a cozy evening together at home - maybe with special food, activities, or just dedicated time. Sometimes the best plans are simple.`,
          detailedSteps: [
            { step: 1, action: 'Decide what would make the evening special', tip: 'Favorite food, movies, activities', estimatedMinutes: 5 },
            { step: 2, action: 'Prepare or arrange what you need', estimatedMinutes: 20 },
            { step: 3, action: 'Set aside the time and let them know you\'ve planned something', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 30,
          effortLevel: 'moderate',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Planning special time at home shows intentionality about your connection.'
        },
        {
          title: 'Plan a future trip or vacation',
          description: `Start researching and planning a trip you can take together. Having something to look forward to creates excitement and shared dreams.`,
          detailedSteps: [
            { step: 1, action: 'Discuss places you\'d both like to visit', estimatedMinutes: 10 },
            { step: 2, action: 'Research destinations, dates, and logistics', estimatedMinutes: 30 },
            { step: 3, action: 'Start creating a rough itinerary together', estimatedMinutes: 20 }
          ],
          timeEstimateMinutes: 60,
          effortLevel: 'high',
          bestTiming: 'weekend',
          loveLanguageAlignment: ['quality_time', 'acts'],
          whySuggested: 'Planning future trips creates shared anticipation and shows commitment to spending time together.'
        },
        {
          title: 'Plan a date night for this week',
          description: `Plan a specific date night for this week. Having a planned date creates anticipation and shows you prioritize time together.`,
          detailedSteps: [
            { step: 1, action: 'Choose a day and time that works for both of you', estimatedMinutes: 5 },
            { step: 2, action: 'Plan what you\'ll do - dinner, activity, etc.', estimatedMinutes: 10 },
            { step: 3, action: 'Make any necessary reservations', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 20,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time', 'acts'],
          whySuggested: 'Planning a date night shows you prioritize time together and creates anticipation.'
        },
        {
          title: 'Plan a special breakfast or brunch',
          description: `Plan a special breakfast or brunch together. Morning plans create a positive start to the day.`,
          detailedSteps: [
            { step: 1, action: 'Choose a day and time', estimatedMinutes: 2 },
            { step: 2, action: 'Plan what you\'ll have - maybe make it special or go out', estimatedMinutes: 5 },
            { step: 3, action: 'Make any necessary arrangements', estimatedMinutes: 3 }
          ],
          timeEstimateMinutes: 10,
          effortLevel: 'low',
          bestTiming: 'morning',
          loveLanguageAlignment: ['quality_time', 'acts'],
          whySuggested: 'Planning a special breakfast creates a positive start to the day together.'
        },
        {
          title: 'Plan a movie or show night',
          description: `Plan a specific night to watch something together. Having a planned viewing creates anticipation and shared experience.`,
          detailedSteps: [
            { step: 1, action: 'Choose a day and time', estimatedMinutes: 2 },
            { step: 2, action: 'Pick something you\'ll both enjoy watching', estimatedMinutes: 5 },
            { step: 3, action: 'Plan snacks or drinks to make it special', estimatedMinutes: 3 }
          ],
          timeEstimateMinutes: 10,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Planning a viewing night creates anticipation and shared experience.'
        },
        {
          title: 'Plan a cooking night together',
          description: `Plan a night to cook something special together. Cooking together creates teamwork and shared accomplishment.`,
          detailedSteps: [
            { step: 1, action: 'Choose a day and time', estimatedMinutes: 2 },
            { step: 2, action: 'Pick a recipe you\'ll both enjoy making', estimatedMinutes: 5 },
            { step: 3, action: 'Get the ingredients and plan the evening', estimatedMinutes: 8 }
          ],
          timeEstimateMinutes: 15,
          effortLevel: 'moderate',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time', 'acts'],
          whySuggested: 'Planning a cooking night creates teamwork and shared accomplishment.'
        },
        {
          title: 'Plan a game night',
          description: `Plan a night to play games together. Game nights create fun and friendly competition.`,
          detailedSteps: [
            { step: 1, action: 'Choose a day and time', estimatedMinutes: 2 },
            { step: 2, action: 'Pick games you\'ll both enjoy', estimatedMinutes: 3 },
            { step: 3, action: 'Plan snacks or drinks', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 7,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Planning a game night creates fun and friendly competition.'
        },
        {
          title: 'Plan a hike or outdoor activity',
          description: `Plan a hike or outdoor activity together. Outdoor activities create adventure and shared experiences.`,
          detailedSteps: [
            { step: 1, action: 'Choose a day and time', estimatedMinutes: 2 },
            { step: 2, action: 'Pick a trail or outdoor activity', estimatedMinutes: 10 },
            { step: 3, action: 'Plan what to bring and any logistics', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 17,
          effortLevel: 'moderate',
          bestTiming: 'morning',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Planning outdoor activities creates adventure and shared experiences.'
        },
        {
          title: 'Plan a visit to a new place',
          description: `Plan a visit to a place you haven\'t been to together. Exploring new places creates adventure and shared memories.`,
          detailedSteps: [
            { step: 1, action: 'Choose a day and time', estimatedMinutes: 2 },
            { step: 2, action: 'Research a new place to visit', estimatedMinutes: 15 },
            { step: 3, action: 'Plan the logistics and what to do there', estimatedMinutes: 8 }
          ],
          timeEstimateMinutes: 25,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time', 'acts'],
          whySuggested: 'Planning visits to new places creates adventure and shared memories.'
        },
        {
          title: 'Plan a special celebration',
          description: `Plan a special celebration for something - an accomplishment, anniversary, or just because. Celebrations create joy and shared happiness.`,
          detailedSteps: [
            { step: 1, action: 'Decide what to celebrate', estimatedMinutes: 2 },
            { step: 2, action: 'Plan how to celebrate - food, activities, etc.', estimatedMinutes: 10 },
            { step: 3, action: 'Make any necessary arrangements', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 17,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time', 'gifts'],
          whySuggested: 'Planning celebrations creates joy and shared happiness.'
        },
        {
          title: 'Plan a day trip',
          description: `Plan a day trip to somewhere nearby. Day trips create adventure without requiring extensive planning.`,
          detailedSteps: [
            { step: 1, action: 'Choose a day', estimatedMinutes: 2 },
            { step: 2, action: 'Pick a destination within driving distance', estimatedMinutes: 10 },
            { step: 3, action: 'Plan what to do and see there', estimatedMinutes: 8 }
          ],
          timeEstimateMinutes: 20,
          effortLevel: 'moderate',
          bestTiming: 'weekend',
          loveLanguageAlignment: ['quality_time', 'acts'],
          whySuggested: 'Planning day trips creates adventure without extensive planning.'
        },
        {
          title: 'Plan a themed evening',
          description: `Plan a themed evening - maybe a cuisine theme, movie theme, or activity theme. Themed evenings create fun and creativity.`,
          detailedSteps: [
            { step: 1, action: 'Choose a theme', estimatedMinutes: 3 },
            { step: 2, action: 'Plan food, activities, or decorations around the theme', estimatedMinutes: 15 },
            { step: 3, action: 'Set it up and enjoy together', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 23,
          effortLevel: 'moderate',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time', 'acts'],
          whySuggested: 'Planning themed evenings creates fun and creativity together.'
        },
        {
          title: 'Plan a double date or group activity',
          description: `Plan a double date or group activity with friends. Social activities create shared experiences with others.`,
          detailedSteps: [
            { step: 1, action: 'Choose friends or couples to invite', estimatedMinutes: 2 },
            { step: 2, action: 'Plan an activity everyone will enjoy', estimatedMinutes: 10 },
            { step: 3, action: 'Coordinate schedules and make arrangements', estimatedMinutes: 8 }
          ],
          timeEstimateMinutes: 20,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Planning group activities creates shared social experiences.'
        },
        {
          title: 'Plan a staycation',
          description: `Plan a staycation - treat your home like a vacation destination. Staycations create relaxation without travel.`,
          detailedSteps: [
            { step: 1, action: 'Choose a weekend or days for the staycation', estimatedMinutes: 2 },
            { step: 2, action: 'Plan special activities, food, and relaxation', estimatedMinutes: 15 },
            { step: 3, action: 'Prepare your space to feel like a getaway', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 27,
          effortLevel: 'moderate',
          bestTiming: 'weekend',
          loveLanguageAlignment: ['quality_time', 'acts'],
          whySuggested: 'Planning staycations creates relaxation and special time without travel.'
        },
        {
          title: 'Plan a surprise for a special day',
          description: `Plan a surprise for a special day coming up - birthday, anniversary, or milestone. Surprises for special days show extra thought.`,
          detailedSteps: [
            { step: 1, action: 'Think about what would make the day special', estimatedMinutes: 5 },
            { step: 2, action: 'Plan the surprise - activities, gifts, etc.', estimatedMinutes: 15 },
            { step: 3, action: 'Make any necessary arrangements', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 25,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time', 'gifts', 'acts'],
          whySuggested: 'Planning surprises for special days shows extra thought and care.'
        },
        {
          title: 'Plan a regular weekly date',
          description: `Establish a regular weekly date night. Regular dates create consistency and something to always look forward to.`,
          detailedSteps: [
            { step: 1, action: 'Choose a day and time that works regularly', estimatedMinutes: 3 },
            { step: 2, action: 'Decide on a format - maybe rotate who plans', estimatedMinutes: 5 },
            { step: 3, action: 'Commit to making it a regular thing', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 10,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Establishing regular dates creates consistency and something to always look forward to.'
        },
        {
          title: 'Plan a surprise weekend getaway',
          description: `Plan a surprise weekend getaway. Surprise getaways create excitement and memorable experiences.`,
          detailedSteps: [
            { step: 1, action: 'Choose a destination you\'d both enjoy', estimatedMinutes: 15 },
            { step: 2, action: 'Research activities, restaurants, and places to stay', estimatedMinutes: 30 },
            { step: 3, action: 'Make arrangements and bookings', estimatedMinutes: 20 },
            { step: 4, action: 'Plan when and how to surprise them', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 75,
          effortLevel: 'moderate',
          bestTiming: 'weekend',
          loveLanguageAlignment: ['quality_time', 'gifts', 'acts'],
          whySuggested: 'Surprise getaways create excitement and memorable experiences together.'
        },
        {
          title: 'Plan a date around their interests',
          description: `Plan a date that centers around something they love or are interested in. Planning around their interests shows you listen and care.`,
          detailedSteps: [
            { step: 1, action: 'Think about their interests and hobbies', estimatedMinutes: 3 },
            { step: 2, action: 'Plan a date that incorporates those interests', estimatedMinutes: 15 },
            { step: 3, action: 'Make any necessary reservations or arrangements', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 28,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time', 'gifts'],
          whySuggested: 'Planning around their interests shows you listen and care about what matters to them.'
        },
        {
          title: 'Plan a double date with friends',
          description: `Plan a double date with another couple. Double dates add variety and social connection.`,
          detailedSteps: [
            { step: 1, action: 'Choose another couple you\'d both enjoy spending time with', estimatedMinutes: 5 },
            { step: 2, action: 'Plan an activity you\'d all enjoy', estimatedMinutes: 15 },
            { step: 3, action: 'Coordinate schedules and make arrangements', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 30,
          effortLevel: 'low',
          bestTiming: 'weekend',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Double dates add variety and social connection to your relationship.'
        },
        {
          title: 'Plan a themed date night',
          description: `Plan a themed date night around a specific theme or concept. Themed dates add fun and creativity.`,
          detailedSteps: [
            { step: 1, action: 'Choose a theme you\'d both enjoy', estimatedMinutes: 5 },
            { step: 2, action: 'Plan activities, food, and atmosphere around the theme', estimatedMinutes: 20 },
            { step: 3, action: 'Make any necessary arrangements or purchases', estimatedMinutes: 15 }
          ],
          timeEstimateMinutes: 40,
          effortLevel: 'moderate',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time', 'acts'],
          whySuggested: 'Themed dates add fun and creativity to your time together.'
        },
        {
          title: 'Plan a date to try something new together',
          description: `Plan a date to try something new together that neither of you has done before. Trying new things together creates shared adventure.`,
          detailedSteps: [
            { step: 1, action: 'Research new activities or experiences in your area', estimatedMinutes: 20 },
            { step: 2, action: 'Choose something you\'d both be interested in trying', estimatedMinutes: 5 },
            { step: 3, action: 'Make any necessary reservations or arrangements', estimatedMinutes: 15 }
          ],
          timeEstimateMinutes: 40,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Trying new things together creates shared adventure and memories.'
        },
        {
          title: 'Plan a date to revisit a favorite place',
          description: `Plan a date to revisit a place that\'s special to you both. Revisiting favorite places strengthens connection to shared memories.`,
          detailedSteps: [
            { step: 1, action: 'Think about places that are special to you both', estimatedMinutes: 5 },
            { step: 2, action: 'Choose one to revisit and plan around it', estimatedMinutes: 15 },
            { step: 3, action: 'Maybe plan something new to do there too', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 30,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Revisiting favorite places strengthens connection to shared memories.'
        },
        {
          title: 'Plan a gift for an upcoming occasion',
          description: `Plan a gift for an upcoming occasion - birthday, anniversary, holiday, etc. Planning gifts ahead shows thoughtfulness.`,
          detailedSteps: [
            { step: 1, action: 'Think about the upcoming occasion and what they might like', estimatedMinutes: 10 },
            { step: 2, action: 'Research and choose a thoughtful gift', estimatedMinutes: 20 },
            { step: 3, action: 'Order or purchase it in advance', estimatedMinutes: 15 }
          ],
          timeEstimateMinutes: 45,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['gifts'],
          whySuggested: 'Planning gifts ahead shows thoughtfulness and care for upcoming occasions.'
        },
        {
          title: 'Plan a date to celebrate an accomplishment',
          description: `Plan a date to celebrate something they accomplished or achieved. Celebrating accomplishments shows support and pride.`,
          detailedSteps: [
            { step: 1, action: 'Think about their accomplishment and how to celebrate it', estimatedMinutes: 5 },
            { step: 2, action: 'Plan a date that honors their achievement', estimatedMinutes: 15 },
            { step: 3, action: 'Make any necessary arrangements', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 30,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time', 'words'],
          whySuggested: 'Celebrating accomplishments shows support and pride in their achievements.'
        },
        {
          title: 'Plan a date around a shared hobby',
          description: `Plan a date that involves a hobby you both enjoy. Sharing hobbies creates connection and mutual enjoyment.`,
          detailedSteps: [
            { step: 1, action: 'Think about hobbies you both enjoy', estimatedMinutes: 3 },
            { step: 2, action: 'Plan a date that involves that hobby', estimatedMinutes: 15 },
            { step: 3, action: 'Make any necessary arrangements or preparations', estimatedMinutes: 12 }
          ],
          timeEstimateMinutes: 30,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Sharing hobbies creates connection and mutual enjoyment together.'
        },
        {
          title: 'Plan a surprise breakfast or brunch date',
          description: `Plan a surprise breakfast or brunch date. Morning dates are special and start the day right.`,
          detailedSteps: [
            { step: 1, action: 'Choose a place you\'d both enjoy for breakfast or brunch', estimatedMinutes: 10 },
            { step: 2, action: 'Make a reservation if needed', estimatedMinutes: 5 },
            { step: 3, action: 'Surprise them with the plan', estimatedMinutes: 2 }
          ],
          timeEstimateMinutes: 17,
          effortLevel: 'low',
          bestTiming: 'morning',
          loveLanguageAlignment: ['quality_time', 'gifts'],
          whySuggested: 'Surprise breakfast dates are special and start the day right.'
        },
        {
          title: 'Plan a date to support their hobby or interest',
          description: `Plan a date that supports or involves something they love doing. Supporting their interests shows care for what matters to them.`,
          detailedSteps: [
            { step: 1, action: 'Think about their hobbies or interests', estimatedMinutes: 3 },
            { step: 2, action: 'Plan a date that supports or involves that interest', estimatedMinutes: 15 },
            { step: 3, action: 'Make any necessary arrangements', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 28,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time', 'gifts'],
          whySuggested: 'Supporting their interests shows care for what matters to them.'
        },
        {
          title: 'Plan a date around a cultural event',
          description: `Plan a date around a cultural event - concert, museum, theater, festival, etc. Cultural events create shared experiences.`,
          detailedSteps: [
            { step: 1, action: 'Research cultural events happening in your area', estimatedMinutes: 15 },
            { step: 2, action: 'Choose one you\'d both enjoy', estimatedMinutes: 5 },
            { step: 3, action: 'Get tickets and make any other arrangements', estimatedMinutes: 15 }
          ],
          timeEstimateMinutes: 35,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time', 'gifts'],
          whySuggested: 'Cultural events create shared experiences and connection.'
        },
        {
          title: 'Plan a date to do something active together',
          description: `Plan a date that involves physical activity - hiking, biking, sports, etc. Active dates create energy and shared accomplishment.`,
          detailedSteps: [
            { step: 1, action: 'Think about activities you\'d both enjoy', estimatedMinutes: 5 },
            { step: 2, action: 'Plan an active date around that activity', estimatedMinutes: 15 },
            { step: 3, action: 'Make any necessary preparations or arrangements', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 30,
          effortLevel: 'moderate',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Active dates create energy and shared accomplishment together.'
        },
        {
          title: 'Plan a date to have a deep conversation',
          description: `Plan a date specifically for having a meaningful conversation. Creating space for deep conversation strengthens connection.`,
          detailedSteps: [
            { step: 1, action: 'Choose a quiet, comfortable place for conversation', estimatedMinutes: 10 },
            { step: 2, action: 'Maybe plan some conversation starters or topics', estimatedMinutes: 10 },
            { step: 3, action: 'Make arrangements and set aside time without distractions', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 25,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time', 'words'],
          whySuggested: 'Creating space for deep conversation strengthens emotional connection.'
        },
        {
          title: 'Plan a date to try a new restaurant',
          description: `Plan a date to try a new restaurant you\'ve both wanted to try. Trying new restaurants creates shared discovery.`,
          detailedSteps: [
            { step: 1, action: 'Research new restaurants in your area', estimatedMinutes: 15 },
            { step: 2, action: 'Choose one you\'d both enjoy', estimatedMinutes: 5 },
            { step: 3, action: 'Make a reservation if needed', estimatedMinutes: 5 }
          ],
          timeEstimateMinutes: 25,
          effortLevel: 'low',
          bestTiming: 'evening',
          loveLanguageAlignment: ['quality_time', 'gifts'],
          whySuggested: 'Trying new restaurants creates shared discovery and new experiences.'
        },
        {
          title: 'Plan a date around the seasons',
          description: `Plan a date that fits the current season - fall leaves, winter activities, spring flowers, summer fun. Seasonal dates celebrate the moment.`,
          detailedSteps: [
            { step: 1, action: 'Think about what\'s special about the current season', estimatedMinutes: 3 },
            { step: 2, action: 'Plan a date that celebrates that season', estimatedMinutes: 15 },
            { step: 3, action: 'Make any necessary arrangements', estimatedMinutes: 10 }
          ],
          timeEstimateMinutes: 28,
          effortLevel: 'low',
          bestTiming: 'any',
          loveLanguageAlignment: ['quality_time'],
          whySuggested: 'Seasonal dates celebrate the moment and create timely experiences.'
        },
        {
          title: 'Plan a surprise for when they get home',
          description: `Plan a surprise for when they get home from work or travel. Surprises at home show you thought of them during the day.`,
          detailedSteps: [
            { step: 1, action: 'Think about what would make them happy when they get home', estimatedMinutes: 5 },
            { step: 2, action: 'Plan the surprise - maybe clean the house, set up something, cook, etc.', estimatedMinutes: 20 },
            { step: 3, action: 'Execute it before they get home', estimatedMinutes: 30 }
          ],
          timeEstimateMinutes: 55,
          effortLevel: 'moderate',
          bestTiming: 'evening',
          loveLanguageAlignment: ['acts', 'gifts', 'quality_time'],
          whySuggested: 'Surprises at home show you thought of them during the day and care about their return.'
        }
      ]
    };

    return templates[categoryName] || [];
  }

  /**
   * Save generated suggestions to database
   * 
   * Note: Each suggestion is saved with week_start_date, which ensures:
   * - Suggestions from different weeks are stored separately
   * - When querying, only suggestions for the current week are returned
   * - Each new week (when week_start_date changes) gets fresh suggestions
   * - Previous weeks' suggestions remain in database but are not shown for current week
   */
  private async saveSuggestions(suggestions: HelpingHandSuggestion[]): Promise<HelpingHandSuggestion[]> {
    console.log(`💾 Saving ${suggestions.length} suggestions for week ${suggestions[0]?.weekStartDate || 'unknown'}`);

    const saved: HelpingHandSuggestion[] = [];

    for (const suggestion of suggestions) {
      try {
        const { data, error } = await api.supabase
          .from('helping_hand_suggestions')
          .insert({
            user_id: suggestion.userId,
            relationship_id: suggestion.relationshipId,
            week_start_date: suggestion.weekStartDate,
            category_id: suggestion.categoryId,
            source_type: suggestion.sourceType,
            title: suggestion.title,
            description: suggestion.description,
            detailed_steps: suggestion.detailedSteps || [],
            time_estimate_minutes: suggestion.timeEstimateMinutes,
            effort_level: suggestion.effortLevel,
            best_timing: suggestion.bestTiming,
            love_language_alignment: suggestion.loveLanguageAlignment || [],
            why_suggested: suggestion.whySuggested,
            based_on_factors: suggestion.basedOnFactors || {},
            partner_hint: suggestion.partnerHint,
            partner_preference_match: suggestion.partnerPreferenceMatch || false,
            ai_confidence_score: suggestion.aiConfidenceScore,
            generated_by: suggestion.generatedBy || 'template'
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Failed to save suggestion:', error);
          continue;
        }

        saved.push(helpingHandService.mapSuggestionFromDb(data));
      } catch (error) {
        console.error('❌ Error saving suggestion:', error);
      }
    }

    console.log(`✅ Saved ${saved.length} suggestions successfully`);
    return saved;
  }

  /**
   * Get category counts from suggestions
   */
  private async getCategoryCounts(suggestions: HelpingHandSuggestion[]): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    suggestions.forEach(s => {
      const categoryId = s.categoryId;
      counts[categoryId] = (counts[categoryId] || 0) + 1;
    });

    return counts;
  }

  /**
   * Utility: Get emotional score from capacity level
   */
  private getEmotionalScore(capacity: string): number {
    const scores: Record<string, number> = {
      very_low: 1,
      low: 2,
      moderate: 3,
      good: 4,
      excellent: 5
    };
    return scores[capacity] || 3;
  }

  /**
   * Utility: Get required emotional score
   */
  private getRequiredEmotionalScore(required: string): number {
    const scores: Record<string, number> = {
      low: 2,
      moderate: 3,
      high: 4
    };
    return scores[required] || 3;
  }

  /**
   * Utility: Get effort score
   */
  private getEffortScore(effort: string): number {
    const scores: Record<string, number> = {
      minimal: 1,
      low: 2,
      moderate: 3,
      high: 4
    };
    return scores[effort] || 3;
  }
}

export const aiHelpingHandService = new AIHelpingHandService();
