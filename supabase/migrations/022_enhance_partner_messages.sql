-- Migration: Enhance Partner Messages
-- Description: Add reply, reactions, and save functionality to messages
-- Date: 2026-01-05

-- Add new columns to partner_messages table
ALTER TABLE public.partner_messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.partner_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ;

-- Create message_reactions table for tracking reactions (love, like, etc.)
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.partner_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('love', 'like', 'laugh', 'celebrate', 'support')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- A user can only have one reaction per message
  UNIQUE(message_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.partner_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_saved ON public.partner_messages(receiver_id, is_saved) WHERE is_saved = TRUE;
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id, reaction_type);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON public.message_reactions(user_id);

-- Row Level Security for message_reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reactions" ON public.message_reactions;
CREATE POLICY "Users can view reactions" ON public.message_reactions
  FOR SELECT USING (
    user_id = auth.uid() OR
    message_id IN (
      SELECT id FROM public.partner_messages
      WHERE sender_id = auth.uid() OR receiver_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
CREATE POLICY "Users can add reactions" ON public.message_reactions
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    message_id IN (
      SELECT id FROM public.partner_messages
      WHERE sender_id = auth.uid() OR receiver_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own reactions" ON public.message_reactions;
CREATE POLICY "Users can delete own reactions" ON public.message_reactions
  FOR DELETE USING (user_id = auth.uid());

-- Comments
COMMENT ON COLUMN public.partner_messages.reply_to_id IS 'Reference to the message being replied to';
COMMENT ON COLUMN public.partner_messages.is_saved IS 'Whether the receiver has saved/favorited this message';
COMMENT ON COLUMN public.partner_messages.saved_at IS 'When the message was saved';
COMMENT ON TABLE public.message_reactions IS 'Reactions (love, like, etc.) to partner messages';
