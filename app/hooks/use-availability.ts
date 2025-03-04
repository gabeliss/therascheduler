import { useEffect, useState } from 'react';
import { supabase } from '@/app/utils/supabase';
import { Availability } from '@/app/types';

export function useAvailability() {
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailability();
  }, []);

  async function fetchAvailability() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Fetching availability for user:', user.id);

      // Get the therapist profile ID
      const { data: therapistProfile, error: profileError } = await supabase
        .from('therapist_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      console.log('Therapist profile check:', { therapistProfile, error: profileError });

      if (!therapistProfile) {
        console.log('No therapist profile found, returning empty availability');
        setAvailability([]);
        return;
      }

      console.log('Using therapist profile:', therapistProfile);

      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('therapist_id', therapistProfile.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      console.log('Fetch availability result:', { data, error });

      if (error) throw error;
      setAvailability(data || []);
    } catch (err) {
      console.error('Error in fetchAvailability:', err);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      } else {
        console.error('Unknown error type:', typeof err);
        console.error('Error stringified:', JSON.stringify(err));
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function addAvailability({
    dayOfWeek,
    startTime,
    endTime,
    isRecurring = true,
    specificDate,
  }: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isRecurring?: boolean;
    specificDate?: string;
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Adding availability for user:', user.id);
      console.log('Availability details:', { dayOfWeek, startTime, endTime, isRecurring, specificDate });

      // First, check if therapist profile exists
      let { data: therapistProfile, error: profileError } = await supabase
        .from('therapist_profiles')
        .select('*')  // Select all columns to see the full profile
        .eq('user_id', user.id)
        .single();

      console.log('Therapist profile check:', { therapistProfile, error: profileError });

      // If no therapist profile exists, create one
      if (!therapistProfile) {
        console.log('No therapist profile found, creating one...');
        // Create a server-side API route to handle this
        const response = await fetch('/api/create-therapist-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            name: user.user_metadata?.name || 'Therapist',
            email: user.email,
          }),
        });

        const responseData = await response.json();
        console.log('API response:', responseData);

        if (!response.ok) {
          throw new Error(`Failed to create therapist profile: ${responseData.message}`);
        }

        therapistProfile = { id: responseData.id };
      }

      if (!therapistProfile) throw new Error('Failed to get or create therapist profile');

      console.log('Using therapist profile:', therapistProfile);
      console.log('Current user ID:', user.id);
      console.log('Therapist profile ID:', therapistProfile.id);
      console.log('Therapist profile user_id:', therapistProfile.user_id);

      // Create availability data object
      const availabilityData: any = {
        therapist_id: therapistProfile.id,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_recurring: isRecurring,
      };

      // Only add specific_date if it's provided and not recurring
      if (!isRecurring && specificDate) {
        try {
          // Try to add the specific_date field
          availabilityData.specific_date = specificDate;
        } catch (e) {
          console.warn('Could not add specific_date, column might not exist yet:', e);
          // Continue without specific_date
        }
      }

      console.log('Inserting availability data:', availabilityData);

      // Try to insert with the service role key via API
      try {
        const response = await fetch('/api/availability/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(availabilityData),
        });

        const responseData = await response.json();
        console.log('API response for availability creation:', responseData);

        if (!response.ok) {
          throw new Error(`Failed to create availability: ${JSON.stringify(responseData)}`);
        }

        await fetchAvailability();
        return;
      } catch (apiError) {
        console.error('API error, falling back to direct insert:', apiError);
      }

      // Fall back to direct insert
      const { error, data } = await supabase
        .from('availability')
        .insert([availabilityData])
        .select();

      console.log('Insert availability result:', { data, error });

      if (error) {
        // If the error is about specific_date column, try again without it
        if (error.message?.includes('specific_date')) {
          console.log('Retrying without specific_date field');
          delete availabilityData.specific_date;
          
          const retryResult = await supabase
            .from('availability')
            .insert([availabilityData])
            .select();
            
          console.log('Retry result:', retryResult);
          
          if (retryResult.error) throw retryResult.error;
        } else {
          throw error;
        }
      }
      
      await fetchAvailability();
    } catch (err) {
      console.error('Error in addAvailability:', err);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      } else {
        console.error('Unknown error type:', typeof err);
        console.error('Error stringified:', JSON.stringify(err));
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }

  async function updateAvailability(id: string, updates: Partial<Availability>) {
    try {
      const { error } = await supabase
        .from('availability')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchAvailability();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }

  async function deleteAvailability(id: string) {
    try {
      const { error } = await supabase
        .from('availability')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchAvailability();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }

  return {
    availability,
    loading,
    error,
    addAvailability,
    updateAvailability,
    deleteAvailability,
    refreshAvailability: fetchAvailability,
  };
} 