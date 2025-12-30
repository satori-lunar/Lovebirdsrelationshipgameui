-- Quick Apply: Partner Communications (Messages & Requests)
-- Run this in Supabase SQL Editor

-- Messages table for partner communications
CREATE TABLE IF NOT EXISTS public.partner_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('message', 'miss_you', 'thinking_of_you', 'love_note', 'compliment')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,

  CONSTRAINT different_users CHECK (sender_id != receiver_id)
);

-- Partner requests table (hugs, quality time, etc.)
CREATE TABLE IF NOT EXISTS public.partner_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('hug', 'quality_time', 'date_night', 'back_rub', 'cuddle', 'talk', 'help', 'surprise')),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,

  CONSTRAINT different_users_req CHECK (requester_id != receiver_id)
);

-- Weekly wishes responses table
CREATE TABLE IF NOT EXISTS public.weekly_wishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  wish_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, week_start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.partner_messages(receiver_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.partner_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_receiver ON public.partner_requests(receiver_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_requester ON public.partner_requests(requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_wishes_user ON public.weekly_wishes(user_id, week_start_date DESC);

-- Enable RLS
ALTER TABLE public.partner_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_wishes ENABLE ROW LEVEL SECURITY;

-- Messages policies
DROP POLICY IF EXISTS "Users can view their messages" ON public.partner_messages;
CREATE POLICY "Users can view their messages" ON public.partner_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.partner_messages;
CREATE POLICY "Users can send messages" ON public.partner_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update their received messages" ON public.partner_messages;
CREATE POLICY "Users can update their received messages" ON public.partner_messages
  FOR UPDATE USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can delete their messages" ON public.partner_messages;
CREATE POLICY "Users can delete their messages" ON public.partner_messages
  FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Requests policies
DROP POLICY IF EXISTS "Users can view their requests" ON public.partner_requests;
CREATE POLICY "Users can view their requests" ON public.partner_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can create requests" ON public.partner_requests;
CREATE POLICY "Users can create requests" ON public.partner_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update requests they received" ON public.partner_requests;
CREATE POLICY "Users can update requests they received" ON public.partner_requests
  FOR UPDATE USING (auth.uid() = receiver_id) WITH CHECK (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can delete their requests" ON public.partner_requests;
CREATE POLICY "Users can delete their requests" ON public.partner_requests
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Weekly wishes policies
DROP POLICY IF EXISTS "Users can view their wishes" ON public.weekly_wishes;
CREATE POLICY "Users can view their wishes" ON public.weekly_wishes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their wishes" ON public.weekly_wishes;
CREATE POLICY "Users can insert their wishes" ON public.weekly_wishes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their wishes" ON public.weekly_wishes;
CREATE POLICY "Users can update their wishes" ON public.weekly_wishes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their wishes" ON public.weekly_wishes;
CREATE POLICY "Users can delete their wishes" ON public.weekly_wishes
  FOR DELETE USING (auth.uid() = user_id);
