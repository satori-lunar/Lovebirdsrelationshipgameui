-- Enhance memories table with title and category fields for better organization
ALTER TABLE public.memories
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('date_night', 'milestone', 'trip', 'everyday_moment', 'growth_moment', 'celebration', 'other'));

-- Update existing memories to have a default title if they don't have one
UPDATE public.memories
SET title = 'Memory from ' || TO_CHAR(memory_date, 'Month DD, YYYY')
WHERE title IS NULL;

-- Make title NOT NULL after populating existing records
ALTER TABLE public.memories
ALTER COLUMN title SET NOT NULL;

-- Add index for better performance on category filtering
CREATE INDEX IF NOT EXISTS idx_memories_category ON public.memories(category);
CREATE INDEX IF NOT EXISTS idx_memories_memory_date ON public.memories(memory_date);

-- Create a view for memory statistics (optional)
CREATE OR REPLACE VIEW public.memory_stats AS
SELECT
  relationship_id,
  COUNT(*) as total_memories,
  COUNT(CASE WHEN category = 'date_night' THEN 1 END) as date_night_count,
  COUNT(CASE WHEN category = 'milestone' THEN 1 END) as milestone_count,
  COUNT(CASE WHEN category = 'trip' THEN 1 END) as trip_count,
  COUNT(CASE WHEN category = 'everyday_moment' THEN 1 END) as everyday_count,
  COUNT(CASE WHEN category = 'growth_moment' THEN 1 END) as growth_count,
  COUNT(CASE WHEN category = 'celebration' THEN 1 END) as celebration_count,
  MAX(memory_date) as latest_memory_date,
  MIN(memory_date) as earliest_memory_date
FROM public.memories
GROUP BY relationship_id;
