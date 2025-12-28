import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured = () => {
  return import.meta.env.VITE_SUPABASE_URL && 
         import.meta.env.VITE_SUPABASE_ANON_KEY &&
         import.meta.env.VITE_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
         import.meta.env.VITE_SUPABASE_ANON_KEY !== 'placeholder-key';
};

// Create client with placeholder values if not configured
// This prevents errors but API calls will fail gracefully
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable session persistence if not configured
    autoRefreshToken: false,
  },
});

