-- Create couple challenges system
-- Run this in the Supabase SQL Editor to enable couple challenges feature

-- Create couple_challenges table (pre-populated challenges)
CREATE TABLE IF NOT EXISTS public.couple_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('memory_reflection', 'communication_emotional', 'appreciation_affirmation', 'fun_playful', 'future_vision')),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create couple_challenge_responses table (user responses)
CREATE TABLE IF NOT EXISTS public.couple_challenge_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.couple_challenges(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  is_visible_to_partner BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.couple_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_challenge_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for couple_challenges (everyone can read challenges)
DROP POLICY IF EXISTS "Everyone can view challenges" ON public.couple_challenges;
CREATE POLICY "Everyone can view challenges"
  ON public.couple_challenges FOR SELECT
  USING (true);

-- RLS Policies for couple_challenge_responses
DROP POLICY IF EXISTS "Users can view their own responses" ON public.couple_challenge_responses;
CREATE POLICY "Users can view their own responses"
  ON public.couple_challenge_responses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view partner's responses" ON public.couple_challenge_responses;
CREATE POLICY "Users can view partner's responses"
  ON public.couple_challenge_responses FOR SELECT
  USING (
    is_visible_to_partner = true AND
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = couple_challenge_responses.relationship_id
      AND (relationships.partner_a_id = auth.uid() OR relationships.partner_b_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert their own responses" ON public.couple_challenge_responses;
CREATE POLICY "Users can insert their own responses"
  ON public.couple_challenge_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own responses" ON public.couple_challenge_responses;
CREATE POLICY "Users can update their own responses"
  ON public.couple_challenge_responses FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own responses" ON public.couple_challenge_responses;
CREATE POLICY "Users can delete their own responses"
  ON public.couple_challenge_responses FOR DELETE
  USING (auth.uid() = user_id);

-- Insert challenge data (only if not already exists)
INSERT INTO public.couple_challenges (category, title, prompt)
SELECT * FROM (VALUES
  -- Memory & Reflection Challenges
  ('memory_reflection', 'Favorite Memory', 'Choose a photo that represents your favorite memory of us and explain why.'),
  ('memory_reflection', 'Closest Moment', 'Share a moment when you felt closest to me.'),
  ('memory_reflection', 'Overcome Together', 'Name one challenge we''ve overcome together and what it taught you.'),
  ('memory_reflection', 'Letter to Future Us', 'Write a short letter to "us" one year from now.'),
  ('memory_reflection', 'Falling in Love', 'Describe the first time you realized you were falling in love with me.'),
  ('memory_reflection', 'Our Song', 'Pick a song that reminds you of our relationship and explain why.'),
  ('memory_reflection', 'Small Moment', 'Share a small moment that meant more to you than I probably realized.'),
  ('memory_reflection', 'Appreciated Habit', 'What''s one habit of mine you''ve grown to appreciate over time?'),

  -- Communication & Emotional Connection
  ('communication_emotional', 'Most Loved When', 'Finish the sentence: "I feel most loved by you when…"'),
  ('communication_emotional', 'Afraid to Say', 'Share one thing you''ve been afraid to say but want me to know.'),
  ('communication_emotional', 'Ask Me Anything', 'Ask one question you''ve always wanted to ask me (no judgment).'),
  ('communication_emotional', 'Helped Me Grow', 'Name one way I''ve helped you grow as a person.'),
  ('communication_emotional', 'Current Need', 'Express one need you have right now in our relationship.'),
  ('communication_emotional', 'Insecurity & Safety', 'Share one insecurity and what helps you feel safe with it.'),
  ('communication_emotional', 'Genuine Compliment', 'Give a genuine compliment that''s not about appearance.'),

  -- Appreciation & Affirmation
  ('appreciation_affirmation', 'Three Things', 'List three things I do that make you feel loved.'),
  ('appreciation_affirmation', 'Thank You', 'Say thank you for something I do regularly but rarely get credit for.'),
  ('appreciation_affirmation', 'Admired Quality', 'Name one quality of mine you admire most.'),
  ('appreciation_affirmation', 'Proud Moment', 'Share a moment where you felt proud to be my partner.'),
  ('appreciation_affirmation', 'Your Strength', 'Affirm one strength you see in me that I may not see in myself.'),

  -- Fun & Playful Challenges
  ('fun_playful', 'Recreate First Date', 'Recreate our first date (or plan how you would).'),
  ('fun_playful', 'Reminded Me of You', 'Send a photo of something today that made you think of me.'),
  ('fun_playful', 'Nickname Story', 'Choose a nickname for me and explain the story behind it.'),
  ('fun_playful', 'Three Emojis', 'Describe our relationship using only three emojis.'),
  ('fun_playful', 'Movie Title', 'Create a fake movie title based on our love story.'),
  ('fun_playful', 'Future Adventure', 'Pick a future adventure you want us to experience together.'),

  -- Future & Vision
  ('future_vision', 'Five Years From Now', 'Describe a perfect day together five years from now.'),
  ('future_vision', 'Our Dream', 'Share one dream you hope we accomplish together.'),
  ('future_vision', 'New Tradition', 'Name one tradition you want us to start.'),
  ('future_vision', 'I Choose You', 'Finish this sentence: "I choose you because…"')
) AS v(category, title, prompt)
WHERE NOT EXISTS (
  SELECT 1 FROM public.couple_challenges WHERE couple_challenges.title = v.title
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_challenge_responses_relationship ON public.couple_challenge_responses(relationship_id);
CREATE INDEX IF NOT EXISTS idx_challenge_responses_user ON public.couple_challenge_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_responses_challenge ON public.couple_challenge_responses(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenges_category ON public.couple_challenges(category);
