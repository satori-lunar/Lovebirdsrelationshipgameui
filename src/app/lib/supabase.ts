import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && 
         supabaseUrl !== '' && 
         supabaseAnonKey !== '' &&
         supabaseUrl.startsWith('http'));
};

// Enhanced logging for debugging (defer to avoid blocking)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('🔍 Supabase Configuration Check:');
    console.log('Environment:', import.meta.env.MODE);
    console.log('VITE_SUPABASE_URL:', supabaseUrl ? `✓ Set (${supabaseUrl.substring(0, 30)}...)` : '✗ Missing');
    console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `✓ Set (${supabaseAnonKey.substring(0, 20)}...)` : '✗ Missing');
    console.log('Is Configured:', isSupabaseConfigured());
  }, 0);
}

// Defer validation logging to avoid blocking initialization
if (typeof window !== 'undefined') {
  setTimeout(() => {
    if (!isSupabaseConfigured()) {
      console.error('❌ Supabase environment variables are not properly configured!');
      console.error('Please verify:');
      console.error('1. VITE_SUPABASE_URL is set in Vercel environment variables');
      console.error('2. VITE_SUPABASE_ANON_KEY is set in Vercel environment variables');
      console.error('3. Variables are enabled for Production environment');
      console.error('4. App has been redeployed after setting variables');
    }

    // Validate URL format
    if (supabaseUrl) {
      if (supabaseUrl.includes('supabase.com/dashboard')) {
        console.error('❌ ERROR: You are using the DASHBOARD URL instead of the API URL!');
        console.error('Current URL:', supabaseUrl);
        console.error('❌ WRONG: https://supabase.com/dashboard/project/...');
        console.error('✅ CORRECT: https://[project-ref].supabase.co');
        console.error('Please update VITE_SUPABASE_URL in Vercel to use the API endpoint.');
      } else if (!supabaseUrl.includes('.supabase.co')) {
        console.warn('⚠️ Supabase URL does not look correct:', supabaseUrl);
        console.warn('Expected format: https://[project-ref].supabase.co');
      }
    }
  }, 0);
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

// Test connection on initialization (non-blocking)
// Defer to avoid any initialization issues
if (isSupabaseConfigured() && typeof window !== 'undefined') {
  // Use requestIdleCallback or setTimeout to ensure module is fully loaded
  const testConnection = () => {
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
  };

  // Wait for next event loop to ensure supabase is fully initialized
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(testConnection, { timeout: 1000 });
  } else {
    setTimeout(testConnection, 100);
  }
}

