-- Create table for saving partner insights/answers
CREATE TABLE IF NOT EXISTS public.saved_partner_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.daily_questions(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  partner_answer TEXT NOT NULL,
  user_guess TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure user can only save each question once
  UNIQUE(user_id, question_id)
);

-- Enable RLS
ALTER TABLE public.saved_partner_insights ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved insights
CREATE POLICY "Users can view their own saved insights"
  ON public.saved_partner_insights FOR SELECT
  USING (auth.uid() = user_id);

-- Users can save their own insights
CREATE POLICY "Users can save their own insights"
  ON public.saved_partner_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own saved insights
CREATE POLICY "Users can delete their own saved insights"
  ON public.saved_partner_insights FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS saved_partner_insights_user_id_idx ON public.saved_partner_insights(user_id);
CREATE INDEX IF NOT EXISTS saved_partner_insights_created_at_idx ON public.saved_partner_insights(created_at DESC);
