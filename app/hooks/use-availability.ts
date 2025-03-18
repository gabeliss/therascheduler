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
      let { data: therapistProfile, error: profileError } = await supabase
        .from('therapist_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      console.log('Therapist profile check:', { therapistProfile, error: profileError });

      // If no therapist profile exists, throw an error
      if (!therapistProfile) {
        console.log('No therapist profile found');
        throw new Error('No therapist profile found. Please contact support or ensure you are using the correct account.');
      }

      console.log('Using therapist profile:', therapistProfile);

      const { data, error } = await supabase
        .from('therapist_availability')
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
    isAvailable = true,
    reason,
    forceAdd = false,
  }: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isRecurring?: boolean;
    specificDate?: string;
    isAvailable?: boolean;
    reason?: string;
    forceAdd?: boolean;
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Adding availability for user:', user.id);
      
      // First, get the therapist profile ID
      let { data: therapistProfile, error: profileError } = await supabase
        .from('therapist_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      console.log('Therapist profile check:', { therapistProfile, profileError });
      
      // If no therapist profile exists, throw an error
      if (!therapistProfile) {
        console.log('No therapist profile found');
        throw new Error('No therapist profile found. Please contact support or ensure you are using the correct account.');
      }
      
      console.log('Using therapist profile ID:', therapistProfile.id);
      
      // Check for overlapping time slots if forceAdd is false
      if (!forceAdd) {
        const hasOverlap = await checkForOverlappingSlots(
          therapistProfile.id,
          dayOfWeek,
          startTime,
          endTime,
          isRecurring,
          specificDate
        );
        
        if (hasOverlap) {
          throw new Error('This time slot overlaps with an existing availability. Please choose a different time or use the "Save Anyway" option to override.');
        }
      }
      
      const availabilityData: any = {
        therapist_id: therapistProfile.id, // Use the therapist profile ID, not the user ID
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_recurring: isRecurring,
        is_available: isAvailable,
      };
      
      // Only add specific_date if isRecurring is false
      if (!isRecurring && specificDate) {
        availabilityData.specific_date = specificDate;
      }
      
      // Only add reason if isAvailable is false and reason is provided
      if (!isAvailable && reason) {
        availabilityData.reason = reason;
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
        .from('therapist_availability')
        .insert([availabilityData])
        .select();

      console.log('Insert availability result:', { data, error });

      if (error) {
        // If the error is about specific_date column, try again without it
        if (error.message?.includes('specific_date')) {
          console.log('Retrying without specific_date field');
          delete availabilityData.specific_date;
          
          const retryResult = await supabase
            .from('therapist_availability')
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

  // Helper function to check for overlapping time slots
  async function checkForOverlappingSlots(
    therapistId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    isRecurring: boolean,
    specificDate?: string
  ): Promise<boolean> {
    try {
      // Get existing availability slots for this therapist
      let query = supabase
        .from('therapist_availability')
        .select('*')
        .eq('therapist_id', therapistId);
      
      if (isRecurring) {
        // For recurring slots, check only recurring slots on the same day of week
        query = query
          .eq('is_recurring', true)
          .eq('day_of_week', dayOfWeek);
      } else if (specificDate) {
        // For specific date slots, check both:
        // 1. Specific date slots on the same date
        // 2. Recurring slots on the same day of week
        const specificDateSlots = await supabase
          .from('therapist_availability')
          .select('*')
          .eq('therapist_id', therapistId)
          .eq('is_recurring', false)
          .eq('specific_date', specificDate);
        
        const recurringSlots = await supabase
          .from('therapist_availability')
          .select('*')
          .eq('therapist_id', therapistId)
          .eq('is_recurring', true)
          .eq('day_of_week', dayOfWeek);
        
        const allSlots = [
          ...(specificDateSlots.data || []),
          ...(recurringSlots.data || [])
        ];
        
        // Check for overlaps in the combined list
        return allSlots.some(slot => {
          return doTimeSlotsOverlap(startTime, endTime, slot.start_time, slot.end_time);
        });
      }
      
      const { data: existingSlots, error } = await query;
      
      if (error) {
        console.error('Error checking for overlapping slots:', error);
        return false; // If there's an error, proceed with caution
      }
      
      // Check if any existing slot overlaps with the new one
      return (existingSlots || []).some(slot => {
        return doTimeSlotsOverlap(startTime, endTime, slot.start_time, slot.end_time);
      });
    } catch (err) {
      console.error('Error in checkForOverlappingSlots:', err);
      return false; // If there's an error, proceed with caution
    }
  }
  
  // Helper function to check if two time slots overlap
  function doTimeSlotsOverlap(
    startTime1: string,
    endTime1: string,
    startTime2: string,
    endTime2: string
  ): boolean {
    // Convert times to minutes since midnight for easier comparison
    const start1 = timeToMinutes(startTime1);
    const end1 = timeToMinutes(endTime1);
    const start2 = timeToMinutes(startTime2);
    const end2 = timeToMinutes(endTime2);
    
    // Check for overlap
    // Two time ranges overlap if the start of one is before the end of the other,
    // and the end of one is after the start of the other
    return start1 < end2 && end1 > start2;
  }
  
  // Helper function to convert HH:MM time to minutes since midnight
  function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  async function updateAvailability(id: string, updates: Partial<Availability>) {
    try {
      const { error } = await supabase
        .from('therapist_availability')
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
        .from('therapist_availability')
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