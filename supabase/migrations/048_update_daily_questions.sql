-- Update daily questions to be more specific and concrete
-- These questions help partners get to know each other better

-- First, clear existing questions to avoid duplicates
-- Use CASCADE to also clear dependent question_answers
TRUNCATE TABLE public.daily_questions CASCADE;

-- Insert updated questions with more specific, concrete "getting to know you" topics
INSERT INTO public.daily_questions (question_text, question_date, relationship_id) VALUES

-- 🎬 Favorites & Preferences
('What is your favorite movie of all time?', CURRENT_DATE, NULL),
('What is your favorite TV show?', CURRENT_DATE + INTERVAL '1 day', NULL),
('What is your favorite genre of movies?', CURRENT_DATE + INTERVAL '2 days', NULL),
('What is your favorite music artist or band?', CURRENT_DATE + INTERVAL '3 days', NULL),
('What is your favorite song right now?', CURRENT_DATE + INTERVAL '4 days', NULL),
('What is your favorite color?', CURRENT_DATE + INTERVAL '5 days', NULL),
('What is your favorite food?', CURRENT_DATE + INTERVAL '6 days', NULL),
('What is your favorite dessert?', CURRENT_DATE + INTERVAL '7 days', NULL),
('What is your favorite drink?', CURRENT_DATE + INTERVAL '8 days', NULL),
('What is your favorite snack?', CURRENT_DATE + INTERVAL '9 days', NULL),

-- 🏙️ Places & Experiences
('What is your favorite restaurant?', CURRENT_DATE + INTERVAL '10 days', NULL),
('What is your favorite place to visit?', CURRENT_DATE + INTERVAL '11 days', NULL),
('What is your favorite vacation destination?', CURRENT_DATE + INTERVAL '12 days', NULL),
('What is your favorite season of the year?', CURRENT_DATE + INTERVAL '13 days', NULL),
('What is your favorite holiday?', CURRENT_DATE + INTERVAL '14 days', NULL),
('What is your favorite city you''ve been to?', CURRENT_DATE + INTERVAL '15 days', NULL),
('What is your favorite outdoor activity?', CURRENT_DATE + INTERVAL '16 days', NULL),
('What is your favorite indoor activity?', CURRENT_DATE + INTERVAL '17 days', NULL),
('What is your favorite type of date?', CURRENT_DATE + INTERVAL '18 days', NULL),
('What is your favorite way to spend a weekend?', CURRENT_DATE + INTERVAL '19 days', NULL),

-- 🎁 Gifts & Special Things
('What is your favorite gift you''ve ever received?', CURRENT_DATE + INTERVAL '20 days', NULL),
('What is your favorite type of gift to receive?', CURRENT_DATE + INTERVAL '21 days', NULL),
('What is your favorite flower?', CURRENT_DATE + INTERVAL '22 days', NULL),
('What is your favorite scent or perfume?', CURRENT_DATE + INTERVAL '23 days', NULL),
('What is your favorite piece of clothing?', CURRENT_DATE + INTERVAL '24 days', NULL),
('What is your favorite accessory?', CURRENT_DATE + INTERVAL '25 days', NULL),
('What is your favorite book?', CURRENT_DATE + INTERVAL '26 days', NULL),
('What is your favorite childhood memory?', CURRENT_DATE + INTERVAL '27 days', NULL),
('What is your favorite thing about yourself?', CURRENT_DATE + INTERVAL '28 days', NULL),
('What is your favorite quality in other people?', CURRENT_DATE + INTERVAL '29 days', NULL),

-- 🎮 Hobbies & Interests
('What is your favorite hobby?', CURRENT_DATE + INTERVAL '30 days', NULL),
('What is your favorite sport to watch?', CURRENT_DATE + INTERVAL '31 days', NULL),
('What is your favorite sport to play?', CURRENT_DATE + INTERVAL '32 days', NULL),
('What is your favorite game?', CURRENT_DATE + INTERVAL '33 days', NULL),
('What is your favorite way to exercise?', CURRENT_DATE + INTERVAL '34 days', NULL),
('What is your favorite way to relax?', CURRENT_DATE + INTERVAL '35 days', NULL),
('What is your favorite thing to do on a rainy day?', CURRENT_DATE + INTERVAL '36 days', NULL),
('What is your favorite thing to do on a sunny day?', CURRENT_DATE + INTERVAL '37 days', NULL),
('What is your favorite type of art?', CURRENT_DATE + INTERVAL '38 days', NULL),
('What is your favorite creative outlet?', CURRENT_DATE + INTERVAL '39 days', NULL),

-- 🍽️ Food & Dining
('What is your favorite cuisine?', CURRENT_DATE + INTERVAL '40 days', NULL),
('What is your favorite breakfast food?', CURRENT_DATE + INTERVAL '41 days', NULL),
('What is your favorite lunch option?', CURRENT_DATE + INTERVAL '42 days', NULL),
('What is your favorite dinner meal?', CURRENT_DATE + INTERVAL '43 days', NULL),
('What is your favorite pizza topping?', CURRENT_DATE + INTERVAL '44 days', NULL),
('What is your favorite ice cream flavor?', CURRENT_DATE + INTERVAL '45 days', NULL),
('What is your favorite candy?', CURRENT_DATE + INTERVAL '46 days', NULL),
('What is your favorite beverage?', CURRENT_DATE + INTERVAL '47 days', NULL),
('What is your favorite coffee or tea?', CURRENT_DATE + INTERVAL '48 days', NULL),
('What is your favorite comfort food?', CURRENT_DATE + INTERVAL '49 days', NULL),

-- ⏰ Daily Life & Routines
('What is your favorite time of day?', CURRENT_DATE + INTERVAL '50 days', NULL),
('What is your favorite day of the week?', CURRENT_DATE + INTERVAL '51 days', NULL),
('What is your favorite thing about mornings?', CURRENT_DATE + INTERVAL '52 days', NULL),
('What is your favorite thing about evenings?', CURRENT_DATE + INTERVAL '53 days', NULL),
('Are you a morning person or night owl?', CURRENT_DATE + INTERVAL '54 days', NULL),
('What is your ideal wake-up time?', CURRENT_DATE + INTERVAL '55 days', NULL),
('What is your ideal bedtime?', CURRENT_DATE + INTERVAL '56 days', NULL),
('What is your favorite way to start the day?', CURRENT_DATE + INTERVAL '57 days', NULL),
('What is your favorite way to end the day?', CURRENT_DATE + INTERVAL '58 days', NULL),
('What is your favorite thing to do after work?', CURRENT_DATE + INTERVAL '59 days', NULL),

-- 🎭 Entertainment & Media
('What is your favorite actor or actress?', CURRENT_DATE + INTERVAL '60 days', NULL),
('What is your favorite comedian?', CURRENT_DATE + INTERVAL '61 days', NULL),
('What is your favorite YouTube channel or podcast?', CURRENT_DATE + INTERVAL '62 days', NULL),
('What is your favorite type of music?', CURRENT_DATE + INTERVAL '63 days', NULL),
('What is your favorite concert you''ve been to?', CURRENT_DATE + INTERVAL '64 days', NULL),
('What is your favorite video game?', CURRENT_DATE + INTERVAL '65 days', NULL),
('What is your favorite board game?', CURRENT_DATE + INTERVAL '66 days', NULL),
('What is your favorite card game?', CURRENT_DATE + INTERVAL '67 days', NULL),
('What is your favorite app on your phone?', CURRENT_DATE + INTERVAL '68 days', NULL),
('What is your favorite website?', CURRENT_DATE + INTERVAL '69 days', NULL),

-- 🌟 Personal & Emotional
('What is your favorite thing about our relationship?', CURRENT_DATE + INTERVAL '70 days', NULL),
('What is your favorite memory of us?', CURRENT_DATE + INTERVAL '71 days', NULL),
('What is your favorite quality about me?', CURRENT_DATE + INTERVAL '72 days', NULL),
('What is your favorite date we''ve had?', CURRENT_DATE + INTERVAL '73 days', NULL),
('What is your love language?', CURRENT_DATE + INTERVAL '74 days', NULL),
('What makes you feel most loved?', CURRENT_DATE + INTERVAL '75 days', NULL),
('What is your favorite way to show affection?', CURRENT_DATE + INTERVAL '76 days', NULL),
('What is your favorite compliment to receive?', CURRENT_DATE + INTERVAL '77 days', NULL),
('What is your favorite thing I do for you?', CURRENT_DATE + INTERVAL '78 days', NULL),
('What is your favorite nickname?', CURRENT_DATE + INTERVAL '79 days', NULL),

-- 🎯 Goals & Dreams
('What is your favorite accomplishment?', CURRENT_DATE + INTERVAL '80 days', NULL),
('What is your biggest dream?', CURRENT_DATE + INTERVAL '81 days', NULL),
('What is your favorite thing to learn about?', CURRENT_DATE + INTERVAL '82 days', NULL),
('What is your favorite skill you have?', CURRENT_DATE + INTERVAL '83 days', NULL),
('What is your favorite thing about your job?', CURRENT_DATE + INTERVAL '84 days', NULL),
('What is your dream job?', CURRENT_DATE + INTERVAL '85 days', NULL),
('What is your favorite place you want to visit?', CURRENT_DATE + INTERVAL '86 days', NULL),
('What is your favorite thing to do together?', CURRENT_DATE + INTERVAL '87 days', NULL),
('What is your dream date?', CURRENT_DATE + INTERVAL '88 days', NULL),
('What is your favorite tradition?', CURRENT_DATE + INTERVAL '89 days', NULL),

-- 🏠 Home & Comfort
('What is your favorite room in the house?', CURRENT_DATE + INTERVAL '90 days', NULL),
('What is your favorite thing to do at home?', CURRENT_DATE + INTERVAL '91 days', NULL),
('What is your favorite candle scent?', CURRENT_DATE + INTERVAL '92 days', NULL),
('What is your favorite temperature for the room?', CURRENT_DATE + INTERVAL '93 days', NULL),
('What is your favorite type of weather?', CURRENT_DATE + INTERVAL '94 days', NULL),
('What is your favorite animal?', CURRENT_DATE + INTERVAL '95 days', NULL),
('What is your favorite pet?', CURRENT_DATE + INTERVAL '96 days', NULL),
('What is your favorite thing to wear at home?', CURRENT_DATE + INTERVAL '97 days', NULL),
('What is your favorite way to celebrate?', CURRENT_DATE + INTERVAL '98 days', NULL),
('What is your favorite simple pleasure?', CURRENT_DATE + INTERVAL '99 days', NULL);

-- Note: These questions are not tied to specific relationships initially
-- They can be used as templates for generating daily questions for couples
-- The relationship_id is NULL, meaning these are global question templates
