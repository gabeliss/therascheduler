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
    console.log('Fetching therapist profile...');

    try {
      if (!user) {
        console.log('No authenticated user');
        setError('Not authenticated. Please sign in.');
        setLoading(false);
        return;
      }

      console.log('User authenticated:', user.id);
      console.log('User email:', user.email);
      
      // Query the database for the therapist profile
      const { data: profiles, error: queryError } = await supabase
        .from('therapist_profiles')
        .select('*')
        .eq('user_id', user.id);
      
      console.log('Query result:', { data: profiles, error: queryError });
      
      if (queryError) {
        console.error('Error querying therapist profile:', queryError);
        throw new Error(`Error querying therapist profile: ${queryError.message}`);
      }
      
      if (profiles && profiles.length > 0) {
        console.log('Found profile:', profiles[0]);
        setTherapistProfile(profiles[0] as TherapistProfile);
        setLoading(false);
        return;
      }
      
      // If no profile found by user_id, try email query as fallback
      const { data: emailProfiles, error: emailError } = await supabase
        .from('therapist_profiles')
        .select('*')
        .eq('email', user.email);
      
      console.log('Email query result:', { data: emailProfiles, error: emailError });
      
      if (emailProfiles && emailProfiles.length > 0) {
        console.log('Found profile by email:', emailProfiles[0]);
        setTherapistProfile(emailProfiles[0] as TherapistProfile);
        
        // Try to update the user_id in the background
        try {
          const { error: updateError } = await supabase
            .from('therapist_profiles')
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
      const { data: newProfile, error: createError } = await supabase.rpc(
        'create_therapist_profile_for_user',
        {
          p_user_id: user.id,
          p_email: user.email,
          p_name: user.user_metadata?.name || user.email?.split('@')[0],
        }
      );
      
      if (createError) {
        console.error('Error creating profile:', createError);
        throw new Error(`Error creating profile: ${createError.message}`);
      }
      
      if (newProfile) {
        console.log('Created new profile:', newProfile);
        
        // The profile was just created, use the data from the creation response
        const profile = {
          id: newProfile.profile_id,
          user_id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email?.split('@')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setTherapistProfile(profile as TherapistProfile);
        setLoading(false);
        
        // Refresh the profile in the background after a short delay
        setTimeout(async () => {
          const { data: refreshedProfiles, error: refreshError } = await supabase
            .from('therapist_profiles')
            .select('*')
            .eq('id', newProfile.profile_id);
            
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