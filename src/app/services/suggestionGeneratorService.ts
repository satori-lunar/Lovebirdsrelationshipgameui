import { RelationshipNeed, NeedType, DurationOfIssue } from './relationshipNeedsService';

interface AnalyzedContext {
  actionKeywords: string[];
  emotionalKeywords: string[];
  frequencyKeywords: string[];
  hasCommunicated: boolean;
  durationWeeks: number;
  intensityScore: number; // 1-3
  directnessLevel: number; // 1-10 (how direct suggestions should be)
}

interface SuggestionTemplate {
  text: string;
  keywords: string[];
  minDurationWeeks?: number;
  requiresCommunication?: boolean;
  intensityMatch?: number[]; // [1,2,3]
  directnessLevel: number; // 1-10
  priority: number; // 1-10
}

/**
 * Analyzes relationship need context to extract meaningful patterns
 */
export function analyzeNeedContext(need: RelationshipNeed): AnalyzedContext {
  const allText = [
    need.wish_partner_would_do || '',
    need.wish_partner_understood || '',
    need.how_it_affects_me || '',
    need.ideal_outcome || '',
    need.notes || '',
  ].join(' ').toLowerCase();

  // Extract action keywords
  const actionPatterns = [
    'initiate', 'start', 'begin', 'plan', 'organize', 'spend', 'make time',
    'listen', 'talk', 'communicate', 'express', 'show', 'give', 'help',
    'support', 'encourage', 'notice', 'acknowledge', 'appreciate', 'thank',
    'cuddle', 'hug', 'kiss', 'touch', 'hold', 'compliment', 'praise',
  ];

  const actionKeywords = actionPatterns.filter(pattern => allText.includes(pattern));

  // Extract emotional keywords
  const emotionalPatterns = [
    'lonely', 'alone', 'isolated', 'disconnected', 'distant', 'sad',
    'unappreciated', 'undervalued', 'ignored', 'invisible', 'unimportant',
    'frustrated', 'angry', 'hurt', 'resentful', 'disappointed',
    'stressed', 'overwhelmed', 'exhausted', 'tired', 'drained',
    'unloved', 'unwanted', 'insecure', 'anxious', 'worried',
  ];

  const emotionalKeywords = emotionalPatterns.filter(pattern => allText.includes(pattern));

  // Extract frequency keywords
  const frequencyPatterns = [
    'daily', 'every day', 'regularly', 'often', 'frequently',
    'weekly', 'weekend', 'evenings', 'mornings', 'nights',
    'always', 'never', 'rarely', 'sometimes', 'occasionally',
  ];

  const frequencyKeywords = frequencyPatterns.filter(pattern => allText.includes(pattern));

  // Calculate duration in weeks
  const durationWeeks = need.duration_of_issue ? getDurationInWeeks(need.duration_of_issue) : 2;

  // Calculate intensity score (1-3)
  const intensityScore = need.intensity === 'slight' ? 1 : need.intensity === 'moderate' ? 2 : 3;

  // Calculate directness level (1-10)
  // More direct if: longer duration, has communicated, high intensity
  let directnessLevel = 3; // Start gentle
  if (durationWeeks > 8) directnessLevel += 2; // 2+ months
  if (durationWeeks > 24) directnessLevel += 2; // 6+ months
  if (need.have_talked_about_it) directnessLevel += 2; // Already discussed
  if (intensityScore === 3) directnessLevel += 1; // High intensity
  directnessLevel = Math.min(10, directnessLevel); // Cap at 10

  return {
    actionKeywords,
    emotionalKeywords,
    frequencyKeywords,
    hasCommunicated: need.have_talked_about_it || false,
    durationWeeks,
    intensityScore,
    directnessLevel,
  };
}

function getDurationInWeeks(duration: DurationOfIssue): number {
  const mapping: Record<DurationOfIssue, number> = {
    just_started: 1,
    few_weeks: 3,
    few_months: 12,
    several_months: 24,
    over_a_year: 52,
  };
  return mapping[duration];
}

/**
 * Gets curated suggestion templates for a specific need type
 */
export function getSuggestionTemplates(needType: NeedType): SuggestionTemplate[] {
  const templates: Record<NeedType, SuggestionTemplate[]> = {
    affection: [
      { text: 'Give your partner a warm hug when you see them today', keywords: ['hug', 'touch'], directnessLevel: 2, priority: 8 },
      { text: 'Send a sweet text message letting them know you\'re thinking of them', keywords: ['communicate', 'express'], directnessLevel: 1, priority: 7 },
      { text: 'Initiate physical closeness while watching TV together', keywords: ['initiate', 'cuddle'], directnessLevel: 3, priority: 7 },
      { text: 'Kiss your partner goodbye in the morning', keywords: ['kiss', 'routine'], directnessLevel: 2, priority: 8 },
      { text: 'Hold hands during your next walk or car ride together', keywords: ['hold', 'touch'], directnessLevel: 2, priority: 7 },
      { text: 'Give your partner a gentle shoulder or foot massage', keywords: ['touch', 'help'], directnessLevel: 4, priority: 6 },
      { text: 'Cuddle up together before bed tonight', keywords: ['cuddle', 'intimacy'], directnessLevel: 3, priority: 7 },
      { text: 'Leave a love note somewhere they\'ll find it', keywords: ['express', 'appreciate'], directnessLevel: 2, priority: 6 },
      { text: 'Initiate more physical affection throughout the day', keywords: ['initiate', 'always'], minDurationWeeks: 4, directnessLevel: 6, priority: 8 },
      { text: 'Ask your partner how they like to receive physical affection', keywords: ['ask', 'communicate'], requiresCommunication: false, directnessLevel: 7, priority: 9 },
    ],

    dates: [
      { text: 'Plan a surprise date night for this weekend', keywords: ['plan', 'surprise'], directnessLevel: 4, priority: 9 },
      { text: 'Ask your partner where they\'d like to go for dinner', keywords: ['ask'], directnessLevel: 2, priority: 7 },
      { text: 'Set up a cozy movie night at home with their favorite snacks', keywords: ['home', 'cozy'], directnessLevel: 3, priority: 8 },
      { text: 'Look up new restaurants or activities you could try together', keywords: ['new', 'explore'], directnessLevel: 3, priority: 7 },
      { text: 'Suggest a spontaneous coffee date or walk', keywords: ['spontaneous'], directnessLevel: 2, priority: 7 },
      { text: 'Book tickets for an event or show they\'d enjoy', keywords: ['plan', 'surprise'], directnessLevel: 5, priority: 8 },
      { text: 'Create a fun at-home date with games and music', keywords: ['home', 'fun'], directnessLevel: 4, priority: 7 },
      { text: 'Take initiative in planning your next date night', keywords: ['initiate', 'plan'], minDurationWeeks: 4, directnessLevel: 6, priority: 9 },
      { text: 'Propose a regular date night schedule', keywords: ['regular', 'weekly'], minDurationWeeks: 8, directnessLevel: 7, priority: 8 },
      { text: 'Have a conversation about making dates a priority', keywords: ['talk', 'communicate'], requiresCommunication: true, minDurationWeeks: 12, directnessLevel: 8, priority: 9 },
    ],

    quality_time: [
      { text: 'Put your phone away during dinner tonight', keywords: ['phone', 'attention'], directnessLevel: 3, priority: 9 },
      { text: 'Suggest doing something together without distractions', keywords: ['focus', 'together'], directnessLevel: 4, priority: 8 },
      { text: 'Ask your partner about their day and really listen', keywords: ['listen', 'ask'], directnessLevel: 2, priority: 8 },
      { text: 'Cook a meal together tonight', keywords: ['together', 'activity'], directnessLevel: 3, priority: 7 },
      { text: 'Propose a device-free hour before bed', keywords: ['phone', 'evening'], directnessLevel: 5, priority: 8 },
      { text: 'Start a new hobby or activity you can do together', keywords: ['new', 'together'], directnessLevel: 4, priority: 7 },
      { text: 'Plan a weekend morning for just the two of you', keywords: ['plan', 'weekend'], directnessLevel: 4, priority: 7 },
      { text: 'Create a weekly ritual for quality time together', keywords: ['regular', 'weekly'], minDurationWeeks: 4, directnessLevel: 6, priority: 9 },
      { text: 'Initiate meaningful conversations more often', keywords: ['communicate', 'talk'], minDurationWeeks: 4, directnessLevel: 6, priority: 8 },
      { text: 'Discuss setting boundaries around phone time together', keywords: ['phone', 'boundary'], requiresCommunication: true, minDurationWeeks: 8, directnessLevel: 8, priority: 9 },
    ],

    compliments: [
      { text: 'Tell your partner something you appreciate about them', keywords: ['appreciate', 'acknowledge'], directnessLevel: 2, priority: 9 },
      { text: 'Compliment their appearance today', keywords: ['appearance', 'look'], directnessLevel: 1, priority: 8 },
      { text: 'Acknowledge something they did really well recently', keywords: ['acknowledge', 'praise'], directnessLevel: 2, priority: 8 },
      { text: 'Tell them a specific reason you\'re proud to be with them', keywords: ['proud', 'express'], directnessLevel: 3, priority: 9 },
      { text: 'Point out a quality or trait you admire in them', keywords: ['admire', 'quality'], directnessLevel: 3, priority: 8 },
      { text: 'Notice and praise their efforts on something', keywords: ['notice', 'effort'], directnessLevel: 2, priority: 8 },
      { text: 'Express how they make you feel loved', keywords: ['express', 'loved'], directnessLevel: 4, priority: 9 },
      { text: 'Make it a habit to give at least one genuine compliment daily', keywords: ['daily', 'always'], minDurationWeeks: 4, directnessLevel: 6, priority: 9 },
      { text: 'Ask what kind of compliments mean the most to them', keywords: ['ask', 'communicate'], requiresCommunication: false, directnessLevel: 7, priority: 8 },
      { text: 'Express appreciation more often and more specifically', keywords: ['appreciate', 'often'], minDurationWeeks: 8, directnessLevel: 7, priority: 9 },
    ],

    appreciation: [
      { text: 'Thank your partner for something they do regularly', keywords: ['thank', 'acknowledge'], directnessLevel: 2, priority: 9 },
      { text: 'Notice and acknowledge the little things they do', keywords: ['notice', 'little'], directnessLevel: 2, priority: 8 },
      { text: 'Express gratitude for their efforts in the relationship', keywords: ['gratitude', 'effort'], directnessLevel: 3, priority: 9 },
      { text: 'Tell them how much you value their presence in your life', keywords: ['value', 'important'], directnessLevel: 4, priority: 9 },
      { text: 'Show appreciation for how they support you', keywords: ['support', 'help'], directnessLevel: 3, priority: 8 },
      { text: 'Recognize their contributions to your life together', keywords: ['recognize', 'contribution'], directnessLevel: 3, priority: 8 },
      { text: 'Let them know you don\'t take them for granted', keywords: ['grateful', 'appreciate'], directnessLevel: 4, priority: 9 },
      { text: 'Express thanks more consistently throughout the week', keywords: ['regular', 'always'], minDurationWeeks: 4, directnessLevel: 6, priority: 9 },
      { text: 'Ask what makes them feel most appreciated', keywords: ['ask', 'communicate'], requiresCommunication: false, directnessLevel: 7, priority: 8 },
      { text: 'Make appreciation a more visible part of your relationship', keywords: ['show', 'visible'], minDurationWeeks: 8, directnessLevel: 7, priority: 9 },
    ],

    communication: [
      { text: 'Ask your partner how they\'re really feeling today', keywords: ['ask', 'feeling'], directnessLevel: 3, priority: 9 },
      { text: 'Share something vulnerable or meaningful about your day', keywords: ['share', 'open'], directnessLevel: 4, priority: 8 },
      { text: 'Check in with your partner about their needs', keywords: ['ask', 'needs'], directnessLevel: 4, priority: 8 },
      { text: 'Listen actively without interrupting when they talk', keywords: ['listen'], directnessLevel: 3, priority: 9 },
      { text: 'Ask about their dreams, goals, or worries', keywords: ['ask', 'deep'], directnessLevel: 4, priority: 8 },
      { text: 'Share your own feelings more openly', keywords: ['express', 'open'], directnessLevel: 5, priority: 8 },
      { text: 'Set aside time for a deeper conversation', keywords: ['time', 'talk'], directnessLevel: 5, priority: 8 },
      { text: 'Make daily check-ins a part of your routine', keywords: ['daily', 'regular'], minDurationWeeks: 4, directnessLevel: 6, priority: 9 },
      { text: 'Suggest creating a safe space for difficult conversations', keywords: ['safe', 'difficult'], requiresCommunication: false, minDurationWeeks: 8, directnessLevel: 7, priority: 9 },
      { text: 'Have an honest conversation about improving communication', keywords: ['honest', 'improve'], requiresCommunication: true, minDurationWeeks: 12, directnessLevel: 8, priority: 9 },
    ],

    intimacy: [
      { text: 'Create a romantic atmosphere at home tonight', keywords: ['romantic', 'atmosphere'], directnessLevel: 4, priority: 8 },
      { text: 'Express your desire and attraction to your partner', keywords: ['desire', 'attraction'], directnessLevel: 5, priority: 9 },
      { text: 'Initiate physical closeness without expectations', keywords: ['initiate', 'close'], directnessLevel: 4, priority: 8 },
      { text: 'Set aside uninterrupted time for intimacy', keywords: ['time', 'private'], directnessLevel: 5, priority: 8 },
      { text: 'Show your partner you find them attractive', keywords: ['attractive', 'desire'], directnessLevel: 4, priority: 8 },
      { text: 'Plan a romantic evening together', keywords: ['romantic', 'plan'], directnessLevel: 5, priority: 8 },
      { text: 'Be more affectionate and sensual in your interactions', keywords: ['affectionate', 'sensual'], directnessLevel: 6, priority: 8 },
      { text: 'Initiate intimacy more frequently', keywords: ['initiate', 'often'], minDurationWeeks: 4, directnessLevel: 7, priority: 9 },
      { text: 'Ask about their needs and desires regarding intimacy', keywords: ['ask', 'needs'], requiresCommunication: false, minDurationWeeks: 8, directnessLevel: 8, priority: 9 },
      { text: 'Have an open conversation about intimacy in your relationship', keywords: ['talk', 'honest'], requiresCommunication: true, minDurationWeeks: 12, directnessLevel: 9, priority: 9 },
    ],

    support: [
      { text: 'Ask your partner if there\'s anything you can help with today', keywords: ['help', 'ask'], directnessLevel: 2, priority: 9 },
      { text: 'Offer to take something off their plate', keywords: ['help', 'task'], directnessLevel: 3, priority: 8 },
      { text: 'Check in on how stressed they\'ve been lately', keywords: ['ask', 'stress'], directnessLevel: 3, priority: 8 },
      { text: 'Show up for them when they need you', keywords: ['support', 'present'], directnessLevel: 4, priority: 9 },
      { text: 'Encourage them in their goals and aspirations', keywords: ['encourage', 'goals'], directnessLevel: 3, priority: 8 },
      { text: 'Be their biggest cheerleader today', keywords: ['support', 'encourage'], directnessLevel: 3, priority: 8 },
      { text: 'Help with a task they\'ve been putting off', keywords: ['help', 'task'], directnessLevel: 4, priority: 8 },
      { text: 'Listen without judgment when they need to vent', keywords: ['listen', 'support'], directnessLevel: 3, priority: 9 },
      { text: 'Be more proactive in offering support', keywords: ['proactive', 'help'], minDurationWeeks: 4, directnessLevel: 6, priority: 9 },
      { text: 'Ask what kind of support they need most from you', keywords: ['ask', 'needs'], requiresCommunication: false, minDurationWeeks: 8, directnessLevel: 7, priority: 9 },
    ],
  };

  return templates[needType] || [];
}

/**
 * Scores a suggestion template against the analyzed context
 */
function scoreSuggestion(
  template: SuggestionTemplate,
  context: AnalyzedContext
): number {
  let score = template.priority; // Base score from priority (1-10)

  // Keyword matching (0-30 points)
  const allUserKeywords = [
    ...context.actionKeywords,
    ...context.emotionalKeywords,
    ...context.frequencyKeywords,
  ];
  const matchingKeywords = template.keywords.filter(k =>
    allUserKeywords.some(uk => uk.includes(k) || k.includes(uk))
  );
  score += matchingKeywords.length * 5;

  // Duration appropriateness (0-20 points)
  if (template.minDurationWeeks) {
    if (context.durationWeeks >= template.minDurationWeeks) {
      score += 20;
    } else {
      score -= 10; // Penalize if not ready yet
    }
  } else {
    score += 10; // Always appropriate
  }

  // Communication awareness (0-20 points)
  if (template.requiresCommunication !== undefined) {
    if (template.requiresCommunication === context.hasCommunicated) {
      score += 20;
    } else {
      score -= 15; // Wrong communication context
    }
  } else {
    score += 10; // No requirement
  }

  // Intensity match (0-15 points)
  if (template.intensityMatch) {
    if (template.intensityMatch.includes(context.intensityScore)) {
      score += 15;
    } else {
      score -= 5;
    }
  } else {
    score += 7; // No specific requirement
  }

  // Directness appropriateness (0-15 points)
  const directnessDiff = Math.abs(template.directnessLevel - context.directnessLevel);
  if (directnessDiff <= 2) {
    score += 15; // Perfect match
  } else if (directnessDiff <= 4) {
    score += 10; // Close enough
  } else {
    score += 5; // Not ideal but okay
  }

  return score;
}

/**
 * Generates smart, contextual suggestions for a relationship need
 */
export function generateContextualSuggestions(
  need: RelationshipNeed,
  count: number = 8
): string[] {
  const context = analyzeNeedContext(need);
  const templates = getSuggestionTemplates(need.need_type);

  // Score all templates
  const scored = templates.map(template => ({
    template,
    score: scoreSuggestion(template, context),
  }));

  // Sort by score (highest first) and take top N
  scored.sort((a, b) => b.score - a.score);

  return scored
    .slice(0, count)
    .map(s => s.template.text);
}

/**
 * Generates progressive suggestions (gentle -> direct over time)
 */
export function generateProgressiveSuggestions(
  need: RelationshipNeed
): string[] {
  const context = analyzeNeedContext(need);
  const templates = getSuggestionTemplates(need.need_type);

  // Group by directness level
  const gentle = templates.filter(t => t.directnessLevel <= 3);
  const moderate = templates.filter(t => t.directnessLevel >= 4 && t.directnessLevel <= 6);
  const direct = templates.filter(t => t.directnessLevel >= 7);

  // Score within each group
  const scoredGentle = gentle.map(t => ({ template: t, score: scoreSuggestion(t, context) }));
  const scoredModerate = moderate.map(t => ({ template: t, score: scoreSuggestion(t, context) }));
  const scoredDirect = direct.map(t => ({ template: t, score: scoreSuggestion(t, context) }));

  // Sort each group
  scoredGentle.sort((a, b) => b.score - a.score);
  scoredModerate.sort((a, b) => b.score - a.score);
  scoredDirect.sort((a, b) => b.score - a.score);

  // Take top suggestions from each level based on current context
  const suggestions: string[] = [];

  if (context.directnessLevel <= 4) {
    // Early stage: mostly gentle
    suggestions.push(...scoredGentle.slice(0, 5).map(s => s.template.text));
    suggestions.push(...scoredModerate.slice(0, 2).map(s => s.template.text));
    suggestions.push(...scoredDirect.slice(0, 1).map(s => s.template.text));
  } else if (context.directnessLevel <= 7) {
    // Mid stage: mix of moderate and gentle
    suggestions.push(...scoredGentle.slice(0, 2).map(s => s.template.text));
    suggestions.push(...scoredModerate.slice(0, 4).map(s => s.template.text));
    suggestions.push(...scoredDirect.slice(0, 2).map(s => s.template.text));
  } else {
    // Late stage: mostly direct
    suggestions.push(...scoredGentle.slice(0, 1).map(s => s.template.text));
    suggestions.push(...scoredModerate.slice(0, 2).map(s => s.template.text));
    suggestions.push(...scoredDirect.slice(0, 5).map(s => s.template.text));
  }

  return suggestions;
}
