-- Migration: Add couple goals table
-- Description: Store shared relationship goals for couples
-- Date: 2026-01-03

-- Create couple_goals table
CREATE TABLE IF NOT EXISTS public.couple_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES public.relationships(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  completed BOOLEAN DEFAULT false,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.couple_goals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view goals for their own relationship
CREATE POLICY "Users can view their couple goals"
  ON public.couple_goals FOR SELECT
  USING (
    couple_id IN (
      SELECT id FROM public.relationships
      WHERE partner_a_id = auth.uid() OR partner_b_id = auth.uid()
    )
  );

-- Policy: Users can create goals for their own relationship
CREATE POLICY "Users can create goals for their relationship"
  ON public.couple_goals FOR INSERT
  WITH CHECK (
    couple_id IN (
      SELECT id FROM public.relationships
      WHERE partner_a_id = auth.uid() OR partner_b_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Policy: Users can update goals for their own relationship
CREATE POLICY "Users can update their couple goals"
  ON public.couple_goals FOR UPDATE
  USING (
    couple_id IN (
      SELECT id FROM public.relationships
      WHERE partner_a_id = auth.uid() OR partner_b_id = auth.uid()
    )
  );

-- Policy: Users can delete goals they created
CREATE POLICY "Users can delete goals they created"
  ON public.couple_goals FOR DELETE
  USING (created_by = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_couple_goals_couple_id ON public.couple_goals(couple_id);
CREATE INDEX IF NOT EXISTS idx_couple_goals_completed ON public.couple_goals(completed);

COMMENT ON TABLE public.couple_goals IS 'Shared relationship goals for couples';
