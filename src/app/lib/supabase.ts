import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && 
         supabaseUrl !== '' && 
         supabaseAnonKey !== '' &&
         supabaseUrl.startsWith('http'));
};

// Enhanced logging for debugging
console.log('🔍 Supabase Configuration Check:');
console.log('Environment:', import.meta.env.MODE);
console.log('VITE_SUPABASE_URL:', supabaseUrl ? `✓ Set (${supabaseUrl.substring(0, 30)}...)` : '✗ Missing');
console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `✓ Set (${supabaseAnonKey.substring(0, 20)}...)` : '✗ Missing');
console.log('Is Configured:', isSupabaseConfigured());

if (!isSupabaseConfigured()) {
  console.error('❌ Supabase environment variables are not properly configured!');
  console.error('Please verify:');
  console.error('1. VITE_SUPABASE_URL is set in Vercel environment variables');
  console.error('2. VITE_SUPABASE_ANON_KEY is set in Vercel environment variables');
  console.error('3. Variables are enabled for Production environment');
  console.error('4. App has been redeployed after setting variables');
}

// Validate URL format
if (supabaseUrl && !supabaseUrl.includes('supabase.co')) {
  console.warn('⚠️ Supabase URL does not look correct:', supabaseUrl);
}

// Always create client, but log warnings if not configured
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'x-client-info': 'love-birds-app',
      },
    },
  }
);

// Test connection on initialization
if (isSupabaseConfigured()) {
  // Test the connection
  supabase.auth.getSession()
    .then(() => {
      console.log('✅ Supabase connection test successful');
    })
    .catch((error) => {
      console.error('❌ Supabase connection test failed:', error);
      console.error('This might indicate:');
      console.error('- Network connectivity issues');
      console.error('- Incorrect Supabase URL');
      console.error('- Supabase project is paused or inactive');
      console.error('- CORS configuration issues');
    });
}

