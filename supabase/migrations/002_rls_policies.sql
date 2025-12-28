-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_guesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.love_language_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.important_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Relationships policies
CREATE POLICY "Users can view their own relationships"
  ON public.relationships FOR SELECT
  USING (auth.uid() = partner_a_id OR auth.uid() = partner_b_id);

CREATE POLICY "Users can create relationships"
  ON public.relationships FOR INSERT
  WITH CHECK (auth.uid() = partner_a_id);

CREATE POLICY "Users can update their relationships"
  ON public.relationships FOR UPDATE
  USING (auth.uid() = partner_a_id OR auth.uid() = partner_b_id);

-- Onboarding responses policies (private by default)
CREATE POLICY "Users can view their own onboarding"
  ON public.onboarding_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding"
  ON public.onboarding_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding"
  ON public.onboarding_responses FOR UPDATE
  USING (auth.uid() = user_id);

-- Daily questions policies
CREATE POLICY "Users can view questions for their relationships"
  ON public.daily_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = daily_questions.relationship_id
      AND (relationships.partner_a_id = auth.uid() OR relationships.partner_b_id = auth.uid())
    )
  );

CREATE POLICY "System can create daily questions"
  ON public.daily_questions FOR INSERT
  WITH CHECK (true);

-- Question answers policies (completely private)
CREATE POLICY "Users can view their own answers"
  ON public.question_answers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own answers"
  ON public.question_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own answers"
  ON public.question_answers FOR UPDATE
  USING (auth.uid() = user_id);

-- Question guesses policies (completely private)
CREATE POLICY "Users can view their own guesses"
  ON public.question_guesses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own guesses"
  ON public.question_guesses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own guesses"
  ON public.question_guesses FOR UPDATE
  USING (auth.uid() = user_id);

-- Love language suggestions policies
CREATE POLICY "Users can view their own suggestions"
  ON public.love_language_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create suggestions"
  ON public.love_language_suggestions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own suggestions"
  ON public.love_language_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

-- Date ideas policies
CREATE POLICY "Users can view dates for their relationships"
  ON public.date_ideas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = date_ideas.relationship_id
      AND (relationships.partner_a_id = auth.uid() OR relationships.partner_b_id = auth.uid())
    )
  );

CREATE POLICY "System can create date ideas"
  ON public.date_ideas FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update dates for their relationships"
  ON public.date_ideas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = date_ideas.relationship_id
      AND (relationships.partner_a_id = auth.uid() OR relationships.partner_b_id = auth.uid())
    )
  );

-- Date matches policies
CREATE POLICY "Users can view matches for their relationships"
  ON public.date_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = date_matches.relationship_id
      AND (relationships.partner_a_id = auth.uid() OR relationships.partner_b_id = auth.uid())
    )
  );

CREATE POLICY "System can create date matches"
  ON public.date_matches FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update matches for their relationships"
  ON public.date_matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = date_matches.relationship_id
      AND (relationships.partner_a_id = auth.uid() OR relationships.partner_b_id = auth.uid())
    )
  );

-- Important dates policies
CREATE POLICY "Users can view dates for their relationships"
  ON public.important_dates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = important_dates.relationship_id
      AND (relationships.partner_a_id = auth.uid() OR relationships.partner_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can create dates for their relationships"
  ON public.important_dates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = important_dates.relationship_id
      AND (relationships.partner_a_id = auth.uid() OR relationships.partner_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can update dates for their relationships"
  ON public.important_dates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = important_dates.relationship_id
      AND (relationships.partner_a_id = auth.uid() OR relationships.partner_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can delete dates for their relationships"
  ON public.important_dates FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = important_dates.relationship_id
      AND (relationships.partner_a_id = auth.uid() OR relationships.partner_b_id = auth.uid())
    )
  );

-- Memories policies
CREATE POLICY "Users can view memories for their relationships"
  ON public.memories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = memories.relationship_id
      AND (relationships.partner_a_id = auth.uid() OR relationships.partner_b_id = auth.uid())
    )
    AND (
      NOT memories.is_private
      OR memories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create memories for their relationships"
  ON public.memories FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.relationships
      WHERE relationships.id = memories.relationship_id
      AND (relationships.partner_a_id = auth.uid() OR relationships.partner_b_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own memories"
  ON public.memories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
  ON public.memories FOR DELETE
  USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

