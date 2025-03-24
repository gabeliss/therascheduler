import { useState, useEffect } from 'react';
import { useSupabase } from '@/app/utils/supabase';
import { TherapistProfile } from '@/app/types/index';
import { useAuth } from '@/app/context/auth-context';

export function useTherapistProfile() {
  const [therapistProfile, setTherapistProfile] = useState<TherapistProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { supabase } = useSupabase();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchTherapistProfile();
    } else {
      setLoading(false);
      setTherapistProfile(null);
    }
  }, [user]);

  async function fetchTherapistProfile() {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        setError('Not authenticated. Please sign in.');
        setLoading(false);
        return;
      }
      
      // Query the database for the therapist profile
      const { data: profiles, error: queryError } = await supabase
        .from('therapists')
        .select('*')
        .eq('user_id', user.id);
      
      if (queryError) {
        console.error('Error querying therapist profile:', queryError);
        throw new Error(`Error querying therapist profile: ${queryError.message}`);
      }
      
      if (profiles && profiles.length > 0) {
        setTherapistProfile(profiles[0] as TherapistProfile);
        setLoading(false);
        return;
      }
      
      // If no profile found by user_id, try email query as fallback
      const { data: emailProfiles, error: emailError } = await supabase
        .from('therapists')
        .select('*')
        .eq('email', user.email);
      
      console.log('Email query result:', { data: emailProfiles, error: emailError });
      
      if (emailProfiles && emailProfiles.length > 0) {
        console.log('Found profile by email:', emailProfiles[0]);
        setTherapistProfile(emailProfiles[0] as TherapistProfile);
        
        // Try to update the user_id in the background
        try {
          const { error: updateError } = await supabase
            .from('therapists')
            .update({ user_id: user.id })
            .eq('id', emailProfiles[0].id);
          
          if (updateError) {
            console.error('Error updating profile user_id:', updateError);
          } else {
            console.log('Updated profile user_id successfully');
          }
        } catch (updateError) {
          console.error('Error updating profile:', updateError);
        }
        
        setLoading(false);
        return;
      }
      
      // If no profile found, try to create one using the database function
      const { data: newProfile, error: createError } = await supabase
        .from('therapists')
        .insert([
          {
            user_id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0],
          }
        ])
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating profile:', createError);
        throw new Error(`Error creating profile: ${createError.message}`);
      }
      
      if (newProfile) {
        console.log('Created new profile:', newProfile);
        
        // Use the returned profile data directly
        setTherapistProfile(newProfile as TherapistProfile);
        setLoading(false);
        
        // Refresh the profile in the background after a short delay
        setTimeout(async () => {
          const { data: refreshedProfiles, error: refreshError } = await supabase
            .from('therapists')
            .select('*')
            .eq('id', newProfile.id);
            
          if (!refreshError && refreshedProfiles && refreshedProfiles.length > 0) {
            console.log('Refreshed profile:', refreshedProfiles[0]);
            setTherapistProfile(refreshedProfiles[0] as TherapistProfile);
          }
        }, 1000);
        
        return;
      }
      
      console.error('No therapist profile found and creation failed');
      setError('Could not create or retrieve therapist profile. Please try refreshing the page or contact support.');
    } catch (err: any) {
      console.error('Error in fetchTherapistProfile:', err);
      setError(err.message || 'Could not create or retrieve therapist profile. Please try refreshing the page or contact support.');
    } finally {
      setLoading(false);
    }
  }

  return { therapistProfile, loading, error, refetch: fetchTherapistProfile };
} 