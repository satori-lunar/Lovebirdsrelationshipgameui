-- Quick fix to allow seeing partner's answers
-- Run this in Supabase SQL Editor

DROP POLICY IF EXISTS "Users can view their own answers" ON public.question_answers;

CREATE POLICY "Users can view their own and partner answers"
  ON public.question_answers FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.relationships
      WHERE (relationships.partner_a_id = auth.uid() AND relationships.partner_b_id = question_answers.user_id)
         OR (relationships.partner_b_id = auth.uid() AND relationships.partner_a_id = question_answers.user_id)
    )
  );
