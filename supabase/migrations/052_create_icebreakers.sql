-- Create icebreaker questions and responses tables
-- Ice breakers provide conversation starters across different difficulty levels and topics

-- Icebreaker questions table
CREATE TABLE icebreaker_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Icebreaker responses table
CREATE TABLE icebreaker_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES icebreaker_questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    is_private BOOLEAN DEFAULT false,
    responded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(question_id, user_id, relationship_id)
);

-- RLS Policies for icebreaker_questions
ALTER TABLE icebreaker_questions ENABLE ROW LEVEL SECURITY;

-- Anyone can read active questions
CREATE POLICY "Anyone can read active icebreaker questions"
    ON icebreaker_questions FOR SELECT
    USING (is_active = true);

-- RLS Policies for icebreaker_responses
ALTER TABLE icebreaker_responses ENABLE ROW LEVEL SECURITY;

-- Users can insert their own responses
CREATE POLICY "Users can insert own icebreaker responses"
    ON icebreaker_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can read responses in their relationship (respecting privacy)
CREATE POLICY "Users can read icebreaker responses in relationship"
    ON icebreaker_responses FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM relationships
            WHERE relationships.id = icebreaker_responses.relationship_id
            AND (relationships.partner_a_id = auth.uid() OR relationships.partner_b_id = auth.uid())
        )
        AND (
            -- Can see own responses
            user_id = auth.uid()
            -- Can see partner's non-private responses
            OR is_private = false
        )
    );

-- Users can update their own responses
CREATE POLICY "Users can update own icebreaker responses"
    ON icebreaker_responses FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own responses
CREATE POLICY "Users can delete own icebreaker responses"
    ON icebreaker_responses FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_icebreaker_questions_category ON icebreaker_questions(category);
CREATE INDEX idx_icebreaker_questions_difficulty ON icebreaker_questions(difficulty);
CREATE INDEX idx_icebreaker_responses_relationship ON icebreaker_responses(relationship_id);
CREATE INDEX idx_icebreaker_responses_user ON icebreaker_responses(user_id);
CREATE INDEX idx_icebreaker_responses_question ON icebreaker_responses(question_id);

-- Pre-seed ice breaker questions across different categories

-- Fun & Light (easy)
INSERT INTO icebreaker_questions (question_text, category, difficulty) VALUES
('If you could have any superpower for a day, what would it be and what would you do?', 'Fun & Light', 'easy'),
('What''s the most embarrassing song you secretly love?', 'Fun & Light', 'easy'),
('If our relationship was a movie genre, what would it be?', 'Fun & Light', 'easy'),
('What''s your go-to karaoke song?', 'Fun & Light', 'easy'),
('If you could live in any fictional universe, which one would you choose?', 'Fun & Light', 'easy'),
('What''s the weirdest food combination you actually enjoy?', 'Fun & Light', 'easy'),
('If you could be any animal for a week, what would you be?', 'Fun & Light', 'easy'),
('What''s your most irrational fear?', 'Fun & Light', 'easy'),
('If you won the lottery tomorrow, what''s the first ridiculous thing you''d buy?', 'Fun & Light', 'easy'),
('What''s your signature dance move?', 'Fun & Light', 'easy');

-- Getting to Know You (easy to medium)
INSERT INTO icebreaker_questions (question_text, category, difficulty) VALUES
('My one thing is... (Complete this sentence with something unique about you)', 'Getting to Know You', 'easy'),
('What''s a talent or skill you have that most people don''t know about?', 'Getting to Know You', 'easy'),
('What was your childhood dream job?', 'Getting to Know You', 'easy'),
('What''s your perfect day off look like from start to finish?', 'Getting to Know You', 'medium'),
('What''s something you''re proud of that you don''t talk about often?', 'Getting to Know You', 'medium'),
('How do you recharge when you''re feeling drained?', 'Getting to Know You', 'medium'),
('What''s a belief or value you hold that you think is uncommon?', 'Getting to Know You', 'medium'),
('What does home mean to you?', 'Getting to Know You', 'medium'),
('What''s your love language and how did you discover it?', 'Getting to Know You', 'medium'),
('What''s something you wish people understood about you?', 'Getting to Know You', 'medium');

-- Deep Conversations (medium to hard)
INSERT INTO icebreaker_questions (question_text, category, difficulty) VALUES
('What''s a fear you''ve overcome, and what helped you do it?', 'Deep Conversations', 'medium'),
('When do you feel most like yourself?', 'Deep Conversations', 'medium'),
('What''s a painful experience that ultimately made you stronger?', 'Deep Conversations', 'hard'),
('What does vulnerability mean to you?', 'Deep Conversations', 'hard'),
('What''s something you''re still healing from?', 'Deep Conversations', 'hard'),
('How has your definition of love changed over the years?', 'Deep Conversations', 'hard'),
('What''s your biggest insecurity and where do you think it comes from?', 'Deep Conversations', 'hard'),
('What do you need most from a partner when you''re going through a hard time?', 'Deep Conversations', 'hard'),
('What''s a hard truth about yourself you''ve had to accept?', 'Deep Conversations', 'hard'),
('What does emotional safety mean to you in a relationship?', 'Deep Conversations', 'hard');

-- Life & Future (medium to hard)
INSERT INTO icebreaker_questions (question_text, category, difficulty) VALUES
('Where do you see yourself in 5 years?', 'Life & Future', 'medium'),
('What''s something you want to accomplish in the next year?', 'Life & Future', 'medium'),
('What does success look like to you?', 'Life & Future', 'medium'),
('What''s a dream you''ve never shared with anyone?', 'Life & Future', 'hard'),
('How do you want to be remembered?', 'Life & Future', 'hard'),
('What are your expectations for our future together?', 'Life & Future', 'hard'),
('What''s something you want to experience before you die?', 'Life & Future', 'medium'),
('If money wasn''t an issue, what would you do with your life?', 'Life & Future', 'medium'),
('What legacy do you want to leave behind?', 'Life & Future', 'hard'),
('What does your ideal life look like 10 years from now?', 'Life & Future', 'hard');

-- Relationship Dynamics (medium to hard)
INSERT INTO icebreaker_questions (question_text, category, difficulty) VALUES
('What makes you feel most loved by me?', 'Relationship Dynamics', 'medium'),
('What''s one thing I do that always makes you smile?', 'Relationship Dynamics', 'easy'),
('How can I better support you when you''re stressed?', 'Relationship Dynamics', 'medium'),
('What''s your favorite memory of us together?', 'Relationship Dynamics', 'easy'),
('What''s something you need more of from me in our relationship?', 'Relationship Dynamics', 'hard'),
('What are your expectations for how we handle conflicts?', 'Relationship Dynamics', 'hard'),
('What does a healthy relationship look like to you?', 'Relationship Dynamics', 'medium'),
('What''s one way I could make you feel more appreciated?', 'Relationship Dynamics', 'medium'),
('What''s your biggest fear about our relationship?', 'Relationship Dynamics', 'hard'),
('What''s something you wish we did more often together?', 'Relationship Dynamics', 'medium');

-- Intimate & Romance (medium)
INSERT INTO icebreaker_questions (question_text, category, difficulty) VALUES
('What makes you feel most connected to me?', 'Intimate & Romance', 'medium'),
('What''s your idea of a perfect romantic evening?', 'Intimate & Romance', 'easy'),
('When do you feel most attracted to me?', 'Intimate & Romance', 'medium'),
('What''s a romantic gesture that would make your heart melt?', 'Intimate & Romance', 'easy'),
('How do you like to be touched or held?', 'Intimate & Romance', 'medium'),
('What''s your favorite way to show affection?', 'Intimate & Romance', 'medium'),
('What makes you feel desired?', 'Intimate & Romance', 'medium'),
('What''s something romantic you''ve always wanted to try with me?', 'Intimate & Romance', 'medium'),
('How can I make you feel more special?', 'Intimate & Romance', 'medium'),
('What''s your favorite thing about our physical intimacy?', 'Intimate & Romance', 'medium');

-- Spicy & Sexual (hard)
INSERT INTO icebreaker_questions (question_text, category, difficulty) VALUES
('What''s your favorite thing about our sex life?', 'Spicy & Sexual', 'hard'),
('What''s a fantasy you''ve been curious about exploring?', 'Spicy & Sexual', 'hard'),
('How do you like to be seduced?', 'Spicy & Sexual', 'hard'),
('What''s something new you''d like to try in the bedroom?', 'Spicy & Sexual', 'hard'),
('What turns you on most about me?', 'Spicy & Sexual', 'hard'),
('What''s your biggest turn-on?', 'Spicy & Sexual', 'hard'),
('How can I make our intimate moments even better for you?', 'Spicy & Sexual', 'hard'),
('What''s something you find sexy that might surprise me?', 'Spicy & Sexual', 'hard'),
('What''s your favorite memory of us being intimate?', 'Spicy & Sexual', 'hard'),
('What makes you feel most confident during intimate moments?', 'Spicy & Sexual', 'hard');

-- "My One Thing Is..." (easy to medium)
INSERT INTO icebreaker_questions (question_text, category, difficulty) VALUES
('My one thing is... (something that always makes me happy)', 'My One Thing', 'easy'),
('My one thing is... (a quirk or habit I can''t break)', 'My One Thing', 'easy'),
('My one thing is... (something I''m secretly good at)', 'My One Thing', 'easy'),
('My one thing is... (a comfort item or routine I can''t live without)', 'My One Thing', 'easy'),
('My one thing is... (something I need when I''m having a bad day)', 'My One Thing', 'medium'),
('My one thing is... (a boundary I need respected)', 'My One Thing', 'medium'),
('My one thing is... (something I want to be known for)', 'My One Thing', 'medium'),
('My one thing is... (a non-negotiable in my relationships)', 'My One Thing', 'hard'),
('My one thing is... (something I''m working on improving about myself)', 'My One Thing', 'medium'),
('My one thing is... (what I value most in life)', 'My One Thing', 'medium');

-- Comments
COMMENT ON TABLE icebreaker_questions IS 'Conversation starter questions across different categories and difficulty levels';
COMMENT ON TABLE icebreaker_responses IS 'User responses to ice breaker questions';
COMMENT ON COLUMN icebreaker_questions.difficulty IS 'easy = light/fun topics, medium = deeper topics, hard = vulnerable/intimate topics';
COMMENT ON COLUMN icebreaker_responses.is_private IS 'If true, only the user can see their response';
