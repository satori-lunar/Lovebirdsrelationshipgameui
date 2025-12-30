-- Allow users to see their partner's answers (but not their guesses)
-- This lets users check if their guess was correct without revealing their guess to their partner

-- Update question_answers SELECT policy to allow seeing partner's answers
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

-- Keep question_guesses completely private (no changes needed)
-- The existing policy ensures guesses are never shared:
-- USING (auth.uid() = user_id)

COMMENT ON POLICY "Users can view their own and partner answers" ON public.question_answers IS
  'Allows users to see their own answers and their connected partner answers. Guesses remain completely private.';
