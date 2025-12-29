-- Add comprehensive daily questions to the database
-- These questions help the system learn about user preferences and relationship dynamics

-- Insert all the questions organized by category
-- Note: relationship_id is NULL for global question templates
INSERT INTO public.daily_questions (question_text, question_date, relationship_id) VALUES

-- 🎬 Favorites & Preferences
('What''s your partner''s favorite movie?', CURRENT_DATE, NULL),
('What''s their go-to comfort TV show?', CURRENT_DATE + INTERVAL '1 day', NULL),
('What genre do they enjoy most?', CURRENT_DATE + INTERVAL '2 days', NULL),
('What''s their favorite music artist or band?', CURRENT_DATE + INTERVAL '3 days', NULL),
('What''s their favorite song right now?', CURRENT_DATE + INTERVAL '4 days', NULL),
('What''s their favorite way to spend a free evening?', CURRENT_DATE + INTERVAL '5 days', NULL),
('What''s their favorite meal?', CURRENT_DATE + INTERVAL '6 days', NULL),
('What''s their favorite dessert?', CURRENT_DATE + INTERVAL '7 days', NULL),
('What''s their favorite drink?', CURRENT_DATE + INTERVAL '8 days', NULL),
('What''s their favorite snack?', CURRENT_DATE + INTERVAL '9 days', NULL),

-- 🕰 Daily Habits & Routines
('Is your partner a morning person or night owl?', CURRENT_DATE + INTERVAL '10 days', NULL),
('What''s their ideal wake-up time?', CURRENT_DATE + INTERVAL '11 days', NULL),
('How do they usually unwind after work?', CURRENT_DATE + INTERVAL '12 days', NULL),
('What''s their favorite way to relax?', CURRENT_DATE + INTERVAL '13 days', NULL),
('How do they prefer to spend weekends?', CURRENT_DATE + INTERVAL '14 days', NULL),
('What''s one thing they always make time for?', CURRENT_DATE + INTERVAL '15 days', NULL),
('What''s their typical stress response?', CURRENT_DATE + INTERVAL '16 days', NULL),
('Do they like routines or flexibility?', CURRENT_DATE + INTERVAL '17 days', NULL),
('What''s their favorite time of day?', CURRENT_DATE + INTERVAL '18 days', NULL),
('What''s their least favorite chore?', CURRENT_DATE + INTERVAL '19 days', NULL),

-- ❤️ Love & Affection
('Which love language matters most to your partner?', CURRENT_DATE + INTERVAL '20 days', NULL),
('How does your partner most often show love?', CURRENT_DATE + INTERVAL '21 days', NULL),
('What makes your partner feel appreciated?', CURRENT_DATE + INTERVAL '22 days', NULL),
('How do they like affection to be shown?', CURRENT_DATE + INTERVAL '23 days', NULL),
('What kind of compliments mean the most to them?', CURRENT_DATE + INTERVAL '24 days', NULL),
('What helps them feel emotionally safe?', CURRENT_DATE + INTERVAL '25 days', NULL),
('How do they prefer comfort when stressed?', CURRENT_DATE + INTERVAL '26 days', NULL),
('What makes them feel chosen?', CURRENT_DATE + INTERVAL '27 days', NULL),
('What''s a small gesture that means a lot to them?', CURRENT_DATE + INTERVAL '28 days', NULL),
('How do they like to reconnect after a long day?', CURRENT_DATE + INTERVAL '29 days', NULL),

-- 📅 Dates & Experiences
('What''s your partner''s ideal date?', CURRENT_DATE + INTERVAL '30 days', NULL),
('Do they prefer planned dates or spontaneous ones?', CURRENT_DATE + INTERVAL '31 days', NULL),
('Do they enjoy staying in or going out more?', CURRENT_DATE + INTERVAL '32 days', NULL),
('What type of date energizes them?', CURRENT_DATE + INTERVAL '33 days', NULL),
('How often would they ideally like dates?', CURRENT_DATE + INTERVAL '34 days', NULL),
('Would they enjoy an adventurous date?', CURRENT_DATE + INTERVAL '35 days', NULL),
('What''s their favorite kind of quality time?', CURRENT_DATE + INTERVAL '36 days', NULL),
('What kind of date helps them relax?', CURRENT_DATE + INTERVAL '37 days', NULL),
('What''s a date they''d be excited about?', CURRENT_DATE + INTERVAL '38 days', NULL),
('What makes a date feel special to them?', CURRENT_DATE + INTERVAL '39 days', NULL),

-- 🎁 Gifts & Surprises
('Does your partner prefer experiences or physical gifts?', CURRENT_DATE + INTERVAL '40 days', NULL),
('How do they feel about surprise gifts?', CURRENT_DATE + INTERVAL '41 days', NULL),
('What kind of gift feels most thoughtful to them?', CURRENT_DATE + INTERVAL '42 days', NULL),
('Do they like sentimental or practical gifts?', CURRENT_DATE + INTERVAL '43 days', NULL),
('What''s a small gift they''d enjoy?', CURRENT_DATE + INTERVAL '44 days', NULL),
('How important is personalization in gifts for them?', CURRENT_DATE + INTERVAL '45 days', NULL),
('What gift would make them feel seen?', CURRENT_DATE + INTERVAL '46 days', NULL),
('Do they like receiving gifts publicly or privately?', CURRENT_DATE + INTERVAL '47 days', NULL),
('What''s a gift they''d probably love?', CURRENT_DATE + INTERVAL '48 days', NULL),
('What''s a gift they''d rather avoid?', CURRENT_DATE + INTERVAL '49 days', NULL),

-- 🧠 Personality & Values
('Is your partner more introverted or extroverted?', CURRENT_DATE + INTERVAL '50 days', NULL),
('How do they usually recharge?', CURRENT_DATE + INTERVAL '51 days', NULL),
('What motivates them most?', CURRENT_DATE + INTERVAL '52 days', NULL),
('What stresses them out?', CURRENT_DATE + INTERVAL '53 days', NULL),
('What makes them feel confident?', CURRENT_DATE + INTERVAL '54 days', NULL),
('What value matters most to them?', CURRENT_DATE + INTERVAL '55 days', NULL),
('What kind of environment helps them thrive?', CURRENT_DATE + INTERVAL '56 days', NULL),
('How do they handle change?', CURRENT_DATE + INTERVAL '57 days', NULL),
('What makes them feel respected?', CURRENT_DATE + INTERVAL '58 days', NULL),
('What kind of support do they need most?', CURRENT_DATE + INTERVAL '59 days', NULL),

-- 🏡 Home & Everyday Life
('What makes your partner feel at peace at home?', CURRENT_DATE + INTERVAL '60 days', NULL),
('What household task do they appreciate help with?', CURRENT_DATE + INTERVAL '61 days', NULL),
('How do they like mornings to feel?', CURRENT_DATE + INTERVAL '62 days', NULL),
('What makes a space feel comfortable to them?', CURRENT_DATE + INTERVAL '63 days', NULL),
('What small effort makes daily life easier for them?', CURRENT_DATE + INTERVAL '64 days', NULL),
('How do they like to wind down at night?', CURRENT_DATE + INTERVAL '65 days', NULL),
('What routine helps them feel grounded?', CURRENT_DATE + INTERVAL '66 days', NULL),
('What makes them feel supported during busy weeks?', CURRENT_DATE + INTERVAL '67 days', NULL),
('What everyday habit matters to them?', CURRENT_DATE + INTERVAL '68 days', NULL),
('What''s something practical they''d love help with?', CURRENT_DATE + INTERVAL '69 days', NULL),

-- 💬 Communication & Conflict
('How does your partner prefer to talk through issues?', CURRENT_DATE + INTERVAL '70 days', NULL),
('What shuts them down during conflict?', CURRENT_DATE + INTERVAL '71 days', NULL),
('Do they need space or closeness after disagreements?', CURRENT_DATE + INTERVAL '72 days', NULL),
('What helps them feel heard?', CURRENT_DATE + INTERVAL '73 days', NULL),
('How do they like apologies to be expressed?', CURRENT_DATE + INTERVAL '74 days', NULL),
('What rebuilds trust for them?', CURRENT_DATE + INTERVAL '75 days', NULL),
('How do they express frustration?', CURRENT_DATE + INTERVAL '76 days', NULL),
('What makes hard conversations easier for them?', CURRENT_DATE + INTERVAL '77 days', NULL),
('What communication habit matters most to them?', CURRENT_DATE + INTERVAL '78 days', NULL),
('What helps them feel understood?', CURRENT_DATE + INTERVAL '79 days', NULL),

-- 🕰 Memories, Meaning & Intimacy
('What kind of moments mean the most to your partner?', CURRENT_DATE + INTERVAL '80 days', NULL),
('What helps them feel emotionally close?', CURRENT_DATE + INTERVAL '81 days', NULL),
('What makes a moment feel special to them?', CURRENT_DATE + INTERVAL '82 days', NULL),
('How do they like celebrating milestones?', CURRENT_DATE + INTERVAL '83 days', NULL),
('What kind of memories do they want more of?', CURRENT_DATE + INTERVAL '84 days', NULL),
('What deepens connection for them?', CURRENT_DATE + INTERVAL '85 days', NULL),
('What makes them feel secure?', CURRENT_DATE + INTERVAL '86 days', NULL),
('What strengthens trust for them?', CURRENT_DATE + INTERVAL '87 days', NULL),
('What helps intimacy grow for them?', CURRENT_DATE + INTERVAL '88 days', NULL),
('What makes love feel sustainable to them?', CURRENT_DATE + INTERVAL '89 days', NULL),

-- 🌟 Fun & Lighthearted
('What''s their favorite way to spend a lazy day?', CURRENT_DATE + INTERVAL '90 days', NULL),
('What food could they eat every week?', CURRENT_DATE + INTERVAL '91 days', NULL),
('What kind of humor do they love?', CURRENT_DATE + INTERVAL '92 days', NULL),
('What''s something that always makes them smile?', CURRENT_DATE + INTERVAL '93 days', NULL),
('What''s their dream vacation vibe?', CURRENT_DATE + INTERVAL '94 days', NULL),
('What would they choose for a perfect day?', CURRENT_DATE + INTERVAL '95 days', NULL),
('What''s something they secretly love?', CURRENT_DATE + INTERVAL '96 days', NULL),
('What''s a simple pleasure they enjoy?', CURRENT_DATE + INTERVAL '97 days', NULL),
('What would make today better for them?', CURRENT_DATE + INTERVAL '98 days', NULL),
('What''s something small that makes them feel happy?', CURRENT_DATE + INTERVAL '99 days', NULL);

-- Note: These questions are not tied to specific relationships initially
-- They can be used as templates for generating daily questions for couples
-- The relationship_id is NULL, meaning these are global question templates
