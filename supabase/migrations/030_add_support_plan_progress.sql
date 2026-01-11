-- Add support plan progress tracking to relationship needs
-- This allows the NeedSupportPlan component to persist user progress across page refreshes

ALTER TABLE relationship_needs
ADD COLUMN support_plan_progress JSONB;

-- Add index for efficient querying
CREATE INDEX idx_relationship_needs_support_plan_progress
ON relationship_needs USING GIN (support_plan_progress);

-- Add comment for documentation
COMMENT ON COLUMN relationship_needs.support_plan_progress IS 'Tracks progress in the NeedSupportPlan component including completed actions and scheduled reminders';
