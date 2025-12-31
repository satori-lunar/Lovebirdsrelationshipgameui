-- Push notification tokens for widget gift alerts
-- Migration 018: Add push tokens table

-- Table to store user push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, token)
);

-- Index for quick token lookups
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can view own push tokens"
    ON push_tokens FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
    ON push_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
    ON push_tokens FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
    ON push_tokens FOR DELETE
    USING (auth.uid() = user_id);

-- Function to get partner's push tokens for sending notifications
CREATE OR REPLACE FUNCTION get_partner_push_tokens(partner_user_id UUID)
RETURNS TABLE (token TEXT, platform TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    caller_id UUID;
    relationship_exists BOOLEAN;
BEGIN
    caller_id := auth.uid();

    -- Verify caller has relationship with partner
    SELECT EXISTS(
        SELECT 1 FROM relationships
        WHERE (partner_a_id = caller_id AND partner_b_id = partner_user_id)
           OR (partner_b_id = caller_id AND partner_a_id = partner_user_id)
    ) INTO relationship_exists;

    IF NOT relationship_exists THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT pt.token, pt.platform
    FROM push_tokens pt
    WHERE pt.user_id = partner_user_id
      AND pt.is_active = true;
END;
$$;

-- Function to send push notification (placeholder - actual sending done via edge function)
-- This creates a notification queue entry
CREATE TABLE IF NOT EXISTS push_notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT
);

-- Index for processing queue
CREATE INDEX idx_push_queue_pending ON push_notification_queue(status, created_at)
    WHERE status = 'pending';

-- RLS for notification queue (only system can write, users can read own)
ALTER TABLE push_notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON push_notification_queue FOR SELECT
    USING (auth.uid() = recipient_id);

-- Trigger to queue push notification when widget gift is created
CREATE OR REPLACE FUNCTION notify_widget_gift_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sender_name TEXT;
BEGIN
    -- Get sender's name
    SELECT partner_name INTO sender_name
    FROM onboarding_responses
    WHERE user_id = NEW.receiver_id
    LIMIT 1;

    -- Default if not found
    IF sender_name IS NULL THEN
        sender_name := 'Your Partner';
    END IF;

    -- Queue the notification
    INSERT INTO push_notification_queue (recipient_id, title, body, data)
    VALUES (
        NEW.receiver_id,
        '💝 New Widget Gift!',
        sender_name || ' sent something to your home screen',
        jsonb_build_object(
            'type', 'widget_gift',
            'gift_id', NEW.id,
            'sender_id', NEW.sender_id
        )
    );

    RETURN NEW;
END;
$$;

-- Create trigger on widget_gifts table
DROP TRIGGER IF EXISTS on_widget_gift_created ON widget_gifts;
CREATE TRIGGER on_widget_gift_created
    AFTER INSERT ON widget_gifts
    FOR EACH ROW
    EXECUTE FUNCTION notify_widget_gift_received();

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_partner_push_tokens(UUID) TO authenticated;
