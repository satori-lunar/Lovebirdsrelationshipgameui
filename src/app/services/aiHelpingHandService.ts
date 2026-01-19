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
    if (!request.regenerate) {
      const existingSuggestions = await helpingHandService.getSuggestions({
        userId: request.userId,
        weekStartDate: request.weekStartDate
      });

      if (existingSuggestions.total > 0) {
        console.log(`ℹ️ Using existing suggestions for week ${request.weekStartDate}`);
        return {
          suggestions: existingSuggestions.suggestions || [],
          categoryCounts: await this.getCategoryCounts(existingSuggestions.suggestions || []),
          generatedAt: new Date().toISOString()
        };
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
   * Made more lenient - only filter out if truly incompatible
   */
  private isCategoryFeasible(category: HelpingHandCategory, userStatus: HelpingHandUserStatus): boolean {
    // Only filter out if user has very limited time AND category requires significant time
    if (userStatus.availableTimeLevel === 'very_limited' && category.minTimeRequired > 30) {
      return false;
    }

    // Only filter out if emotional capacity is very low AND category requires high capacity
    if (userStatus.emotionalCapacity === 'very_low' && category.emotionalCapacityRequired === 'high') {
      return false;
    }

    // Otherwise, include the category (we can adapt suggestions to capacity later)
    return true;
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

    // Assessment Match (40 points)
    const timeScore = this.scoreTimeMatch(template.timeEstimateMinutes!, userStatus.availableTimeLevel);
    const energyScore = this.scoreEnergyMatch(template.effortLevel!, userStatus.energyLevel);
    const capacityScore = this.scoreCapacityMatch(template.effortLevel!, userStatus.emotionalCapacity);
    const workScheduleScore = this.scoreWorkScheduleMatch(template.bestTiming!, userStatus.workScheduleType);
    const challengeScore = this.scoreChallengeMatch(template, userStatus.currentChallenges || []);
    
    score += (timeScore + energyScore + capacityScore + workScheduleScore + challengeScore) * 0.4; // 40% of 40 points

    // Onboarding Match (35 points)
    const loveLanguageScore = this.scoreLoveLanguageMatch(template.loveLanguageAlignment || [], partnerOnboarding);
    const activityScore = this.scoreActivityMatch(template, partnerOnboarding?.favorite_activities || []);
    const dateStyleScore = this.scoreDateStyleMatch(template, partnerOnboarding?.wants_needs?.date_style);
    const giftPreferenceScore = this.scoreGiftPreferenceMatch(template, partnerOnboarding);
    const communicationScore = this.scoreCommunicationMatch(template, partnerOnboarding?.communication_style);
    
    score += (loveLanguageScore + activityScore + dateStyleScore + giftPreferenceScore + communicationScore) * 0.35; // 35% of 35 points

    // Relationship Context (15 points)
    const livingTogetherScore = this.scoreLivingTogetherMatch(template, relationshipData?.living_together || false);
    const dateFrequencyScore = this.scoreDateFrequencyMatch(template, partnerOnboarding?.date_frequency);
    const planningStyleScore = this.scorePlanningStyleMatch(template, partnerOnboarding?.wants_needs?.planning_style);
    
    score += (livingTogetherScore + dateFrequencyScore + planningStyleScore) * 0.15; // 15% of 15 points

    // Weekly Variety (10 points)
    const varietyScore = this.scoreWeeklyVariety(template, previousSuggestions);
    score += varietyScore * 0.1; // 10% of 10 points

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
    const wasUsed = previousSuggestions.some(s => s.title?.toLowerCase() === templateTitle);
    if (!wasUsed) return 10;
    // Reduce score if used recently, but don't eliminate completely
    return 3;
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

    // Filter by user capacity and category requirements
    const feasibleTemplates = personalizedTemplates
      .filter(t => t.timeEstimateMinutes! <= category.maxTimeRequired)
      .filter(t => {
        const effortScore = this.getEffortScore(t.effortLevel!);
        const capacityScore = this.getEmotionalScore(userStatus.emotionalCapacity);
        return effortScore <= capacityScore;
      });

    // Score all templates for relevance
    const previousSuggestions = context.previousSuggestions || [];
    const scoredTemplates = feasibleTemplates.map(template => ({
      template,
      score: this.scoreTemplateRelevance(template, context, previousSuggestions)
    }));

    // Filter out templates with score < 30 (too irrelevant)
    const relevantTemplates = scoredTemplates.filter(st => st.score >= 30);

    // Sort by score (highest first), then add some randomization for weekly variety
    const sorted = relevantTemplates.sort((a, b) => {
      // Primary sort by score
      if (Math.abs(a.score - b.score) > 10) {
        return b.score - a.score;
      }
      // For templates with similar scores, add randomization
      return Math.random() - 0.5;
    });

    // Select top 3-5 templates
    const selectedCount = Math.min(5, Math.max(3, sorted.length));
    return sorted.slice(0, selectedCount).map(st => st.template)
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
      // Skip expensive gift suggestions or modify them
      if (template.timeEstimateMinutes! > 30) {
        return null; // Filter out expensive/time-consuming gifts
      }
      personalizedDescription += ` This is a thoughtful gesture that doesn't require spending money.`;
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
   * Expanded to 15-20+ templates per category for weekly variety
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
