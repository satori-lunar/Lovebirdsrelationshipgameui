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
          suggestions: existingSuggestions.suggestions || [],
          categoryCounts: await this.getCategoryCounts(existingSuggestions.suggestions || []),
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

    // Personalize with partner's favorite activities
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
      loveLanguageAlignment: Array.from(alignedLanguages),
      whySuggested: whySuggested
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
