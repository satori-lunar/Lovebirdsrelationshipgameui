export interface OnboardingData {
  name: string;
  partnerName: string;
  livingTogether?: string;
  relationshipDuration?: string;
  loveLanguages: string[];
  favoriteActivities: string[];
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
  partner_name: string;
  living_together: string | null;
  relationship_duration: string | null;
  love_languages: string[];
  favorite_activities: string[];
  budget_comfort: string | null;
  energy_level: string | null;
  feel_loved: string | null;
  wish_happened: string | null;
  communication_style: string | null;
  fears_triggers: string | null;
  health_accessibility: string | null;
  relationship_goals: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

