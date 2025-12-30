export type LoveLanguage = 'Words of Affirmation' | 'Quality Time' | 'Acts of Service' | 'Receiving Gifts' | 'Physical Touch';

export interface LoveLanguageSuggestion {
  id: number;
  title: string;
  description: string;
  category: 'love_language';
  loveLanguage: LoveLanguage;
  timeEstimate: string;
  difficulty: 'Easy' | 'Medium' | 'High';
  requiresData: string[]; // Required data fields for personalization
  optionalData: string[]; // Optional data for enhancement
  personalizationTier: 1 | 2 | 3 | 4;
  avoidIf: string[]; // Skip if partner has these "avoid" preferences
}

export const loveLanguageSuggestions: LoveLanguageSuggestion[] = [
  // Words of Affirmation
  {
    id: 1,
    title: "Write a 'This is what I see in you' note",
    description: "Take 10 minutes to write down the qualities you see in {partner_name} that they might not see in themselves.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "10 minutes",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: ['partner_strengths'],
    personalizationTier: 1,
    avoidIf: []
  },
  {
    id: 2,
    title: "Text them one thing you respect about them",
    description: "Send {partner_name} a simple text about something specific you respect - their work ethic, kindness, or how they handle challenges.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "2 minutes",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: ['respected_qualities'],
    personalizationTier: 1,
    avoidIf: []
  },
  {
    id: 3,
    title: "Record a 30-second voice memo",
    description: "Send {partner_name} a voice message reminding them they're not alone, especially during a tough time.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "5 minutes",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: ['current_challenges'],
    personalizationTier: 2,
    avoidIf: []
  },
  {
    id: 4,
    title: "Finish this sentence for them: 'One day you'll realize…'",
    description: "Complete this sentence for {partner_name} in a way that speaks to their potential and future.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "5 minutes",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: ['future_goals'],
    personalizationTier: 1,
    avoidIf: []
  },
  {
    id: 5,
    title: "Praise something they don't realize they're good at",
    description: "Point out a skill or quality {partner_name} takes for granted but you deeply appreciate.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "5 minutes",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: ['hidden_talents'],
    personalizationTier: 2,
    avoidIf: []
  },
  {
    id: 6,
    title: "Write them a future-focused encouragement",
    description: "Write {partner_name} about what you believe they'll accomplish or who they're becoming.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "10 minutes",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: ['aspirations'],
    personalizationTier: 1,
    avoidIf: []
  },
  {
    id: 7,
    title: "Thank them for how they love you",
    description: "Be specific with {partner_name} about what their love means to you and how it impacts your life.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "10 minutes",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: ['love_examples'],
    personalizationTier: 1,
    avoidIf: []
  },
  {
    id: 8,
    title: "Tell them what first made you fall for them",
    description: "Share with {partner_name} the moment or quality that made you realize they were special.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "10 minutes",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: ['first_date_memory', 'relationship_milestones'],
    personalizationTier: 3,
    avoidIf: []
  },
  {
    id: 9,
    title: "Affirm them in an area they feel insecure about",
    description: "Gently speak truth to {partner_name} into an area where they doubt themselves.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "15 minutes",
    difficulty: "Medium",
    requiresData: ['partner_name'],
    optionalData: ['insecurities'],
    personalizationTier: 3,
    avoidIf: []
  },
  {
    id: 10,
    title: "Write a note titled 'Why I choose you'",
    description: "List the reasons you continue to choose {partner_name} every day, not just why you chose them once.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "15 minutes",
    difficulty: "Medium",
    requiresData: ['partner_name'],
    optionalData: [],
    personalizationTier: 1,
    avoidIf: []
  },
  {
    id: 51,
    title: "Leave surprise sticky notes with affirmations",
    description: "Hide sticky notes with specific compliments in places {partner_name} will find them throughout the day - mirror, car, lunch bag, computer.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "10 minutes",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: [],
    personalizationTier: 1,
    avoidIf: []
  },
  {
    id: 52,
    title: "Create a '10 reasons I admire you' list",
    description: "Write down 10 specific qualities you admire about {partner_name} and share it over breakfast or before bed.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "15 minutes",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: ['admired_qualities'],
    personalizationTier: 1,
    avoidIf: []
  },
  {
    id: 53,
    title: "Send them a playlist with song titles that form a message",
    description: "Create a playlist where the song titles, when read in order, form a message of love or encouragement for {partner_name}.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "20 minutes",
    difficulty: "Medium",
    requiresData: ['partner_name'],
    optionalData: ['favorite_music'],
    personalizationTier: 2,
    avoidIf: []
  },
  {
    id: 54,
    title: "Write a letter to their future self",
    description: "Write a letter to {partner_name}'s future self (5 years from now), describing the amazing person they're becoming and what you hope they've accomplished.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "20 minutes",
    difficulty: "Medium",
    requiresData: ['partner_name'],
    optionalData: ['future_goals'],
    personalizationTier: 2,
    avoidIf: []
  },
  {
    id: 55,
    title: "Publicly appreciate them on social media",
    description: "Post a thoughtful appreciation of {partner_name} on social media, highlighting something specific they did or a quality you love.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "10 minutes",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: [],
    personalizationTier: 1,
    avoidIf: ['public_attention']
  },
  {
    id: 56,
    title: "Record a video message when you're apart",
    description: "Record a short video telling {partner_name} specific things you appreciate about them. Send it when they least expect it.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "5 minutes",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: [],
    personalizationTier: 1,
    avoidIf: []
  },
  {
    id: 57,
    title: "Brag about them to others (and tell them you did)",
    description: "Tell a friend or family member something you're proud of about {partner_name}, then let them know you were bragging about them.",
    category: 'love_language',
    loveLanguage: "Words of Affirmation",
    timeEstimate: "5 minutes",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: [],
    personalizationTier: 1,
    avoidIf: []
  },

  // Quality Time
  {
    id: 11,
    title: "Plan a 'no phones, no plans' evening",
    description: "Set aside an evening with zero distractions - just you two, fully present.",
    loveLanguage: "Quality Time",
    timeEstimate: "2-3 hours",
    difficulty: "Easy"
  },
  {
    id: 12,
    title: "Take a walk and ask one deep question",
    description: "Go for a walk together and ask one meaningful question. Let the conversation unfold naturally.",
    loveLanguage: "Quality Time",
    timeEstimate: "30-60 minutes",
    difficulty: "Easy"
  },
  {
    id: 13,
    title: "Cook a meal together with music playing",
    description: "Choose a recipe, put on your favorite playlist, and enjoy the process of making something together.",
    loveLanguage: "Quality Time",
    timeEstimate: "1-2 hours",
    difficulty: "Easy"
  },
  {
    id: 14,
    title: "Share one high and one low from the week",
    description: "Sit together and each share your highlight and lowlight from the past week.",
    loveLanguage: "Quality Time",
    timeEstimate: "20-30 minutes",
    difficulty: "Easy"
  },
  {
    id: 15,
    title: "Do a shared activity neither of you is good at",
    description: "Try something new together - pottery, dancing, painting. The awkwardness makes it memorable!",
    loveLanguage: "Quality Time",
    timeEstimate: "1-3 hours",
    difficulty: "Medium"
  },
  {
    id: 16,
    title: "Create a relationship bucket list together",
    description: "Dream together about places to go, things to do, and memories to make.",
    loveLanguage: "Quality Time",
    timeEstimate: "45 minutes",
    difficulty: "Easy"
  },
  {
    id: 17,
    title: "Watch a childhood favorite and talk about memories",
    description: "Watch a movie or show from their childhood and let them share the memories it brings up.",
    loveLanguage: "Quality Time",
    timeEstimate: "2-3 hours",
    difficulty: "Easy"
  },
  {
    id: 18,
    title: "Have a 'remember when' night",
    description: "Spend the evening reminiscing about your favorite moments together.",
    loveLanguage: "Quality Time",
    timeEstimate: "1-2 hours",
    difficulty: "Easy"
  },
  {
    id: 19,
    title: "Stargaze or sit outside together quietly",
    description: "Find a quiet spot outside, look up at the sky, and just be together.",
    loveLanguage: "Quality Time",
    timeEstimate: "30-60 minutes",
    difficulty: "Easy"
  },
  {
    id: 20,
    title: "Revisit where you first met",
    description: "Go back to the place where your story began, physically or talk through the memory.",
    loveLanguage: "Quality Time",
    timeEstimate: "1-3 hours",
    difficulty: "Easy"
  },
  {
    id: 58,
    title: "Have a 'teach me something' session",
    description: "Ask {partner_name} to teach you something they're passionate about or skilled at. Be fully engaged and ask questions.",
    category: 'love_language',
    loveLanguage: "Quality Time",
    timeEstimate: "1-2 hours",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: ['hobbies', 'skills'],
    personalizationTier: 2,
    avoidIf: []
  },
  {
    id: 59,
    title: "Create a time capsule together",
    description: "Gather meaningful items, write letters to your future selves, and seal them away to open in 5 or 10 years.",
    category: 'love_language',
    loveLanguage: "Quality Time",
    timeEstimate: "1-2 hours",
    difficulty: "Medium",
    requiresData: ['partner_name'],
    optionalData: [],
    personalizationTier: 1,
    avoidIf: []
  },
  {
    id: 60,
    title: "Plan a surprise adventure day",
    description: "Plan a full day of surprise activities for {partner_name} - they won't know where you're going until you arrive at each spot.",
    category: 'love_language',
    loveLanguage: "Quality Time",
    timeEstimate: "4-8 hours",
    difficulty: "High",
    requiresData: ['partner_name'],
    optionalData: ['favorite_activities', 'interests'],
    personalizationTier: 3,
    avoidIf: []
  },
  {
    id: 61,
    title: "Have a deep conversation with question cards",
    description: "Use conversation starter cards or create your own meaningful questions. Take turns answering honestly and vulnerably.",
    category: 'love_language',
    loveLanguage: "Quality Time",
    timeEstimate: "1-2 hours",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: [],
    personalizationTier: 1,
    avoidIf: []
  },
  {
    id: 62,
    title: "Recreate your first date",
    description: "Plan an evening that mirrors your first date - same restaurant, same activity, reminisce about how far you've come with {partner_name}.",
    category: 'love_language',
    loveLanguage: "Quality Time",
    timeEstimate: "2-4 hours",
    difficulty: "Medium",
    requiresData: ['partner_name'],
    optionalData: ['first_date_memory'],
    personalizationTier: 3,
    avoidIf: []
  },

  // Acts of Service
  {
    id: 21,
    title: "Take over something they're overwhelmed by",
    description: "Notice what's stressing them out and quietly handle it without being asked.",
    loveLanguage: "Acts of Service",
    timeEstimate: "30-60 minutes",
    difficulty: "Medium"
  },
  {
    id: 22,
    title: "Prepare something they'll need later",
    description: "Pack their lunch, set out their clothes, or prep something for tomorrow - be one step ahead.",
    loveLanguage: "Acts of Service",
    timeEstimate: "15-30 minutes",
    difficulty: "Easy"
  },
  {
    id: 23,
    title: "Organize a space that stresses them out",
    description: "Tackle that messy drawer, cluttered desk, or chaotic closet they've been avoiding.",
    loveLanguage: "Acts of Service",
    timeEstimate: "1-2 hours",
    difficulty: "Medium"
  },
  {
    id: 24,
    title: "Finish a task they've been avoiding",
    description: "Complete something that's been on their to-do list for weeks.",
    loveLanguage: "Acts of Service",
    timeEstimate: "30-90 minutes",
    difficulty: "Medium"
  },
  {
    id: 25,
    title: "Bring them food on a hard day",
    description: "Show up with their favorite meal or snack when they're having a rough day.",
    loveLanguage: "Acts of Service",
    timeEstimate: "20-40 minutes",
    difficulty: "Easy"
  },
  {
    id: 26,
    title: "Make their morning easier",
    description: "Set up coffee, lay out breakfast, or start their car on a cold day.",
    loveLanguage: "Acts of Service",
    timeEstimate: "10-20 minutes",
    difficulty: "Easy"
  },
  {
    id: 27,
    title: "Do a chore they dislike",
    description: "Take over the task they hate most - dishes, laundry, vacuuming, whatever it is.",
    loveLanguage: "Acts of Service",
    timeEstimate: "20-45 minutes",
    difficulty: "Easy"
  },
  {
    id: 28,
    title: "Handle logistics so they don't have to",
    description: "Book reservations, make phone calls, or plan the details they find exhausting.",
    loveLanguage: "Acts of Service",
    timeEstimate: "15-30 minutes",
    difficulty: "Easy"
  },
  {
    id: 29,
    title: "Create a calm environment for them",
    description: "Clean up, light candles, play soft music - make the space peaceful when they get home.",
    loveLanguage: "Acts of Service",
    timeEstimate: "30 minutes",
    difficulty: "Easy"
  },
  {
    id: 30,
    title: "Take something off their mental load",
    description: "Handle something they're worrying about so they can stop carrying it.",
    loveLanguage: "Acts of Service",
    timeEstimate: "Varies",
    difficulty: "Medium"
  },
  {
    id: 63,
    title: "Meal prep for their busy week",
    description: "Spend an afternoon preparing {partner_name}'s favorite meals for the week ahead. Package them nicely with labels and heating instructions.",
    category: 'love_language',
    loveLanguage: "Acts of Service",
    timeEstimate: "2-3 hours",
    difficulty: "Medium",
    requiresData: ['partner_name'],
    optionalData: ['favorite_meals', 'dietary_preferences'],
    personalizationTier: 2,
    avoidIf: []
  },
  {
    id: 64,
    title: "Fix or maintain something important to them",
    description: "Repair their broken item, maintain their car, or fix something they've been putting off. Show you care through practical help.",
    category: 'love_language',
    loveLanguage: "Acts of Service",
    timeEstimate: "1-3 hours",
    difficulty: "High",
    requiresData: ['partner_name'],
    optionalData: [],
    personalizationTier: 1,
    avoidIf: []
  },
  {
    id: 65,
    title: "Create a relaxing bedtime routine for them",
    description: "Prepare everything for {partner_name}'s perfect bedtime - warm drink, fresh sheets, dimmed lights, their book ready, phone charging.",
    category: 'love_language',
    loveLanguage: "Acts of Service",
    timeEstimate: "20 minutes",
    difficulty: "Easy",
    requiresData: ['partner_name'],
    optionalData: ['bedtime_preferences'],
    personalizationTier: 2,
    avoidIf: []
  },

  // Receiving Gifts
  {
    id: 31,
    title: "Give them something symbolic of your relationship",
    description: "Choose or create something that represents your journey together.",
    loveLanguage: "Receiving Gifts",
    timeEstimate: "30-60 minutes",
    difficulty: "Medium"
  },
  {
    id: 32,
    title: "Write a note and pair it with something small",
    description: "The gift matters less than the thought - pair a heartfelt note with something simple.",
    loveLanguage: "Receiving Gifts",
    timeEstimate: "20 minutes",
    difficulty: "Easy"
  },
  {
    id: 33,
    title: "Gift them an experience, not an object",
    description: "Give tickets to a concert, a cooking class, or a weekend trip.",
    loveLanguage: "Receiving Gifts",
    timeEstimate: "15-30 minutes",
    difficulty: "Medium"
  },
  {
    id: 34,
    title: "Make something instead of buying it",
    description: "Craft something handmade - a playlist, a photo album, or something you build.",
    loveLanguage: "Receiving Gifts",
    timeEstimate: "1-3 hours",
    difficulty: "High"
  },
  {
    id: 35,
    title: "Give them something tied to a memory",
    description: "Buy something that connects to a special moment you've shared.",
    loveLanguage: "Receiving Gifts",
    timeEstimate: "30 minutes",
    difficulty: "Medium"
  },
  {
    id: 36,
    title: "Create a 'just because' surprise",
    description: "Give a gift on a random Tuesday for no reason at all.",
    loveLanguage: "Receiving Gifts",
    timeEstimate: "20-40 minutes",
    difficulty: "Easy"
  },
  {
    id: 37,
    title: "Give them something you noticed they needed",
    description: "Pay attention to what they mention needing or would make their life easier.",
    loveLanguage: "Receiving Gifts",
    timeEstimate: "20-30 minutes",
    difficulty: "Easy"
  },
  {
    id: 38,
    title: "Create a care package",
    description: "Put together a box of small things that show you know them well.",
    loveLanguage: "Receiving Gifts",
    timeEstimate: "45-90 minutes",
    difficulty: "Medium"
  },
  {
    id: 39,
    title: "Gift them something that reflects who they are",
    description: "Choose something that shows you see and appreciate their unique personality.",
    loveLanguage: "Receiving Gifts",
    timeEstimate: "30-60 minutes",
    difficulty: "Medium"
  },
  {
    id: 40,
    title: "Make the presentation part of the gift",
    description: "Wrap it thoughtfully, add a handwritten tag, make the unwrapping special.",
    loveLanguage: "Receiving Gifts",
    timeEstimate: "15-20 minutes",
    difficulty: "Easy"
  },

  // Physical Touch
  {
    id: 41,
    title: "Initiate a long hug and stay present",
    description: "Give them a long, genuine hug without rushing. Stay in the moment.",
    loveLanguage: "Physical Touch",
    timeEstimate: "2-5 minutes",
    difficulty: "Easy"
  },
  {
    id: 42,
    title: "Sit close and lean into them",
    description: "Choose to sit next to them, not across. Let your shoulders touch.",
    loveLanguage: "Physical Touch",
    timeEstimate: "Ongoing",
    difficulty: "Easy"
  },
  {
    id: 43,
    title: "Hold hands intentionally",
    description: "Reach for their hand while walking, watching TV, or just sitting together.",
    loveLanguage: "Physical Touch",
    timeEstimate: "Ongoing",
    difficulty: "Easy"
  },
  {
    id: 44,
    title: "Give comforting touch when they're stressed",
    description: "A hand on their shoulder, a gentle back rub, or holding their hand during hard moments.",
    loveLanguage: "Physical Touch",
    timeEstimate: "5-10 minutes",
    difficulty: "Easy"
  },
  {
    id: 45,
    title: "Cuddle without distraction",
    description: "No phones, no TV - just be close and present together.",
    loveLanguage: "Physical Touch",
    timeEstimate: "15-30 minutes",
    difficulty: "Easy"
  },
  {
    id: 46,
    title: "Greet them with warmth",
    description: "Welcome them home with a hug, a kiss, or warm physical greeting.",
    loveLanguage: "Physical Touch",
    timeEstimate: "1 minute",
    difficulty: "Easy"
  },
  {
    id: 47,
    title: "Touch them reassuringly in passing",
    description: "A gentle touch on the arm, back, or shoulder as you pass by.",
    loveLanguage: "Physical Touch",
    timeEstimate: "Seconds",
    difficulty: "Easy"
  },
  {
    id: 48,
    title: "Offer closeness without expectation",
    description: "Be affectionate with no agenda - just connection for its own sake.",
    loveLanguage: "Physical Touch",
    timeEstimate: "Ongoing",
    difficulty: "Easy"
  },
  {
    id: 49,
    title: "Rest together",
    description: "Nap together, lay together, or simply be still side by side.",
    loveLanguage: "Physical Touch",
    timeEstimate: "20-60 minutes",
    difficulty: "Easy"
  },
  {
    id: 50,
    title: "Let touch say what words don't",
    description: "Use gentle, grounding touch to communicate care when words aren't enough.",
    loveLanguage: "Physical Touch",
    timeEstimate: "Ongoing",
    difficulty: "Easy"
  }
];
