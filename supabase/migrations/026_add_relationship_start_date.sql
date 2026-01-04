-- Migration to add relationship_start_date to relationships table
-- This allows storing the actual anniversary/relationship start date
-- instead of using when they joined the app

-- Add relationship_start_date column to relationships table
ALTER TABLE public.relationships
  ADD COLUMN IF NOT EXISTS relationship_start_date DATE;

-- Add comment to document the field
COMMENT ON COLUMN public.relationships.relationship_start_date IS 'The actual date when the relationship started (anniversary date), as opposed to when they joined the app';
