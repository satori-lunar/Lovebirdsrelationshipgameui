export interface LoveLanguage {
  primary: 'Words of Affirmation' | 'Quality Time' | 'Acts of Service' | 'Receiving Gifts' | 'Physical Touch';
  secondary?: 'Words of Affirmation' | 'Quality Time' | 'Acts of Service' | 'Receiving Gifts' | 'Physical Touch' | null;
}

export interface WantsNeeds {
  gestures?: string[];
  surprise_frequency?: 'Daily small ones' | 'Weekly' | 'Monthly' | 'Not a fan';
  date_style?: 'Relaxed & cozy' | 'Adventurous & active' | 'Cultural (museums/theater)' | 'Food-first (restaurants/foodie)' | 'At-home, sentimental';
  gift_types?: string[];
  planning_style?: 'Spontaneously' | 'Planned in advance' | 'A mix';
  avoid?: string;
  notes?: string;
  // NEW: Enhanced personalization fields
  favorite_activities?: string[];
  favorite_cuisines?: string[];
  wishes?: string; // Things I wish my partner would do
}

export interface Preferences {
  date_types?: string[];
  gift_budget?: 'Under $25' | '$25–$75' | '$75–$200' | 'No limit / special occasions';
}

export interface Consent {
  share_with_partner?: boolean;
  email_opt_in?: boolean;
}

export interface OnboardingData {
  name: string;
  birthday?: string; // YYYY-MM-DD format
  pronouns?: string;
  love_language?: LoveLanguage;
  wants_needs?: WantsNeeds;
  preferences?: Preferences;
  consent?: Consent;
  // New photo fields
  userPhotoUrl?: string;
  partnerPhotoUrl?: string;
  // New relationship fields
  relationshipStatus?: 'married' | 'cohabitating' | 'living_separately';
  dateFrequency?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'rarely' | 'never';
  wantMoreDates?: boolean;
  // Legacy fields for backward compatibility
  partnerName?: string;
  livingTogether?: string;
  relationshipDuration?: string;
  loveLanguages?: string[];
  favoriteActivities?: string[];
  budgetComfort?: string;
  energyLevel?: string;
  feelLoved?: string;
  wishHappened?: string;
  communicationStyle?: string;
  fearsTriggers?: string;
  healthAccessibility?: string;
  relationshipGoals?: string;
}

export interface OnboardingResponse {
  id: string;
  user_id: string;
  name: string;
  birthday: string | null;
  pronouns: string | null;
  love_language_primary: string | null;
  love_language_secondary: string | null;
  wants_needs: WantsNeeds | null;
  preferences: Preferences | null;
  consent: Consent | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
  // New photo fields
  user_photo_url?: string | null;
  partner_photo_url?: string | null;
  // New relationship fields
  relationship_status?: string | null;
  date_frequency?: string | null;
  want_more_dates?: boolean | null;
  // Legacy fields
  partner_name?: string | null;
  living_together?: string | null;
  relationship_duration?: string | null;
  love_languages?: string[];
  favorite_activities?: string[];
  budget_comfort?: string | null;
  energy_level?: string | null;
  feel_loved?: string | null;
  wish_happened?: string | null;
  communication_style?: string | null;
  fears_triggers?: string | null;
  health_accessibility?: string | null;
  relationship_goals?: string | null;
}

