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
   */
  async generateSuggestions(request: GenerateSuggestionsRequest): Promise<GenerateSuggestionsResponse> {
    console.log('🤖 Generating AI suggestions:', request);

    // Check if suggestions already exist for this week
    if (!request.regenerate) {
      const existingSuggestions = await helpingHandService.getSuggestions({
        userId: request.userId,
        weekStartDate: request.weekStartDate
      });

      if (existingSuggestions.total > 0) {
        console.log('ℹ️ Using existing suggestions for this week');
        return {
          suggestions: existingSuggestions.suggestions,
          categoryCounts: await this.getCategoryCounts(existingSuggestions.suggestions),
          generatedAt: new Date().toISOString()
        };
      }
    }

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
      suggestions: savedSuggestions,
      categoryCounts: await this.getCategoryCounts(savedSuggestions),
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

    // Filter by user's capacity and category requirements
    if (!this.isCategoryFeasible(category, context.userStatus)) {
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
   * Check if category is feasible given user's capacity
   */
  private isCategoryFeasible(category: HelpingHandCategory, userStatus: HelpingHandUserStatus): boolean {
    // Check time availability
    if (userStatus.availableTimeLevel === 'very_limited' && category.minTimeRequired > 10) {
      return false;
    }

    // Check emotional capacity
    const emotionalScore = this.getEmotionalScore(userStatus.emotionalCapacity);
    const requiredScore = this.getRequiredEmotionalScore(category.emotionalCapacityRequired);

    return emotionalScore >= requiredScore;
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
   * Generate template-based suggestions as fallback
   * This provides basic functionality until AI API is integrated
   * Now personalizes based on user status, partner preferences, and context
   */
  private generateTemplateSuggestions(
    category: HelpingHandCategory,
    context: AIGenerationContext
  ): Partial<HelpingHandSuggestion>[] {
    const { userStatus, partnerStatus, partnerOnboarding, partnerHints, relationshipData } = context;
    const partnerName = partnerOnboarding?.name || 'your partner';
    const allLoveLanguages = partnerOnboarding?.love_languages || ['quality_time'];
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
        partnerHints
      }))
      .filter(t => t !== null) as Partial<HelpingHandSuggestion>[];

    // Filter by user capacity and category requirements
    return personalizedTemplates
      .filter(t => t.timeEstimateMinutes! <= category.maxTimeRequired)
      .filter(t => {
        const effortScore = this.getEffortScore(t.effortLevel!);
        const capacityScore = this.getEmotionalScore(userStatus.emotionalCapacity);
        return effortScore <= capacityScore;
      })
      .slice(0, 5)
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
    }
  ): Partial<HelpingHandSuggestion> | null {
    const { 
      partnerName, 
      allLoveLanguages, 
      favoriteActivities, 
      userStatus, 
      challenges,
      isLivingTogether,
      partnerHints
    } = context;

    const isStressed = userStatus.stressLevel === 'very_stressed' || userStatus.stressLevel === 'stressed';
    const isLowEnergy = userStatus.energyLevel === 'exhausted' || userStatus.energyLevel === 'tired';
    const hasWorkChallenge = challenges.includes('work_deadline');
    const hasFamilyChallenge = challenges.includes('family_issue');
    const isStudent = userStatus.workScheduleType === 'student';
    const isFullTime = userStatus.workScheduleType === 'full_time';

    // Personalize title and description with partner name
    let personalizedTitle = template.title?.replace(/\bpartner\b/gi, partnerName) || template.title || '';
    let personalizedDescription = template.description?.replace(/\bpartner\b/gi, partnerName) || template.description || '';

    // Add context-specific details to descriptions
    if (isStressed && template.effortLevel === 'minimal') {
      personalizedDescription += ` Perfect for when you're feeling stretched - this takes almost no mental energy.`;
    }

    if (hasWorkChallenge && template.loveLanguageAlignment?.includes('acts')) {
      personalizedDescription += ` With your work deadline this week, this practical gesture shows care without adding pressure.`;
    }

    if (favoriteActivities.length > 0 && template.loveLanguageAlignment?.includes('quality_time')) {
      const activity = favoriteActivities[0];
      personalizedDescription = personalizedDescription.replace(
        'activities they would enjoy',
        `activities like ${activity}`
      );
    }

    // Adjust timing based on work schedule
    let bestTiming = template.bestTiming || 'any';
    if (isFullTime && bestTiming === 'any') {
      bestTiming = 'evening'; // Default to evening for full-time workers
    }
    if (isStudent && bestTiming === 'any') {
      bestTiming = 'afternoon'; // Afternoon might work better for students
    }

    // Use partner hints if available
    let whySuggested = template.whySuggested || '';
    if (partnerHints.length > 0 && template.loveLanguageAlignment?.includes('gifts')) {
      const giftHint = partnerHints.find(h => h.hintType === 'like' || h.hintType === 'preference');
      if (giftHint) {
        personalizedDescription += ` ${partnerName} mentioned they like things related to "${giftHint.hintText}" - this could align with that.`;
      }
    }

    // Adjust love language alignment to include all partner's languages
    const loveLanguageAlignment = template.loveLanguageAlignment || [];
    const alignedLanguages = new Set([...loveLanguageAlignment, ...allLoveLanguages].slice(0, 3));

    return {
      ...template,
      title: personalizedTitle,
      description: personalizedDescription,
      bestTiming: bestTiming as any,
      loveLanguageAlignment: Array.from(alignedLanguages),
      whySuggested: whySuggested || `This fits your ${userStatus.availableTimeLevel} available time and ${userStatus.emotionalCapacity} emotional capacity.`
    };
  }

  /**
   * Get template suggestions for each category (base templates, will be personalized)
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
        }
      ]
    };

    return templates[categoryName] || [];
  }

  /**
   * Save generated suggestions to database
   */
  private async saveSuggestions(suggestions: HelpingHandSuggestion[]): Promise<HelpingHandSuggestion[]> {
    console.log(`💾 Saving ${suggestions.length} suggestions to database`);

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
