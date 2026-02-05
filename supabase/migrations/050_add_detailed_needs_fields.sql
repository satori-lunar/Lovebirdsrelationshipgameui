-- Add detailed fields to relationship_needs table
ALTER TABLE public.relationship_needs
  ADD COLUMN IF NOT EXISTS wish_partner_would_do TEXT,
  ADD COLUMN IF NOT EXISTS wish_partner_understood TEXT,
  ADD COLUMN IF NOT EXISTS duration_of_issue TEXT CHECK (duration_of_issue IN ('just_started', 'few_weeks', 'few_months', 'several_months', 'over_a_year')),
  ADD COLUMN IF NOT EXISTS have_talked_about_it BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS conversation_details TEXT,
  ADD COLUMN IF NOT EXISTS how_it_affects_me TEXT,
  ADD COLUMN IF NOT EXISTS ideal_outcome TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.relationship_needs.wish_partner_would_do IS 'What the user wishes their partner would do to address this need';
COMMENT ON COLUMN public.relationship_needs.wish_partner_understood IS 'What the user wishes their partner understood about this need';
COMMENT ON COLUMN public.relationship_needs.duration_of_issue IS 'How long this issue has been going on';
COMMENT ON COLUMN public.relationship_needs.have_talked_about_it IS 'Whether they have discussed this with their partner';
COMMENT ON COLUMN public.relationship_needs.conversation_details IS 'Details about any conversations they have had';
COMMENT ON COLUMN public.relationship_needs.how_it_affects_me IS 'How this need affects the user';
COMMENT ON COLUMN public.relationship_needs.ideal_outcome IS 'What the ideal outcome would look like';
