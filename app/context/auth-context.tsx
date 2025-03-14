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

  // Check for user in localStorage on initial load
  useEffect(() => {
    try {
      // Try to get user from localStorage first for faster initial load
      const storedUser = localStorage.getItem('therascheduler-user');
      if (storedUser) {
        console.log('Found user in localStorage');
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        setLoading(true);
        console.log('Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          return;
        }
        
        console.log('Session found:', !!session);
        
        if (session?.user) {
          setUser(session.user);
          // Store user in localStorage for persistence
          try {
            localStorage.setItem('therascheduler-user', JSON.stringify(session.user));
          } catch (error) {
            console.error('Error storing user in localStorage:', error);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, !!session);
      
      if (session?.user) {
        setUser(session.user);
        // Update user in localStorage
        try {
          localStorage.setItem('therascheduler-user', JSON.stringify(session.user));
        } catch (error) {
          console.error('Error storing user in localStorage:', error);
        }
      } else {
        setUser(null);
        // Remove user from localStorage
        try {
          localStorage.removeItem('therascheduler-user');
        } catch (error) {
          console.error('Error removing user from localStorage:', error);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('Attempting to sign in with email:', email);
    setLoading(true);
    
    try {
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
  
      // Explicitly set the user state after successful login
      if (data.user) {
        setUser(data.user);
        // Store user in localStorage
        try {
          localStorage.setItem('therascheduler-user', JSON.stringify(data.user));
        } catch (error) {
          console.error('Error storing user in localStorage:', error);
        }
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
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
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error.message);
        throw error;
      }
      
      // Clear user from localStorage
      try {
        localStorage.removeItem('therascheduler-user');
      } catch (error) {
        console.error('Error removing user from localStorage:', error);
      }
      
      setUser(null);
    } catch (error) {
      console.error('Error during sign out:', error);
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