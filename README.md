
# Love Birds Relationship Game UI

A relationship-building app that helps couples understand each other better through daily questions, personalized date planning, gift guidance, and more.

## Features

- **Daily Partner Questions**: Answer questions individually, guess your partner's answers, and learn about each other privately
- **7-Day Free Trial**: Comprehensive onboarding with privacy-focused data collection
- **Partner Connection**: Invite code system to connect with your partner
- **Weekly Love Language Suggestions**: Personalized suggestions based on your partner's love language
- **Tailored Dates**: Plan dates for your partner or swipe together to find matches
- **Gift Guidance**: Thoughtful gift ideas based on partner preferences
- **Relationship Tracker**: Never forget important dates with smart reminders
- **Memories (Premium)**: Save photos and journal entries from your relationship

## Setup

### Prerequisites

- Node.js 18+ and npm/pnpm
- Supabase account (free tier works)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Lovebirdsrelationshipgameui
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Set up Supabase:
   - Create a new Supabase project at https://supabase.com
   - Go to SQL Editor and run the migrations in order:
     - `supabase/migrations/001_initial_schema.sql`
     - `supabase/migrations/002_rls_policies.sql`
   - Create a storage bucket named `memories` for photo uploads
   - Get your project URL and anon key from Settings > API

4. Create `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Run the development server:
```bash
npm run dev
# or
pnpm dev
```

## Database Setup

The app uses Supabase with the following main tables:
- `users` - User profiles and trial tracking
- `relationships` - Partner connections via invite codes
- `onboarding_responses` - Private onboarding data
- `daily_questions` - Daily question generation
- `question_answers` - Private user answers
- `question_guesses` - Private partner guesses
- `love_language_suggestions` - Weekly suggestions
- `date_ideas` - Generated date suggestions
- `date_matches` - Swipe matching results
- `important_dates` - Anniversaries and birthdays
- `memories` - Premium photo/journal entries
- `subscriptions` - Premium feature access

All tables have Row Level Security (RLS) enabled for privacy.

## Building for Production

```bash
npm run build
# or
pnpm build
```

The built files will be in the `dist/` directory.

## Project Structure

```
src/
  app/
    components/     # React components
    contexts/       # React contexts (Auth, etc.)
    hooks/          # Custom React hooks
    lib/            # Library setup (Supabase client)
    services/       # API service layer
    types/          # TypeScript type definitions
supabase/
  migrations/       # Database migration files
```

## Privacy & Security

- All sensitive onboarding data is marked private by default
- Partner never sees if guesses were wrong
- No scores or comparisons shared between partners
- Row Level Security (RLS) enforces data isolation
- Encrypted storage for sensitive fields

## License

Private project - All rights reserved
