import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Defer auth initialization to ensure supabase client is fully loaded
    // This prevents "Cannot access 'r' before initialization" when modules load
    const initAuth = async () => {
      try {
        // Get initial session
        const session = await authService.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Failed to get initial session:', error);
        // Don't throw - just set no user
        setUser(null);
      } finally {
        setLoading(false);
      }

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );

      return subscription;
    };

    let subscription: { unsubscribe: () => void } | null = null;

    // Defer to next tick to ensure all modules are loaded
    setTimeout(() => {
      initAuth().then((sub) => {
        if (sub) subscription = sub;
      });
    }, 0);

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    const result = await authService.signUp(email, password, name);
    // After signup, refresh the user state
    if (result?.user) {
      // User is created, refresh to get the session
      await refreshUser();
    }
  };

  const signIn = async (email: string, password: string) => {
    await authService.signIn({ email, password });
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  const refreshUser = async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

