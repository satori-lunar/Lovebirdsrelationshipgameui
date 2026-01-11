-- Clean install of relationship needs tracking system
-- Run this in Supabase SQL Editor

-- Drop existing objects if they exist (in correct order)
DROP FUNCTION IF EXISTS create_partner_suggestions();
DROP TABLE IF EXISTS public.partner_suggestions CASCADE;
DROP TABLE IF EXISTS public.relationship_needs CASCADE;

-- Table to store what users feel is missing
CREATE TABLE public.relationship_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  need_type TEXT NOT NULL CHECK (need_type IN ('affection', 'dates', 'quality_time', 'compliments', 'appreciation', 'communication', 'intimacy', 'support')),
  intensity TEXT DEFAULT 'moderate' CHECK (intensity IN ('slight', 'moderate', 'significant')),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to track suggestions shown to partners
CREATE TABLE public.partner_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  need_id UUID REFERENCES public.relationship_needs(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  suggestion_text TEXT NOT NULL,
  shown_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.relationship_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for relationship_needs
CREATE POLICY "Users can view their own needs"
  ON public.relationship_needs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own needs"
  ON public.relationship_needs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own needs"
  ON public.relationship_needs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own needs"
  ON public.relationship_needs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for partner_suggestions
CREATE POLICY "Users can view their own suggestions"
  ON public.partner_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own suggestions"
  ON public.partner_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_relationship_needs_user ON public.relationship_needs(user_id);
CREATE INDEX idx_relationship_needs_relationship ON public.relationship_needs(relationship_id);
CREATE INDEX idx_relationship_needs_active ON public.relationship_needs(is_active) WHERE is_active = true;
CREATE INDEX idx_partner_suggestions_user ON public.partner_suggestions(user_id);
CREATE INDEX idx_partner_suggestions_shown ON public.partner_suggestions(shown_at) WHERE dismissed_at IS NULL AND completed_at IS NULL;

-- Function to create suggestions based on partner's needs
CREATE OR REPLACE FUNCTION create_partner_suggestions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  need_record RECORD;
  partner_id UUID;
  suggestion_text TEXT;
  suggestions TEXT[];
BEGIN
  FOR need_record IN
    SELECT rn.*, r.partner_a_id, r.partner_b_id
    FROM public.relationship_needs rn
    JOIN public.relationships r ON r.id = rn.relationship_id
    WHERE rn.is_active = true
  LOOP
    IF need_record.user_id = need_record.partner_a_id THEN
      partner_id := need_record.partner_b_id;
    ELSE
      partner_id := need_record.partner_a_id;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.partner_suggestions
      WHERE user_id = partner_id
      AND need_id = need_record.id
      AND shown_at > NOW() - INTERVAL '3 days'
    ) THEN
      CONTINUE;
    END IF;

    suggestions := ARRAY[]::TEXT[];

    CASE need_record.need_type
      WHEN 'affection' THEN
        suggestions := ARRAY[
          'Try surprising your partner with a warm hug today',
          'Leave a sweet note for your partner to find',
          'Hold hands during your next walk together',
          'Give your partner a gentle kiss on the forehead',
          'Cuddle up together while watching something',
          'Send a loving text message during the day',
          'Give your partner a shoulder massage',
          'Play with their hair while relaxing together'
        ];
      WHEN 'dates' THEN
        suggestions := ARRAY[
          'Plan a surprise date for this weekend',
          'Ask your partner out for dinner at their favorite restaurant',
          'Set up a cozy movie night at home',
          'Organize a picnic in a nearby park',
          'Book tickets for an activity you can enjoy together',
          'Plan a cooking date where you make dinner together',
          'Surprise them with a spontaneous coffee date',
          'Create a fun at-home date night with games and snacks'
        ];
      WHEN 'quality_time' THEN
        suggestions := ARRAY[
          'Put your phone away and have a meaningful conversation',
          'Plan an evening where you focus entirely on each other',
          'Cook a meal together tonight',
          'Take a walk together and talk about your day',
          'Start a new hobby or activity together',
          'Have breakfast together before starting your day',
          'Create a weekly ritual just for the two of you',
          'Turn off distractions and enjoy each other''s company'
        ];
      WHEN 'compliments' THEN
        suggestions := ARRAY[
          'Tell your partner something you appreciate about them',
          'Compliment their appearance today',
          'Acknowledge something they did really well recently',
          'Tell them why you''re proud to be with them',
          'Point out a quality you admire in them',
          'Compliment their personality or character',
          'Notice and praise their efforts on something',
          'Tell them how they make you feel loved'
        ];
      WHEN 'appreciation' THEN
        suggestions := ARRAY[
          'Thank your partner for something they do regularly',
          'Express gratitude for their efforts in the relationship',
          'Notice and acknowledge the little things they do',
          'Tell them how much you value their presence in your life',
          'Show appreciation for how they support you',
          'Recognize their contributions to your life together',
          'Express thanks for their patience and understanding',
          'Let them know you don''t take them for granted'
        ];
      WHEN 'communication' THEN
        suggestions := ARRAY[
          'Ask your partner how they''re really feeling',
          'Share something vulnerable about your day',
          'Check in with your partner about their needs',
          'Have an honest conversation about your relationship',
          'Listen actively when your partner talks to you',
          'Ask your partner about their dreams and goals',
          'Share your feelings more openly with them',
          'Make time for a deeper conversation today'
        ];
      WHEN 'intimacy' THEN
        suggestions := ARRAY[
          'Create a romantic atmosphere at home tonight',
          'Plan a sensual evening together',
          'Express your desire for your partner',
          'Initiate physical closeness with your partner',
          'Set aside time for intimacy without distractions',
          'Show your partner you find them attractive',
          'Create opportunities for private, intimate moments',
          'Be more affectionate and close with your partner'
        ];
      WHEN 'support' THEN
        suggestions := ARRAY[
          'Ask your partner if there''s anything you can help with',
          'Offer to take something off their plate today',
          'Check in on how stressed your partner has been',
          'Show up for your partner when they need you',
          'Encourage your partner in their goals',
          'Be their biggest cheerleader today',
          'Help with a task they''ve been putting off',
          'Listen without judgment when they need to vent'
        ];
    END CASE;

    suggestion_text := suggestions[1 + floor(random() * array_length(suggestions, 1))];

    INSERT INTO public.partner_suggestions (
      user_id,
      relationship_id,
      partner_id,
      need_id,
      suggestion_type,
      suggestion_text
    ) VALUES (
      partner_id,
      need_record.relationship_id,
      need_record.user_id,
      need_record.id,
      need_record.need_type,
      suggestion_text
    );
  END LOOP;
END;
$$;
