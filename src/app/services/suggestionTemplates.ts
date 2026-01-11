/**
 * AI Suggestion Templates
 *
 * Pre-crafted message templates organized by love language,
 * communication style, and suggestion type.
 */

import {
  LoveLanguage,
  CommunicationStyle,
  SuggestionType,
  SuggestionTemplate
} from '../types/suggestions';
import { NeedCategory } from '../types/needs';

/**
 * Templates for Words of Affirmation love language
 */
export const WORDS_TEMPLATES: Record<SuggestionType, SuggestionTemplate> = {
  reassurance: {
    direct: "I believe in you and what we have.",
    gentle: "Just want you to know I'm thinking of you.",
    playful: "Missing my favorite person 💛",
    reserved: "You're on my mind."
  },
  affection: {
    direct: "I love you. I hope you know how much you mean to me. Can I send you a lockscreen love message?",
    gentle: "I don't say it enough, but I really care about you. You mean everything to me.",
    playful: "You're kind of amazing, you know that? Surprise lockscreen love note incoming 😌",
    reserved: "Glad you're mine."
  },
  appreciation: {
    direct: "I really admire how you [handled that situation].",
    gentle: "I appreciate you more than I probably show.",
    playful: "You're crushing it lately. Just saying 👏",
    reserved: "Noticed what you did. Thank you."
  },
  quality_time: {
    direct: "Can we set aside real time just for us tonight?",
    gentle: "Would you be up for some intentional time together?",
    playful: "Stealing you for a bit later 😌",
    reserved: "Want to talk tonight?"
  },
  support: {
    direct: "I'm here for you. Tell me what you need.",
    gentle: "I want to support you through this. How can I help?",
    playful: "You've got this, and you've got me 💪",
    reserved: "I'm with you."
  },
  celebration: {
    direct: "I'm so proud of you. You did an amazing job - let's celebrate this win together.",
    gentle: "I wanted to celebrate this moment with you. What would make this feel special?",
    playful: "You absolute legend! Let's mark this win with something fun 🎉",
    reserved: "Well done. Proud of you."
  },
  reconnection: {
    direct: "I miss us. Can we reconnect?",
    gentle: "I feel like we've been a bit distant. Want to talk?",
    playful: "When did we last actually talk? Miss you 💬",
    reserved: "Feel off. You good?"
  },
  check_in: {
    direct: "How are you really doing? I'm here if you want to talk or video call.",
    gentle: "Just checking in. How's your heart? Send me a lockscreen message if you want.",
    playful: "Vibe check: how's my person doing? Lock screen love note if you're missing me 💛",
    reserved: "You okay?"
  }
};

/**
 * Templates for Quality Time love language
 */
export const QUALITY_TIME_TEMPLATES: Record<SuggestionType, SuggestionTemplate> = {
  reassurance: {
    direct: "Let's talk tonight. I want to make sure we're good.",
    gentle: "Could we have some uninterrupted time to connect?",
    playful: "Date night? Even virtual counts 💻💛",
    reserved: "Need to talk. You free?"
  },
  affection: {
    direct: "I want to spend real time with you. No distractions.",
    gentle: "Can we do something together, just us?",
    playful: "Let's have a moment. Phone down, hearts up 💛",
    reserved: "Want time with you."
  },
  appreciation: {
    direct: "Thank you for making time for me. It means everything.",
    gentle: "I really value the time we spend together.",
    playful: "Best part of my day? You. Obviously 😌",
    reserved: "Time with you matters."
  },
  quality_time: {
    direct: "I need undivided attention from you tonight. Video call or in-person date?",
    gentle: "Could we plan a moment that's just about us? I want your full presence.",
    playful: "Exclusive access requested. Video date night or surprise quality time? 📵",
    reserved: "Want your focus."
  },
  support: {
    direct: "Can I have your time right now? I need to talk.",
    gentle: "I could really use your presence through this.",
    playful: "Need my co-pilot. You available? 🛩️",
    reserved: "Need you."
  },
  celebration: {
    direct: "Let's celebrate together. I want to make this moment special for you.",
    gentle: "Would you want to mark this moment with me? I have something fun in mind.",
    playful: "Let's celebrate your win! Game night, special dinner, or something just for you? 🎉",
    reserved: "Celebrate with me?"
  },
  reconnection: {
    direct: "We need a real date. Video call, in-person, or something special - let's reconnect.",
    gentle: "I miss spending quality time with you. Can we plan something this week?",
    playful: "Permission to kidnap you for a bit? Virtual date night or surprise adventure? 😌",
    reserved: "Miss us."
  },
  check_in: {
    direct: "Can we talk tonight? Want to hear how you're doing.",
    gentle: "Could we check in? I want to be present for you.",
    playful: "Debrief time? Let's catch up properly 💬",
    reserved: "Talk later?"
  }
};

/**
 * Templates for Acts of Service love language
 */
export const ACTS_TEMPLATES: Record<SuggestionType, SuggestionTemplate> = {
  reassurance: {
    direct: "What can I take off your plate today?",
    gentle: "If there's anything I can do to help, let me know.",
    playful: "What do you need? I'm on it 💪",
    reserved: "Need anything?"
  },
  affection: {
    direct: "I want to do something for you. What would help?",
    gentle: "Let me handle something for you today.",
    playful: "What's one thing I can tackle for you? Name it 😌",
    reserved: "How can I help?"
  },
  appreciation: {
    direct: "Thank you for everything you do. It doesn't go unnoticed.",
    gentle: "I see all the little things you do. Thank you.",
    playful: "You're basically a superhero. Just FYI 🦸",
    reserved: "I see you. Thanks."
  },
  quality_time: {
    direct: "Let me help you finish that so we can have time together.",
    gentle: "Want me to handle something so you're less stressed?",
    playful: "Let's knock out your to-do list together 📝",
    reserved: "Need a hand?"
  },
  support: {
    direct: "Tell me what you need done. I'll handle it.",
    gentle: "I want to lighten your load. What's weighing on you?",
    playful: "Deploy me. What needs doing? 🚀",
    reserved: "What do you need?"
  },
  celebration: {
    direct: "Let me plan something special to celebrate you. What would make this win feel amazing?",
    gentle: "I want to do something nice for you. You deserve to feel celebrated.",
    playful: "Victory treat incoming! Lock screen love message, surprise delivery, or your favorite thing? 🎉",
    reserved: "Let me handle tonight."
  },
  reconnection: {
    direct: "What can I do to make things easier between us?",
    gentle: "Is there something I can do to help us reconnect?",
    playful: "What needs fixing? I'm your person 🔧",
    reserved: "How can I help?"
  },
  check_in: {
    direct: "What's stressing you out? I can help.",
    gentle: "Is there anything on your plate I can take care of?",
    playful: "Stress inventory: what can I handle for you? 📋",
    reserved: "Overwhelmed?"
  }
};

/**
 * Templates for Receiving Gifts love language
 */
export const GIFTS_TEMPLATES: Record<SuggestionType, SuggestionTemplate> = {
  reassurance: {
    direct: "I'm sending you something small to remind you I care.",
    gentle: "A little something is coming your way 💛",
    playful: "Check your messages. Surprise incoming 🎁",
    reserved: "Made you something."
  },
  affection: {
    direct: "I got you a little gift. Hope it makes you smile.",
    gentle: "Saw this and thought of you.",
    playful: "Incoming love delivery! Check your DMs 📦",
    reserved: "Something for you."
  },
  appreciation: {
    direct: "You deserve something special. This is for you.",
    gentle: "A small thank you for being you.",
    playful: "Gift drop! Because you're awesome 🎁",
    reserved: "For you."
  },
  quality_time: {
    direct: "Let's do something together. I have an idea.",
    gentle: "I planned a little something for us.",
    playful: "Adventure unlocked. You in? 🗺️",
    reserved: "Made plans for us."
  },
  support: {
    direct: "I made you something to help you through this.",
    gentle: "A little comfort gift from me to you.",
    playful: "Care package deployed 📦💛",
    reserved: "This is for you."
  },
  celebration: {
    direct: "You earned this. Enjoy your gift - you deserve to feel celebrated.",
    gentle: "I wanted to celebrate you properly. Surprise delivery or lockscreen message?",
    playful: "Victory spoils! Lock screen celebration message or surprise treat? You've been crushing it 🏆",
    reserved: "Congrats. Here."
  },
  reconnection: {
    direct: "I made something to show you I'm thinking of us.",
    gentle: "A peace offering from my heart.",
    playful: "Olive branch emoji + actual gift = ❤️",
    reserved: "For us."
  },
  check_in: {
    direct: "Sending you something to brighten your day.",
    gentle: "A little pick-me-up from me to you.",
    playful: "Mood boost incoming! Check your phone 📱",
    reserved: "Sent you something."
  }
};

/**
 * Templates for Physical Touch love language (adapted for LDR)
 */
export const TOUCH_TEMPLATES: Record<SuggestionType, SuggestionTemplate> = {
  reassurance: {
    direct: "I wish I could hold you right now.",
    gentle: "Sending you the biggest virtual hug.",
    playful: "Imagine I'm giving you the longest hug ever 🤗",
    reserved: "Wish I was there."
  },
  affection: {
    direct: "I miss your touch. Counting down to when I can hold you.",
    gentle: "Missing being close to you.",
    playful: "Virtual cuddle session? Let's FaceTime 💛",
    reserved: "Miss you."
  },
  appreciation: {
    direct: "When I see you next, I'm not letting go.",
    gentle: "Can't wait to be close to you again.",
    playful: "Reserving all the hugs for you. Coming soon™ 🤗",
    reserved: "Next hug = forever."
  },
  quality_time: {
    direct: "Can we FaceTime? I want to feel close to you.",
    gentle: "Video call later? I miss seeing you.",
    playful: "Face-to-face time? Even if it's through a screen 📱",
    reserved: "FaceTime?"
  },
  support: {
    direct: "I wish I could be there to hold you through this.",
    gentle: "Sending you all the comfort I can from here.",
    playful: "Deploying virtual hugs and hand-holding 🫂",
    reserved: "Wish I was there."
  },
  celebration: {
    direct: "When we're together next, we're celebrating properly. Until then, virtual celebration?",
    gentle: "Saving up all my celebratory hugs for you. Can I send a lockscreen love message to celebrate?",
    playful: "Victory hugs pending! For now, surprise lock screen celebration message? Mark your calendar 🎉",
    reserved: "Hugs coming."
  },
  reconnection: {
    direct: "I need to feel close to you. Can we video call?",
    gentle: "I miss feeling connected to you.",
    playful: "Let's see each other's faces. Miss your smile 💛",
    reserved: "Video call?"
  },
  check_in: {
    direct: "How are you? I wish I could be there.",
    gentle: "Checking in. Sending you warmth from here.",
    playful: "Vibe check + virtual hug combo 🤗",
    reserved: "You okay? Miss you."
  }
};

/**
 * Map love language to template set
 */
export const LOVE_LANGUAGE_TEMPLATES: Record<LoveLanguage, Record<SuggestionType, SuggestionTemplate>> = {
  words: WORDS_TEMPLATES,
  quality_time: QUALITY_TIME_TEMPLATES,
  acts: ACTS_TEMPLATES,
  gifts: GIFTS_TEMPLATES,
  touch: TOUCH_TEMPLATES
};

/**
 * Map need category to suggestion type
 */
export const NEED_TO_SUGGESTION_TYPE: Record<NeedCategory, SuggestionType> = {
  communication: 'reconnection',
  affection: 'affection',
  quality_time: 'quality_time',
  reassurance: 'reassurance',
  support: 'support',
  space: 'check_in', // Special case - handled differently
  appreciation: 'appreciation',
  understanding: 'check_in',
  consistency: 'quality_time',
  physical_intimacy: 'affection',
  fun: 'celebration',
  other: 'check_in'
};

/**
 * Get template for specific combination
 */
export function getTemplate(
  loveLanguage: LoveLanguage,
  suggestionType: SuggestionType,
  communicationStyle: CommunicationStyle
): string {
  const templateSet = LOVE_LANGUAGE_TEMPLATES[loveLanguage];
  const template = templateSet[suggestionType];
  return template[communicationStyle];
}

/**
 * Get all variations for a suggestion type
 */
export function getAllVariations(
  loveLanguage: LoveLanguage,
  suggestionType: SuggestionType
): SuggestionTemplate {
  return LOVE_LANGUAGE_TEMPLATES[loveLanguage][suggestionType];
}
