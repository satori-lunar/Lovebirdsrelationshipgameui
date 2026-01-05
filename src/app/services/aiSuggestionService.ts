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

      // Get template variations
      const variations = getAllVariations(loveLanguage, type);
      console.log('📝 Variations:', variations);

      if (!variations) {
        console.error('❌ No variations found for:', { loveLanguage, type });
        return [];
      }

      // Convert to simple AISuggestion format
      const suggestions: AISuggestion[] = [
        {
          id: this.generateId(),
          text: (variations.gentle || 'No suggestion available').replace('{name}', partnerName),
          emoji: this.getEmojiForType(type),
          category: type,
        },
        {
          id: this.generateId(),
          text: (variations.playful || 'No suggestion available').replace('{name}', partnerName),
          emoji: this.getEmojiForType(type),
          category: type,
        },
        {
          id: this.generateId(),
          text: (variations.direct || 'No suggestion available').replace('{name}', partnerName),
          emoji: this.getEmojiForType(type),
          category: type,
        },
      ];

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
      communicationStyle: partnerProfile.communicationStyle
    });

    // Special case: Space
    if (need.needCategory === 'space') {
      return this.generateSpaceResponse(need, partnerProfile);
    }

    // Map need category to suggestion type
    const suggestionType = NEED_TO_SUGGESTION_TYPE[need.needCategory];
    console.log('📝 Mapped to suggestion type:', suggestionType);

    // Generate message suggestions
    const context: SuggestionContext = {
      triggerReason: `Partner expressed need for ${need.needCategory}`,
      partnerLoveLanguage: partnerProfile.loveLanguage,
      partnerCommunicationStyle: partnerProfile.communicationStyle,
      customPreferences: partnerProfile.customPreferences
    };

    const messages = await this.generateMessageSuggestions(context, suggestionType);
    console.log('💬 Generated messages:', messages);

    // Generate action suggestions
    const actions = this.generateActionSuggestions(
      need,
      partnerProfile.loveLanguage
    );

    // Create receiver message (gentle summary)
    const receiverMessage = this.generateReceiverMessage(need, partnerProfile);

    const result = {
      receiverMessage,
      suggestedMessages: messages.slice(0, 3), // Top 3
      suggestedActions: actions,
      reasoning: this.generateNeedReasoning(need, partnerProfile),
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

  // ==================== PRIVATE HELPERS ====================

  private generateId(): string {
    return `sug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getEmojiForType(type: SuggestionType): string {
    const emojiMap: Record<SuggestionType, string> = {
      affection: '💕',
      appreciation: '🙏',
      encouragement: '💪',
      comfort: '🤗',
      celebration: '🎉',
      playful: '😄',
      romantic: '❤️',
      support: '🫂',
      missing_you: '🥺',
      thinking_of_you: '💭',
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
