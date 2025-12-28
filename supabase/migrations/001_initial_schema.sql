-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  CONSTRAINT valid_trial CHECK (trial_end_date IS NULL OR trial_end_date > trial_start_date)
);

-- Relationships table
CREATE TABLE IF NOT EXISTS public.relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_a_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  partner_b_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  invite_code_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  connected_at TIMESTAMPTZ,
  CONSTRAINT valid_partners CHECK (partner_a_id != partner_b_id)
);

-- Onboarding responses table
CREATE TABLE IF NOT EXISTS public.onboarding_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  living_together TEXT,
  relationship_duration TEXT,
  love_languages TEXT[] DEFAULT '{}',
  favorite_activities TEXT[] DEFAULT '{}',
  budget_comfort TEXT,
  energy_level TEXT,
  feel_loved TEXT,
  wish_happened TEXT,
  communication_style TEXT,
  fears_triggers TEXT,
  health_accessibility TEXT,
  relationship_goals TEXT,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Daily questions table
CREATE TABLE IF NOT EXISTS public.daily_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_text TEXT NOT NULL,
  question_date DATE NOT NULL,
  relationship_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(relationship_id, question_date)
);

-- Question answers table (private)
CREATE TABLE IF NOT EXISTS public.question_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES public.daily_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, user_id)
);

-- Question guesses table (private)
CREATE TABLE IF NOT EXISTS public.question_guesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES public.daily_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  guess_text TEXT NOT NULL,
  guessed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, user_id)
);

-- Love language suggestions table
CREATE TABLE IF NOT EXISTS public.love_language_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  suggestion_text TEXT NOT NULL,
  suggestion_type TEXT NOT NULL,
  time_estimate TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  week_start_date DATE NOT NULL,
  saved BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start_date, suggestion_text)
);

-- Date ideas table
CREATE TABLE IF NOT EXISTS public.date_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relationship_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  duration TEXT NOT NULL,
  budget TEXT NOT NULL,
  location TEXT NOT NULL,
  image_emoji TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Date matches table
CREATE TABLE IF NOT EXISTS public.date_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_idea_id UUID NOT NULL REFERENCES public.date_ideas(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  partner_a_liked BOOLEAN DEFAULT false,
  partner_b_liked BOOLEAN DEFAULT false,
  is_match BOOLEAN DEFAULT false,
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date_idea_id, relationship_id)
);

-- Important dates table
CREATE TABLE IF NOT EXISTS public.important_dates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relationship_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('anniversary', 'birthday', 'custom')),
  recurring BOOLEAN DEFAULT true,
  reminder_sent_1week BOOLEAN DEFAULT false,
  reminder_sent_3days BOOLEAN DEFAULT false,
  reminder_sent_dayof BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memories table (premium feature)
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  relationship_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  photo_url TEXT,
  journal_entry TEXT,
  tags TEXT[] DEFAULT '{}',
  is_private BOOLEAN DEFAULT false,
  memory_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'premium',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, plan_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_relationships_partner_a ON public.relationships(partner_a_id);
CREATE INDEX IF NOT EXISTS idx_relationships_partner_b ON public.relationships(partner_b_id);
CREATE INDEX IF NOT EXISTS idx_relationships_invite_code ON public.relationships(invite_code);
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON public.onboarding_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_questions_relationship_date ON public.daily_questions(relationship_id, question_date);
CREATE INDEX IF NOT EXISTS idx_question_answers_question_user ON public.question_answers(question_id, user_id);
CREATE INDEX IF NOT EXISTS idx_question_guesses_question_user ON public.question_guesses(question_id, user_id);
CREATE INDEX IF NOT EXISTS idx_love_language_suggestions_user_week ON public.love_language_suggestions(user_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_date_ideas_relationship ON public.date_ideas(relationship_id);
CREATE INDEX IF NOT EXISTS idx_date_matches_relationship ON public.date_matches(relationship_id);
CREATE INDEX IF NOT EXISTS idx_important_dates_relationship ON public.important_dates(relationship_id);
CREATE INDEX IF NOT EXISTS idx_memories_relationship ON public.memories(relationship_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for onboarding_responses
-- Drop trigger if it exists to allow re-running migrations
DROP TRIGGER IF EXISTS update_onboarding_responses_updated_at ON public.onboarding_responses;
CREATE TRIGGER update_onboarding_responses_updated_at
  BEFORE UPDATE ON public.onboarding_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

