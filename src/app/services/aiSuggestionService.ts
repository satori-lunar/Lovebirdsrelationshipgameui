/**
 * AI Suggestion Service
 *
 * Generates contextual message suggestions, date ideas, and responses
 * filtered through partner's love language and communication style.
 */

import { api } from './api';
import {
  MessageSuggestion,
  SuggestionContext,
  SuggestionType,
  DateSuggestion,
  ActionSuggestion,
  StoredSuggestion,
  LoveLanguage,
  CommunicationStyle
} from '../types/suggestions';
import {
  RelationshipNeed,
  AINeedSuggestion,
  NeedCategory
} from '../types/needs';
import {
  getTemplate,
  getAllVariations,
  NEED_TO_SUGGESTION_TYPE
} from './suggestionTemplates';

/**
 * Simple AI suggestion for UI components
 */
export interface AISuggestion {
  id: string;
  text: string;
  emoji: string;
  category?: string;
}

class AISuggestionService {
  /**
   * Generate message suggestions for a partner
   */
  async generateMessageSuggestions(
    context: SuggestionContext,
    suggestionType: SuggestionType = 'affection'
  ): Promise<MessageSuggestion[]> {
    const {
      partnerLoveLanguage,
      partnerCommunicationStyle,
      customPreferences
    } = context;

    // Get template variations
    const variations = getAllVariations(partnerLoveLanguage, suggestionType);

    // Generate suggestions for each communication style
    const suggestions: MessageSuggestion[] = [];

    // Primary suggestion (matches partner's style)
    suggestions.push({
      id: this.generateId(),
      tone: partnerCommunicationStyle,
      message: variations[partnerCommunicationStyle],
      reasoning: this.generateReasoning(context, partnerCommunicationStyle, true),
      loveLanguageAlignment: partnerLoveLanguage,
      suggestionType,
      confidence: 90
    });

    // Alternative suggestions (other styles)
    const otherStyles = this.getAlternativeStyles(partnerCommunicationStyle);

    otherStyles.forEach(style => {
      suggestions.push({
        id: this.generateId(),
        tone: style,
        message: variations[style],
        reasoning: this.generateReasoning(context, style, false),
        loveLanguageAlignment: partnerLoveLanguage,
        suggestionType,
        confidence: 70
      });
    });

    // Apply custom preferences
    return this.applyCustomPreferences(suggestions, customPreferences);
  }

  /**
   * Refresh suggestions for UI components
   */
  async refreshSuggestions(
    type: SuggestionType,
    userId: string,
    targetId: string,
    messageType?: string
  ): Promise<AISuggestion[]> {
    try {
      console.log('💡 refreshSuggestions called:', { type, userId, targetId });

      // Get partner's onboarding data for context
      const { data: partnerData, error: fetchError } = await api.supabase
        .from('onboarding_responses')
        .select('love_language_primary, communication_style, name')
        .eq('user_id', targetId)
        .maybeSingle();

      console.log('👤 Partner data fetched:', { partnerData, fetchError });

      const loveLanguage = (partnerData?.love_language_primary as LoveLanguage) || 'quality_time';
      const communicationStyle = (partnerData?.communication_style as CommunicationStyle) || 'gentle';
      const partnerName = partnerData?.name || 'them';

      console.log('✨ Using:', { loveLanguage, communicationStyle, partnerName, type });

      // Get ALL suggestion types to provide variety
      const allTypes: SuggestionType[] = ['affection', 'appreciation', 'quality_time', 'support', 'celebration', 'reconnection', 'check_in', 'reassurance'];

      // Shuffle and pick 3 different types including the requested one
      const typesToUse = this.shuffleArray([type, ...allTypes.filter(t => t !== type)]).slice(0, 3);

      const suggestions: AISuggestion[] = [];

      for (const suggestionType of typesToUse) {
        const variations = getAllVariations(loveLanguage, suggestionType);

        if (!variations) {
          console.warn('⚠️ No variations for:', { loveLanguage, suggestionType });
          continue;
        }

        // Randomly pick one of the communication styles
        const styles: CommunicationStyle[] = ['gentle', 'playful', 'direct', 'reserved'];
        const randomStyle = styles[Math.floor(Math.random() * styles.length)];

        const text = variations[randomStyle] || variations.gentle || 'No suggestion available';

        suggestions.push({
          id: this.generateId(),
          text: text.replace('{name}', partnerName),
          emoji: this.getEmojiForType(suggestionType),
          category: suggestionType,
        });
      }

      console.log('✅ Generated suggestions:', suggestions);
      return suggestions;
    } catch (error) {
      console.error('❌ Error generating suggestions:', error);
      return [];
    }
  }

  /**
   * Generate response to a relationship need
   */
  async generateNeedResponse(need: RelationshipNeed, partnerProfile: {
    loveLanguage: LoveLanguage;
    communicationStyle: CommunicationStyle;
    customPreferences?: Record<string, any>;
  }): Promise<AINeedSuggestion> {
    console.log('🤖 Generating AI need response:', {
      needCategory: need.needCategory,
      loveLanguage: partnerProfile.loveLanguage,
      communicationStyle: partnerProfile.communicationStyle,
      context: need.context
    });

    // Special case: Space
    if (need.needCategory === 'space') {
      return this.generateSpaceResponse(need, partnerProfile);
    }

    // Extract preferences
    const prefs = partnerProfile.customPreferences || {};
    const favoriteActivities = prefs.favoriteActivities || [];
    const partnerName = prefs.partnerName || 'them';
    const budgetComfort = prefs.budgetComfort;
    const energyLevel = prefs.energyLevel;

    // Generate personalized, detailed suggestions based on context
    const personalizedSuggestions = this.generatePersonalizedMessages(
      need,
      partnerProfile,
      favoriteActivities,
      budgetComfort,
      energyLevel
    );

    // Generate detailed action suggestions
    const actions = this.generateDetailedActionSuggestions(
      need,
      partnerProfile,
      favoriteActivities,
      budgetComfort,
      energyLevel
    );

    // Create detailed receiver message
    const receiverMessage = this.generateDetailedReceiverMessage(need, partnerProfile);

    // Generate detailed reasoning
    const reasoning = this.generateDetailedReasoning(need, partnerProfile, favoriteActivities);

    const result = {
      receiverMessage,
      suggestedMessages: personalizedSuggestions,
      suggestedActions: actions,
      reasoning,
      safetyNote: need.urgency === 'important'
        ? "If this feels urgent, consider reaching out directly beyond the app."
        : undefined
    };

    console.log('✅ Final AI suggestion:', result);
    return result;
  }

  /**
   * Generate date suggestions
   */
  async generateDateSuggestion(
    partnerProfile: {
      loveLanguage: LoveLanguage;
      frequencyPreference: string;
      isLongDistance: boolean;
    }
  ): Promise<DateSuggestion> {
    // This would eventually call Claude API
    // For now, use templates

    const dateSuggestions = this.getDateTemplates(
      partnerProfile.loveLanguage,
      partnerProfile.isLongDistance
    );

    // Return first match (would be smarter with AI)
    return dateSuggestions[0];
  }

  /**
   * Record suggestion usage for learning
   */
  async recordSuggestionUsage(
    suggestionId: string,
    wasUsed: boolean,
    modifiedMessage?: string
  ): Promise<void> {
    const { data, error } = await api.supabase
      .from('message_suggestions')
      .update({
        was_used: wasUsed,
        used_at: new Date().toISOString(),
        modified_message: modifiedMessage
      })
      .eq('id', suggestionId);

    if (error) throw error;
  }

  /**
   * Store suggestion in database
   */
  async storeSuggestion(
    senderId: string,
    receiverId: string,
    suggestionType: SuggestionType,
    messages: MessageSuggestion[],
    context: SuggestionContext
  ): Promise<string> {
    const { data, error } = await api.supabase
      .from('message_suggestions')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        suggestion_type: suggestionType,
        generated_messages: messages,
        context: context,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  // ==================== PERSONALIZED SUGGESTION GENERATORS ====================

  /**
   * Generate personalized messages based on need context and partner preferences
   */
  private generatePersonalizedMessages(
    need: RelationshipNeed,
    partnerProfile: any,
    favoriteActivities: string[],
    budgetComfort: string,
    energyLevel: string
  ): MessageSuggestion[] {
    const { needCategory, context } = need;
    const { loveLanguage, communicationStyle } = partnerProfile;
    const partnerName = partnerProfile.customPreferences?.partnerName || 'them';

    const suggestions: MessageSuggestion[] = [];

    // Create context-aware messages based on what they wrote
    const hasContext = context && context.trim().length > 0;

    switch (needCategory) {
      case 'affection':
        if (hasContext) {
          // Use their specific context
          if (loveLanguage === 'words') {
            suggestions.push({
              id: this.generateId(),
              tone: communicationStyle,
              message: `I hear you about ${context}. You mean the world to me, and I want you to feel loved every day. Let me show you better.`,
              reasoning: `Acknowledges their specific concern while providing verbal affirmation`,
              loveLanguageAlignment: loveLanguage,
              suggestionType: 'affection',
              confidence: 95
            });
          } else if (loveLanguage === 'touch') {
            suggestions.push({
              id: this.generateId(),
              tone: communicationStyle,
              message: `I understand you're feeling ${context}. I miss holding you close. Can we video call tonight? I want to feel closer to you.`,
              reasoning: `Addresses their need while suggesting virtual closeness`,
              loveLanguageAlignment: loveLanguage,
              suggestionType: 'affection',
              confidence: 95
            });
          } else if (loveLanguage === 'quality_time') {
            suggestions.push({
              id: this.generateId(),
              tone: communicationStyle,
              message: `You mentioned ${context}. Let's set aside real time together - just us, no distractions. You deserve my full attention.`,
              reasoning: `Responds to their need with quality time commitment`,
              loveLanguageAlignment: loveLanguage,
              suggestionType: 'affection',
              confidence: 95
            });
          }
        } else {
          // Generic affection messages
          suggestions.push({
            id: this.generateId(),
            tone: communicationStyle,
            message: loveLanguage === 'words' ? `I love you more than I probably show. You're my person, and I want you to feel that every single day.` : `I want to make sure you feel loved. What would make you feel most cared for right now?`,
            reasoning: `Provides affirmation and opens dialogue`,
            loveLanguageAlignment: loveLanguage,
            suggestionType: 'affection',
            confidence: 85
          });
        }
        break;

      case 'quality_time':
        const activity = favoriteActivities.length > 0 ? favoriteActivities[0] : 'something together';
        if (hasContext) {
          suggestions.push({
            id: this.generateId(),
            tone: communicationStyle,
            message: `I hear you - ${context}. Let's plan some real, intentional time together. How about we ${activity === 'something together' ? 'do something you love' : activity.toLowerCase()}? You have my full focus.`,
            reasoning: `Uses their favorite activity and addresses their specific concern`,
            loveLanguageAlignment: loveLanguage,
            suggestionType: 'quality_time',
            confidence: 95
          });
        } else {
          suggestions.push({
            id: this.generateId(),
            tone: communicationStyle,
            message: `I want to give you more quality time. How about we plan ${activity === 'something together' ? 'a date night' : 'to ' + activity.toLowerCase()}? Just us, fully present.`,
            reasoning: `Suggests their favorite activity for quality time`,
            loveLanguageAlignment: loveLanguage,
            suggestionType: 'quality_time',
            confidence: 90
          });
        }
        break;

      case 'communication':
        if (hasContext) {
          suggestions.push({
            id: this.generateId(),
            tone: communicationStyle,
            message: `You're right - ${context}. I want to be better at checking in and really talking. Can we set aside time tonight to connect? I want to hear everything.`,
            reasoning: `Acknowledges their specific communication need`,
            loveLanguageAlignment: loveLanguage,
            suggestionType: 'reconnection',
            confidence: 95
          });
        } else {
          suggestions.push({
            id: this.generateId(),
            tone: communicationStyle,
            message: `I feel like we haven't been connecting deeply lately. Can we talk tonight? I miss our real conversations.`,
            reasoning: `Opens dialogue for deeper connection`,
            loveLanguageAlignment: loveLanguage,
            suggestionType: 'reconnection',
            confidence: 88
          });
        }
        break;

      case 'appreciation':
        if (hasContext) {
          suggestions.push({
            id: this.generateId(),
            tone: communicationStyle,
            message: `I'm so sorry - ${context}. You do so much and I haven't been showing my appreciation. Everything you do means the world to me.`,
            reasoning: `Specifically acknowledges what they mentioned`,
            loveLanguageAlignment: loveLanguage,
            suggestionType: 'appreciation',
            confidence: 95
          });
        } else {
          suggestions.push({
            id: this.generateId(),
            tone: communicationStyle,
            message: `I don't say it enough, but I see everything you do. You're amazing, and I appreciate you more than I show.`,
            reasoning: `General appreciation message`,
            loveLanguageAlignment: loveLanguage,
            suggestionType: 'appreciation',
            confidence: 85
          });
        }
        break;
    }

    // Add 2 more alternative style messages
    const alternativeStyles = this.getAlternativeStyles(communicationStyle).slice(0, 2);
    alternativeStyles.forEach(style => {
      const baseTemplate = getAllVariations(loveLanguage, NEED_TO_SUGGESTION_TYPE[needCategory]);
      if (baseTemplate && baseTemplate[style]) {
        suggestions.push({
          id: this.generateId(),
          tone: style,
          message: baseTemplate[style].replace('{name}', partnerName),
          reasoning: `Alternative ${style} communication style`,
          loveLanguageAlignment: loveLanguage,
          suggestionType: NEED_TO_SUGGESTION_TYPE[needCategory],
          confidence: 75
        });
      }
    });

    return suggestions.slice(0, 3);
  }

  /**
   * Generate detailed action suggestions based on preferences
   */
  private generateDetailedActionSuggestions(
    need: RelationshipNeed,
    partnerProfile: any,
    favoriteActivities: string[],
    budgetComfort: string,
    energyLevel: string
  ): ActionSuggestion[] {
    const { needCategory, context, urgency } = need;
    const { loveLanguage } = partnerProfile;
    const actions: ActionSuggestion[] = [];
    const hasContext = context && context.trim().length > 0;

    switch (needCategory) {
      case 'quality_time':
        // Specific, actionable quality time suggestions
        if (favoriteActivities.length > 0) {
          const activity = favoriteActivities[0];
          actions.push({
            type: 'schedule_date',
            description: `Schedule a specific time this week to ${activity.toLowerCase()} together. Put it in your calendar with a reminder, and protect that time - no phones, no distractions.`,
            reasoning: `You know they love ${activity}, so suggesting this shows you remember what matters to them`,
            loveLanguageAlignment: 'quality_time'
          });
        }

        if (energyLevel === 'low_energy' || energyLevel === 'varies') {
          actions.push({
            type: 'schedule_date',
            description: `Plan low-key quality time - even 30-60 minutes works. Order food, watch something together (in person or virtually), or just be in the same space. Low pressure, high connection.`,
            reasoning: `They appreciate low-key quality time, and even brief focused time together matters more than long elaborate dates`,
            loveLanguageAlignment: 'quality_time'
          });
        } else {
          actions.push({
            type: 'schedule_date',
            description: `Plan an engaging activity when you both have time - try that thing they've been wanting to do, grab tickets for something new, or explore together. Even a few hours creates memories.`,
            reasoning: `They have energy for adventure, so meaningful shared experiences will resonate - duration matters less than engagement`,
            loveLanguageAlignment: 'quality_time'
          });
        }

        // Add a "right now" action for urgent needs
        if (urgency === 'important') {
          actions.push({
            type: 'send_message',
            description: `Call or video call them today. Don't wait. Let them hear your voice and see your face. Make it happen within the next few hours.`,
            reasoning: `They marked this as important - immediate action shows you're taking it seriously`,
            loveLanguageAlignment: 'quality_time'
          });
        } else {
          actions.push({
            type: 'send_message',
            description: `Start a daily 15-minute ritual - a morning coffee video call, an evening debrief, or just texting throughout the day. Consistency builds connection.`,
            reasoning: `Small, consistent touchpoints often mean more than occasional big gestures`,
            loveLanguageAlignment: 'quality_time'
          });
        }
        break;

      case 'affection':
        if (loveLanguage === 'words') {
          actions.push({
            type: 'send_message',
            description: `Write them a message right now with 3 specific things you love about them. Not generic - mention actual moments, qualities, or things they've done that made you feel loved.`,
            reasoning: `Their love language is words, and specificity makes affirmation feel more genuine and personal`,
            loveLanguageAlignment: 'words'
          });
          actions.push({
            type: 'send_message',
            description: `Send them random "I love you" or appreciation texts throughout this week - not in response to anything, just spontaneous reminders that you're thinking of them.`,
            reasoning: `Unprompted affection feels more authentic than reactive compliments`,
            loveLanguageAlignment: 'words'
          });
        } else if (loveLanguage === 'gifts') {
          if (budgetComfort === 'budget_friendly') {
            actions.push({
              type: 'send_gift',
              description: `Make them something personal - a playlist of songs that remind you of them, a photo collage of your memories, or a handwritten letter. The effort matters more than the cost.`,
              reasoning: `They value gifts but appreciate thoughtfulness over expense - handmade shows extra care`,
              loveLanguageAlignment: 'gifts'
            });
          } else {
            actions.push({
              type: 'send_gift',
              description: `Order their favorite treat, coffee, or meal to be delivered to them. Include a note saying "Just wanted to brighten your day." Surprise them when they're not expecting it.`,
              reasoning: `Unexpected gifts show you're thinking about them even when you're apart`,
              loveLanguageAlignment: 'gifts'
            });
          }
        } else if (loveLanguage === 'touch') {
          actions.push({
            type: 'schedule_date',
            description: `Plan your next in-person time together NOW - even if it's weeks away. Having something to count down to helps. Until then, send them photos/videos showing your affection.`,
            reasoning: `Physical touch is their language, so planning the next hug matters immensely`,
            loveLanguageAlignment: 'touch'
          });
        } else if (loveLanguage === 'quality_time') {
          actions.push({
            type: 'schedule_date',
            description: `Schedule focused time together this week - even 1 hour of no multitasking, no half-attention matters. Coffee, a meal, a walk. Give them the gift of your full, undivided focus.`,
            reasoning: `For them, quality time IS affection - your presence is how they feel loved, and quality beats quantity`,
            loveLanguageAlignment: 'quality_time'
          });
        } else if (loveLanguage === 'acts') {
          actions.push({
            type: 'send_message',
            description: `Ask them "What's one thing I could do this week that would make your life easier?" Then actually do it - follow through is everything.`,
            reasoning: `They feel loved through helpful actions - asking shows care, doing it proves it`,
            loveLanguageAlignment: 'acts'
          });
        }

        // Universal affection action
        actions.push({
          type: 'send_message',
          description: `Tell them directly: "I want you to feel more loved. What would make you feel most cared for right now?" Then listen and actually do what they say.`,
          reasoning: `Sometimes the best way to show affection is to ask and then follow through`,
          loveLanguageAlignment: loveLanguage
        });
        break;

      case 'appreciation':
        actions.push({
          type: 'send_message',
          description: `Message them today with 3 specific things they did this week that you noticed and appreciate. Be detailed - "Thank you for [specific action] when [specific situation]."`,
          reasoning: `Specific appreciation > generic "thank you" - details prove you're paying attention`,
          loveLanguageAlignment: 'words'
        });

        if (loveLanguage === 'acts') {
          actions.push({
            type: 'send_message',
            description: `Take over one of their regular tasks this week without being asked. If they usually do something, you do it. Show appreciation through action, not just words.`,
            reasoning: `They value acts of service, so reciprocating their efforts speaks volumes`,
            loveLanguageAlignment: 'acts'
          });
        } else if (loveLanguage === 'gifts') {
          actions.push({
            type: 'send_gift',
            description: `Get them their favorite [coffee/snack/treat] and deliver it or have it sent with a note listing what you appreciate about them. Pair the gift with words of gratitude.`,
            reasoning: `Combining gifts with appreciation doubles the impact for their love language`,
            loveLanguageAlignment: 'gifts'
          });
        } else {
          actions.push({
            type: 'send_message',
            description: `Tell someone else how great they are - brag about your partner to a mutual friend or family member, and let your partner know you did it. Public appreciation hits different.`,
            reasoning: `Knowing you appreciate them to others, not just to their face, feels more genuine`,
            loveLanguageAlignment: 'words'
          });
        }

        actions.push({
          type: 'send_message',
          description: `Start a weekly appreciation ritual - every Sunday or Friday, share one thing they did that week that made your life better. Make it a consistent practice.`,
          reasoning: `Regular appreciation prevents taking each other for granted`,
          loveLanguageAlignment: 'words'
        });
        break;

      case 'communication':
        actions.push({
          type: 'schedule_date',
          description: `Schedule a weekly "us" check-in - pick the same day/time each week. Ask each other: "How's your heart? How's us? What do you need from me?" Make it a non-negotiable ritual.`,
          reasoning: `Regular, structured communication prevents small issues from becoming big ones`,
          loveLanguageAlignment: 'quality_time'
        });

        actions.push({
          type: 'send_message',
          description: `Start deeper conversations - tonight, ask them something meaningful: "What's been on your mind lately?" or "How are you REALLY doing?" Then actually listen without fixing or judging.`,
          reasoning: `They're craving depth, not surface-level check-ins - your curiosity shows you care`,
          loveLanguageAlignment: 'words'
        });

        if (hasContext) {
          actions.push({
            type: 'send_message',
            description: `Reference what they shared with you specifically. Say: "You mentioned ${context.substring(0, 30)}... can we talk about that more? I want to understand better." Show you were listening.`,
            reasoning: `Referencing their exact words proves you heard them and care about their concerns`,
            loveLanguageAlignment: 'words'
          });
        } else {
          actions.push({
            type: 'send_message',
            description: `Send them a voice message or video explaining how you're feeling about the relationship. Be vulnerable. Model the depth of sharing you want from them.`,
            reasoning: `Vulnerability invites vulnerability - show them the level of openness you want`,
            loveLanguageAlignment: 'words'
          });
        }
        break;

      case 'reassurance':
        actions.push({
          type: 'send_message',
          description: `Tell them directly: "We're solid. I'm not going anywhere. Here's why I'm committed to us: [list 2-3 specific reasons]." Be clear and concrete, not vague.`,
          reasoning: `When someone needs reassurance, specific commitment > generic "I love you"`,
          loveLanguageAlignment: 'words'
        });

        actions.push({
          type: 'send_message',
          description: `Address the elephant in the room. If something feels off between you, name it and talk about it. Reassurance comes from addressing concerns, not avoiding them.`,
          reasoning: `Ignoring tension creates more insecurity - acknowledgment builds trust`,
          loveLanguageAlignment: 'words'
        });

        actions.push({
          type: 'schedule_date',
          description: `Plan something in the future together - a trip, an event, a goal. Concrete future plans signal you see them in your future, which is inherently reassuring.`,
          reasoning: `Planning ahead together sends the message "I'm not going anywhere"`,
          loveLanguageAlignment: 'quality_time'
        });
        break;

      case 'support':
        actions.push({
          type: 'send_message',
          description: `Ask them specifically: "What would actually help right now - do you need me to listen, give advice, help problem-solve, or just distract you?" Then do exactly that.`,
          reasoning: `Different situations need different support - asking prevents unhelpful "fixing"`,
          loveLanguageAlignment: 'words'
        });

        actions.push({
          type: 'send_message',
          description: `Check in daily while they're going through this. A simple "How are you holding up?" text shows consistent presence. Show up reliably, not just dramatically.`,
          reasoning: `Consistent small support often means more than one grand gesture`,
          loveLanguageAlignment: 'quality_time'
        });

        if (loveLanguage === 'acts') {
          actions.push({
            type: 'send_message',
            description: `Take one thing off their plate - offer to handle something specific they're stressed about. "I can take care of [specific task]. Let me do this for you."`,
            reasoning: `Acts of service are their love language - practical help IS emotional support for them`,
            loveLanguageAlignment: 'acts'
          });
        } else {
          actions.push({
            type: 'send_message',
            description: `Validate their feelings first before trying to help. "That sounds really hard" or "You have every right to feel that way." Sometimes that's all they need.`,
            reasoning: `Validation before solutions - they need to feel heard before they can feel helped`,
            loveLanguageAlignment: 'words'
          });
        }
        break;

      case 'understanding':
        actions.push({
          type: 'send_message',
          description: `Ask them to explain their perspective fully. Say: "Help me understand how you see this. I want to get it from your point of view." Then repeat back what you heard to confirm.`,
          reasoning: `Understanding starts with curiosity, not defense - seeking to understand shows respect`,
          loveLanguageAlignment: 'words'
        });

        actions.push({
          type: 'send_message',
          description: `Acknowledge your part in the misunderstanding. Even if it's small, own it: "I can see how I [specific action] contributed to this. I'm sorry for that." Accountability builds connection.`,
          reasoning: `Defensiveness blocks understanding - taking responsibility opens dialogue`,
          loveLanguageAlignment: 'words'
        });

        actions.push({
          type: 'schedule_date',
          description: `Have a conversation where you ONLY listen and ask clarifying questions - no defending, explaining, or correcting. Your job is to understand, not to be understood. Save your side for later.`,
          reasoning: `They need to feel fully heard before they can hear you - prioritize understanding over being right`,
          loveLanguageAlignment: 'quality_time'
        });
        break;

      case 'consistency':
        actions.push({
          type: 'send_message',
          description: `Commit to one specific, repeatable action: "I'll check in every morning with a good morning text" or "I'll call you every Thursday at 8pm." Pick something sustainable and DO IT.`,
          reasoning: `Consistency is built through small, repeated actions - one reliable thing beats many sporadic gestures`,
          loveLanguageAlignment: 'quality_time'
        });

        actions.push({
          type: 'send_message',
          description: `Acknowledge where you've been inconsistent. "I know I've been unpredictable with [specific behavior]. That's on me. Here's how I'm going to be more reliable..." Then follow through.`,
          reasoning: `Naming the pattern shows awareness - committing to change shows you care`,
          loveLanguageAlignment: 'words'
        });

        actions.push({
          type: 'schedule_date',
          description: `Create a shared routine - a standing date night, morning check-in, or weekend ritual. Put it in both calendars. Treat it as non-negotiable as a work meeting.`,
          reasoning: `Routines create security - predictable connection reduces anxiety in the relationship`,
          loveLanguageAlignment: 'quality_time'
        });
        break;

      case 'physical_intimacy':
        actions.push({
          type: 'schedule_date',
          description: `Plan your next in-person visit with specific dates if you're long distance. Book the ticket/plan the trip. If you're local, plan private time together - closeness requires intention and space.`,
          reasoning: `Physical intimacy needs planning and privacy - hoping it happens isn't enough`,
          loveLanguageAlignment: 'touch'
        });

        actions.push({
          type: 'send_message',
          description: `Until you can be together physically, increase virtual intimacy - longer video calls, falling asleep on FaceTime, watching shows simultaneously. Bridge the gap however you can.`,
          reasoning: `Virtual presence isn't the same as physical, but it's better than emotional distance`,
          loveLanguageAlignment: 'quality_time'
        });

        actions.push({
          type: 'send_message',
          description: `Talk openly about what you both need physically. "I miss holding you" or "I've been craving more closeness." Name it - awkward conversations beat silent longing.`,
          reasoning: `Physical needs are valid relationship needs - talking about them reduces shame and builds intimacy`,
          loveLanguageAlignment: 'words'
        });
        break;

      case 'fun':
        actions.push({
          type: 'schedule_date',
          description: `Plan something playful and light this week - game night, silly photos, trying something new together, or revisiting a fun activity from when you first met. Prioritize laughter.`,
          reasoning: `Fun doesn't happen by accident when life gets heavy - you have to choose it intentionally`,
          loveLanguageAlignment: 'quality_time'
        });

        actions.push({
          type: 'send_message',
          description: `Send them something to make them laugh today - a meme that reminds you of an inside joke, a funny memory, or a silly photo. Lighten the mood proactively.`,
          reasoning: `Small moments of levity prevent relationships from feeling like all work and no play`,
          loveLanguageAlignment: 'words'
        });

        actions.push({
          type: 'send_message',
          description: `Surprise them with spontaneity - "Drop everything, we're [doing something fun] tonight" or "I'm picking you up in 20 minutes for an adventure." Safe spontaneity reignites spark.`,
          reasoning: `Breaking routine creates excitement - playfulness thrives on a little unpredictability`,
          loveLanguageAlignment: 'quality_time'
        });
        break;
    }

    // Default fallback action if no specific category matched
    if (actions.length === 0) {
      actions.push({
        type: 'send_message',
        description: `Reach out to them today and ask: "I want to show up better for you. What would that look like?" Then listen carefully and act on what they share.`,
        reasoning: `When unsure how to help, asking directly shows humility and genuine care`,
        loveLanguageAlignment: loveLanguage
      });
    }

    return actions.slice(0, 3);
  }

  /**
   * Generate detailed receiver message
   */
  private generateDetailedReceiverMessage(need: RelationshipNeed, partnerProfile: any): string {
    const { needCategory, context } = need;
    const { communicationStyle } = partnerProfile;

    if (context && context.trim().length > 0) {
      // Include their specific context
      const contextPreview = context.length > 50 ? context.substring(0, 50) + '...' : context;
      return `They shared: "${contextPreview}" - They're looking for ${needCategory.replace('_', ' ')} right now.`;
    }

    // Use the existing receiver messages as fallback
    return this.generateReceiverMessage(need, partnerProfile);
  }

  /**
   * Generate detailed reasoning
   */
  private generateDetailedReasoning(
    need: RelationshipNeed,
    partnerProfile: any,
    favoriteActivities: string[]
  ): string {
    const { loveLanguage } = partnerProfile;
    const prefs = partnerProfile.customPreferences || {};

    let reasoning = `Your partner values ${loveLanguage.replace('_', ' ')}. `;

    if (favoriteActivities.length > 0) {
      reasoning += `They especially enjoy ${favoriteActivities.slice(0, 2).join(' and ')}. `;
    }

    if (need.context && need.context.trim().length > 0) {
      reasoning += `They specifically mentioned feeling this way, so acknowledging what they shared will mean a lot. `;
    }

    reasoning += `These suggestions are tailored to help you respond in a way that resonates with them.`;

    return reasoning;
  }

  /**
   * Generate detailed suggestions for capacity check-ins
   */
  async generateCapacityCheckInSuggestions(
    mood: string,
    needs: string[],
    context: string | undefined,
    partnerId: string,
    isLongDistance: boolean
  ): Promise<string[]> {
    console.log('[aiSuggestionService] Generating capacity check-in suggestions', {
      mood,
      needs,
      hasContext: !!context,
      partnerId
    });

    // Fetch partner's profile for personalization
    const { data: partnerProfile } = await api.supabase
      .from('onboarding_responses')
      .select('love_language_primary, communication_style, favorite_activities, budget_comfort, energy_level, name')
      .eq('user_id', partnerId)
      .maybeSingle();

    const loveLanguage = partnerProfile?.love_language_primary || 'quality_time';
    const favoriteActivities = partnerProfile?.favorite_activities || [];
    const budgetComfort = partnerProfile?.budget_comfort || 'moderate';
    const partnerName = partnerProfile?.name || 'your partner';

    const suggestions: string[] = [];
    const hasContext = context && context.trim().length > 0;

    // Map mood to capacity level
    const moodCapacity = {
      energized: 95,
      good: 80,
      okay: 60,
      stretched: 40,
      low: 25,
      overwhelmed: 15,
      struggling: 10,
      numb: 5
    }[mood] || 50;

    const isLowCapacity = moodCapacity < 40;
    const isCritical = moodCapacity < 20;

    // Generate suggestions based on needs
    if (needs.includes('comfort')) {
      if (loveLanguage === 'gifts' || loveLanguage === 'acts') {
        if (isLongDistance) {
          if (budgetComfort === 'budget_friendly') {
            suggestions.push(`Send them a heartfelt care package - handwrite a letter, include their favorite tea or snacks you know they love, maybe photos of you two. Personal > expensive.`);
          } else {
            suggestions.push(`Order delivery of their ultimate comfort meal from their favorite restaurant TODAY - don't ask, just surprise them with exactly what they'd want right now.`);
          }
        } else {
          suggestions.push(`Show up with their favorite comfort food - the specific thing they always crave when they're down. Bring it over, no grand gestures needed, just "I brought this for you."`);
        }
      } else if (loveLanguage === 'quality_time') {
        if (isLongDistance) {
          suggestions.push(`Set up a long video call tonight - pick the same movie or show, press play together, and just be there. Low pressure, high comfort.`);
        } else {
          suggestions.push(`Schedule quality time together - even 30-60 minutes works. Watch something together, grab a meal, or just be in the same space. Presence matters more than duration.`);
        }
      } else if (loveLanguage === 'words') {
        suggestions.push(`Send them a voice message telling them specifically why they're going to get through this, referencing times they've been strong before. Make it personal, not generic.`);
      } else if (loveLanguage === 'touch') {
        if (isLongDistance) {
          suggestions.push(`Plan your next visit together RIGHT NOW - even if it's weeks away. Having a countdown to the next hug will help. Send the calendar invite.`);
        } else {
          suggestions.push(`When you see them next, offer physical comfort - a long hug, holding hands, or just sitting close. Even brief physical connection helps when schedules are busy.`);
        }
      }
    }

    if (needs.includes('distraction')) {
      if (favoriteActivities.length > 0) {
        const activity = favoriteActivities[0];
        if (isLongDistance) {
          suggestions.push(`Get them out of their head - if they love ${activity.toLowerCase()}, find a way to do it virtually together, or send them something related to it with a "thinking of you" note.`);
        } else {
          suggestions.push(`Suggest doing ${activity.toLowerCase()} together when you both have time, or send them something fun related to it. Even planning it gives them something positive to think about.`);
        }
      } else {
        if (isLongDistance) {
          suggestions.push(`Play an online game together or start a funny show simultaneously over video. Keep it light, keep them engaged, give their brain a break.`);
        } else {
          suggestions.push(`Suggest a quick distraction activity - coffee date, short walk, or trying something new. Even 30 minutes of fun together can shift their energy.`);
        }
      }
    }

    if (needs.includes('encouragement')) {
      if (loveLanguage === 'words') {
        if (hasContext) {
          const contextSnippet = context.substring(0, 40);
          suggestions.push(`Address what they shared specifically: "${contextSnippet}..." - remind them of the last time they faced something hard and crushed it. Be specific, not generic.`);
        } else {
          suggestions.push(`Text them 3 specific things they're handling well right now, even if they can't see it. Point out their strengths with real examples from this week.`);
        }
      } else {
        suggestions.push(`Remind them of their wins - "Remember when you [specific past accomplishment]? You've got that same strength now." Make it real, not motivational-poster vague.`);
      }
    }

    if (needs.includes('space')) {
      suggestions.push(`Give them breathing room, but send one simple text: "Take all the time you need. I'm here whenever you're ready - no pressure." Then actually give them space.`);
      suggestions.push(`Don't force conversation, but do something thoughtful in the background - order them food for later, handle something on their to-do list quietly, show care through action not words.`);
    }

    if (needs.includes('no_talk')) {
      if (isLongDistance) {
        suggestions.push(`Send a no-pressure care message: "No need to respond. Just want you to know I'm thinking of you and you don't have to be 'on' right now." Then don't expect a reply.`);
        suggestions.push(`Offer to be on FaceTime/video together doing your own things if they want company - working, watching stuff, just existing in the same virtual space. No talking required.`);
      } else {
        suggestions.push(`If you get time together, offer to just be in the same space quietly - no pressure to talk. Even parallel activities (both reading, working, relaxing) provide comfort.`);
        suggestions.push(`Send them a simple "I'm here if you need me, no pressure to talk" message. Sometimes knowing someone's available is enough.`);
      }
    }

    if (needs.includes('open_to_talk')) {
      if (hasContext) {
        suggestions.push(`Reference what they shared and go deeper: "You mentioned ${context.substring(0, 30)}... want to talk about that more? I'm listening, no judgment, no fixing."`);
      } else {
        suggestions.push(`Open the door gently: "I'm here if you want to talk about what's going on. And if you don't, that's okay too. What do you need from me right now?"`);
      }
      suggestions.push(`Ask them the right question: "How are you REALLY doing?" Then actually listen without trying to solve or minimize. Just hear them.`);
    }

    if (needs.includes('check_in')) {
      if (isCritical) {
        suggestions.push(`Check in RIGHT NOW - call them, don't text. At ${moodCapacity}% capacity, they need to hear your voice. Ask how they're holding up and actually stay on the line.`);
      } else {
        suggestions.push(`Check in daily with something simple: "How's your heart today?" or "What's your energy at right now?" Show consistent presence, not just one big check-in.`);
      }
      suggestions.push(`Don't just ask how they are - ask what would actually help: "What's one thing I could do today that would make this easier for you?" Then do it.`);
    }

    if (needs.includes('be_close') || needs.includes('be_present_virtual')) {
      if (isLongDistance) {
        suggestions.push(`Set up a video call when you both have time - even 30 minutes of face-to-face connection helps. Or fall asleep on FaceTime together if that works for your schedules.`);
        suggestions.push(`Send them your presence in other ways - voice messages throughout the day, photos of what you're doing, make them feel like they're part of your day even from a distance.`);
      } else {
        suggestions.push(`Make time to be together soon - even an hour of focused attention matters. Coffee, a meal, a walk, or just being in the same space. Quality over quantity.`);
        suggestions.push(`Until you can meet up, stay connected through the day - quick texts, voice notes, share little moments. Consistent small touchpoints bridge the gap between visits.`);
      }
    }

    // Add context-specific suggestion if they shared details
    if (hasContext && suggestions.length < 3) {
      suggestions.push(`Acknowledge what they're going through: "I hear that ${context.substring(0, 40).toLowerCase()}... I see you. How can I support you best right now?"`);
    }

    // Add low-capacity specific suggestions
    if (isLowCapacity && !suggestions.some(s => s.includes('take care of'))) {
      if (loveLanguage === 'acts') {
        suggestions.push(`They're at ${moodCapacity}% capacity - take something off their plate. Offer to handle a specific task they're stressed about. "Let me take care of [specific thing]." Then do it.`);
      }
    }

    // Critical mood - add urgent support
    if (isCritical && !suggestions.some(s => s.includes('RIGHT NOW') || s.includes('TODAY'))) {
      suggestions.push(`At ${moodCapacity}% capacity, this is serious. Don't wait - reach out TODAY with real support. Check if they need you to come over or just need to know someone's there.`);
    }

    // Ensure we have at least 3-4 suggestions
    if (suggestions.length === 0) {
      suggestions.push(`Ask them directly: "What would help most right now - company, distraction, space, or something else?" Then honor whatever they say.`);
      suggestions.push(`Show up however they need - be flexible and responsive to what they're asking for, even if it's not what you'd want in their situation.`);
      suggestions.push(`Stay consistent - check in tomorrow too. One gesture is nice, sustained support is what matters when capacity is low.`);
    }

    console.log('[aiSuggestionService] Generated capacity suggestions:', suggestions.length);
    return suggestions.slice(0, 4);
  }

  // ==================== PRIVATE HELPERS ====================

  private generateId(): string {
    return `sug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private getEmojiForType(type: SuggestionType): string {
    const emojiMap: Record<SuggestionType, string> = {
      affection: '💕',
      appreciation: '🙏',
      celebration: '🎉',
      support: '🫂',
      reassurance: '🤗',
      quality_time: '⏰',
      reconnection: '💞',
      check_in: '💭',
    };
    return emojiMap[type] || '💌';
  }

  private generateReasoning(
    context: SuggestionContext,
    style: CommunicationStyle,
    isPrimary: boolean
  ): string {
    const base = `Based on your partner's love language (${context.partnerLoveLanguage})`;

    if (isPrimary) {
      return `${base} and preferred communication style (${style}). ${context.triggerReason || ''}`;
    }

    return `${base}. Alternative tone: ${style}.`;
  }

  private generateReceiverMessage(
    need: RelationshipNeed,
    profile: { communicationStyle: CommunicationStyle }
  ): string {
    const category = need.needCategory;

    const messages: Record<NeedCategory, Record<CommunicationStyle, string>> = {
      affection: {
        direct: "They're missing affection right now.",
        gentle: "They could use some extra warmth from you.",
        playful: "Your person needs some love vibes 💛",
        reserved: "They need affection."
      },
      reassurance: {
        direct: "They need reassurance about the relationship.",
        gentle: "They're feeling a bit uncertain and could use your support.",
        playful: "Time for a little relationship pep talk 💪",
        reserved: "They need reassurance."
      },
      quality_time: {
        direct: "They want more intentional time with you.",
        gentle: "They're hoping for some quality connection.",
        playful: "Date night energy needed! ⏰",
        reserved: "They want time."
      },
      communication: {
        direct: "They feel you're not connecting enough.",
        gentle: "They're hoping for deeper conversation.",
        playful: "Let's talk it out time 💬",
        reserved: "Need to talk."
      },
      support: {
        direct: "They need your support right now.",
        gentle: "They're going through something and need you.",
        playful: "Your support squad duties activated 🫂",
        reserved: "They need support."
      },
      appreciation: {
        direct: "They're not feeling valued right now.",
        gentle: "They could use some acknowledgment.",
        playful: "Time to remind them they're awesome ✨",
        reserved: "Need appreciation."
      },
      understanding: {
        direct: "They feel misunderstood.",
        gentle: "They're hoping you'll try to see their perspective.",
        playful: "Empathy mode: activated 🤝",
        reserved: "Feel misunderstood."
      },
      space: {
        direct: "They need breathing room right now.",
        gentle: "They're asking for some space.",
        playful: "Recharge mode needed 🔋",
        reserved: "Need space."
      },
      consistency: {
        direct: "They want more predictability in your connection.",
        gentle: "They're hoping for more reliable check-ins.",
        playful: "Routine refresh time 📅",
        reserved: "Need consistency."
      },
      physical_intimacy: {
        direct: "They're missing physical closeness.",
        gentle: "They want to feel closer to you.",
        playful: "Virtual cuddle session needed 🤗",
        reserved: "Missing closeness."
      },
      fun: {
        direct: "They want more playfulness and joy.",
        gentle: "They're missing the lighthearted moments.",
        playful: "Fun deficit detected! Time to play 🎉",
        reserved: "Need fun."
      },
      other: {
        direct: need.context || "They shared something they need.",
        gentle: need.context || "They mentioned something they're missing.",
        playful: need.context || "Your attention needed 💭",
        reserved: need.context || "Need something."
      }
    };

    return messages[category][profile.communicationStyle];
  }

  private generateNeedReasoning(
    need: RelationshipNeed,
    profile: { loveLanguage: LoveLanguage }
  ): string {
    return `Your partner values ${profile.loveLanguage}. These suggestions are tailored to what makes them feel most loved.`;
  }

  private generateSpaceResponse(
    need: RelationshipNeed,
    profile: any
  ): AINeedSuggestion {
    return {
      receiverMessage: "They need some space right now.",
      suggestedMessages: [
        {
          id: this.generateId(),
          tone: 'gentle',
          message: "Take all the time you need. I'm here when you're ready.",
          reasoning: "Respecting their need for space",
          loveLanguageAlignment: profile.loveLanguage,
          suggestionType: 'support',
          confidence: 95
        }
      ],
      suggestedActions: [
        {
          type: 'give_space',
          description: "Don't send messages or prompts for now",
          reasoning: "They explicitly asked for breathing room",
          loveLanguageAlignment: profile.loveLanguage
        },
        {
          type: 'check_in_later',
          description: "Check in gently after 24-48 hours",
          reasoning: "Show you care without pressure",
          loveLanguageAlignment: profile.loveLanguage
        }
      ],
      reasoning: "When someone asks for space, the best response is to honor it.",
      safetyNote: "If you're concerned about them, one gentle check-in is okay. But respect the boundary they set."
    };
  }

  private generateActionSuggestions(
    need: RelationshipNeed,
    loveLanguage: LoveLanguage
  ): ActionSuggestion[] {
    const actionMap: Record<NeedCategory, ActionSuggestion[]> = {
      affection: [
        {
          type: 'send_message',
          description: 'Send a heartfelt message',
          reasoning: 'Direct affection through words',
          loveLanguageAlignment: 'words'
        },
        {
          type: 'send_gift',
          description: 'Create a lockscreen gift for them',
          reasoning: 'Tangible reminder of your love',
          loveLanguageAlignment: 'gifts'
        }
      ],
      quality_time: [
        {
          type: 'schedule_date',
          description: 'Plan a dedicated date (virtual or in-person)',
          reasoning: 'Give them your undivided attention',
          loveLanguageAlignment: 'quality_time'
        }
      ],
      communication: [
        {
          type: 'send_message',
          description: 'Start a deeper conversation',
          reasoning: 'Open up dialogue',
          loveLanguageAlignment: 'words'
        },
        {
          type: 'schedule_date',
          description: 'Schedule a video call to talk',
          reasoning: 'Face-to-face communication',
          loveLanguageAlignment: 'quality_time'
        }
      ],
      reassurance: [
        {
          type: 'send_message',
          description: 'Affirm the relationship',
          reasoning: 'Words of security and commitment',
          loveLanguageAlignment: 'words'
        }
      ],
      support: [
        {
          type: 'send_message',
          description: 'Ask how you can help',
          reasoning: 'Show up for them',
          loveLanguageAlignment: 'acts'
        },
        {
          type: 'schedule_date',
          description: 'Make time to be present',
          reasoning: 'Your presence is support',
          loveLanguageAlignment: 'quality_time'
        }
      ],
      space: [],
      appreciation: [
        {
          type: 'send_message',
          description: 'Tell them what you appreciate',
          reasoning: 'Acknowledge their efforts',
          loveLanguageAlignment: 'words'
        }
      ],
      understanding: [
        {
          type: 'send_message',
          description: 'Ask to understand their perspective',
          reasoning: 'Show empathy and openness',
          loveLanguageAlignment: 'words'
        }
      ],
      consistency: [
        {
          type: 'send_message',
          description: 'Commit to a regular check-in rhythm',
          reasoning: 'Provide predictability',
          loveLanguageAlignment: 'quality_time'
        }
      ],
      physical_intimacy: [
        {
          type: 'schedule_date',
          description: 'Plan a video call or in-person time',
          reasoning: 'Get as close as possible',
          loveLanguageAlignment: 'touch'
        }
      ],
      fun: [
        {
          type: 'schedule_date',
          description: 'Plan something playful together',
          reasoning: 'Inject joy and spontaneity',
          loveLanguageAlignment: 'quality_time'
        }
      ],
      other: [
        {
          type: 'send_message',
          description: 'Ask them more about what they need',
          reasoning: 'Get clarity',
          loveLanguageAlignment: 'words'
        }
      ]
    };

    return actionMap[need.needCategory] || [];
  }

  private getAlternativeStyles(primary: CommunicationStyle): CommunicationStyle[] {
    const all: CommunicationStyle[] = ['direct', 'gentle', 'playful', 'reserved'];
    return all.filter(s => s !== primary).slice(0, 2);
  }

  private applyCustomPreferences(
    suggestions: MessageSuggestion[],
    customPreferences?: Record<string, any>
  ): MessageSuggestion[] {
    // In the future, filter/modify based on custom rules
    // E.g., "I don't like emojis" -> remove emoji suggestions
    return suggestions;
  }

  private getDateTemplates(
    loveLanguage: LoveLanguage,
    isLongDistance: boolean
  ): DateSuggestion[] {
    // This would eventually be AI-generated
    // For now, return sample templates
    return [
      {
        id: this.generateId(),
        title: 'Virtual Movie Night',
        description: 'Watch the same movie together over video call',
        category: 'virtual',
        loveLanguageFocus: 'quality_time',
        energyLevel: 'low',
        duration: '2 hours',
        reasoning: 'Low effort, high connection',
        steps: [
          'Pick a movie you both want to see',
          'Start a video call',
          'Hit play at the same time',
          'Share reactions throughout'
        ]
      }
    ];
  }
}

export const aiSuggestionService = new AISuggestionService();
