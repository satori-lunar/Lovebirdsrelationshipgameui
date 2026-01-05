# Migration 022: Enhanced Partner Messages

## Overview
This migration adds support for:
- **Message Replies**: Reply to specific messages with context
- **Message Reactions**: React to messages with love, like, laugh, celebrate, or support
- **Saved Messages**: Bookmark special messages for later

## Files
- `022_enhance_partner_messages.sql` - Main migration file

## Changes

### 1. New Columns on `partner_messages` table:
- `reply_to_id` (UUID) - Reference to the message being replied to
- `is_saved` (BOOLEAN) - Whether the message is saved/favorited
- `saved_at` (TIMESTAMPTZ) - When the message was saved

### 2. New Table: `message_reactions`
- Stores reactions (love, like, laugh, celebrate, support) to messages
- Each user can have one reaction per message
- Includes RLS policies for security

### 3. Indexes
- Added indexes for performance on new columns
- Optimized queries for reactions and saved messages

## How to Apply

### Option 1: Using Supabase CLI (Recommended)
```bash
# Navigate to project root
cd /path/to/Lovebirdsrelationshipgameui

# Apply the migration
supabase db push
```

### Option 2: Using Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to SQL Editor
4. Copy the contents of `022_enhance_partner_messages.sql`
5. Paste and run the SQL

### Option 3: Direct SQL Execution
```bash
# Connect to your database
psql -h your-db-host -U postgres -d postgres

# Run the migration
\i supabase/migrations/022_enhance_partner_messages.sql
```

## Verification

After applying the migration, verify it worked:

```sql
-- Check if new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'partner_messages'
  AND column_name IN ('reply_to_id', 'is_saved', 'saved_at');

-- Check if reactions table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'message_reactions';

-- Check RLS policies
SELECT policyname, tablename
FROM pg_policies
WHERE tablename = 'message_reactions';
```

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Drop the reactions table
DROP TABLE IF EXISTS message_reactions CASCADE;

-- Remove new columns from partner_messages
ALTER TABLE partner_messages
  DROP COLUMN IF EXISTS reply_to_id,
  DROP COLUMN IF EXISTS is_saved,
  DROP COLUMN IF EXISTS saved_at;
```

## Impact
- **Breaking Changes**: None - all changes are additive
- **Backward Compatible**: Yes - existing functionality continues to work
- **Feature Flags**: Features gracefully degrade if migration not applied

## Related Issues
- Fixes blank AI suggestions in "Share what you need" feature
- Enables message reactions (love/like)
- Enables message replies
- Enables saving favorite messages
