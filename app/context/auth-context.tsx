'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';


interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {

      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('Attempting to sign in with email:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Sign in error:', error.message);
      throw error;
    }
    
    console.log('Sign in successful:', {
      userId: data.user?.id,
      email: data.user?.email,
      hasSession: !!data.session,
    });
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      // Step 1: Sign up the user with Supabase Auth
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (signUpError) {
        console.error('Sign up error:', signUpError.message);
        throw signUpError;
      }

      if (!data.user) {
        throw new Error('No user returned from sign up');
      }

      console.log('User signed up successfully:', data.user.id);

      // Step 2: Create therapist profile using API route
      const response = await fetch('/api/create-therapist-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: data.user.id,
          email: email,
          name: name,
        }),
      });
      
      console.log('Profile creation request sent with:', {
        userId: data.user.id,
        email,
        name
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Profile creation error:', errorData);
        // If profile creation fails, we should clean up the auth user
        await supabase.auth.signOut();
        throw new Error(errorData.error || 'Failed to create therapist profile');
      }

      
      // Note: At this point, the user needs to verify their email
      // before they can access their account
      return;

    } catch (error) {
      console.error('Signup process error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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