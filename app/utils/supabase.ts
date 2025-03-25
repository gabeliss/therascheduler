"use client";

import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';

// Make sure we're using the correct environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Regular client for authenticated and anonymous users
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'therascheduler-auth',
    storage: {
      getItem: (key) => {
        if (typeof window === 'undefined') {
          return null;
        }
        const value = localStorage.getItem(key);
        return value;
      },
      setItem: (key, value) => {
        if (typeof window !== 'undefined') {
          console.log('Setting auth in storage:', key);
          localStorage.setItem(key, value);
        }
      },
      removeItem: (key) => {
        if (typeof window !== 'undefined') {
          console.log('Removing auth from storage:', key);
          localStorage.removeItem(key);
        }
      },
    },
  },
});

// Service role client for admin operations (only use server-side)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl || '', supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Hook to use Supabase client with session management
export function useSupabase() {
  const [session, setSession] = useState<Session | null>(null);
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    
    return () => subscription.unsubscribe();
  }, []);
  
  return { supabase, session };
} 