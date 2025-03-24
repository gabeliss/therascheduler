import { useEffect, useState } from 'react';
import { supabase } from '@/app/utils/supabase';
import { Availability } from '@/app/types';
import { createRecurrenceString, getDaysOfWeekFromRecurrence, DayOfWeek } from '@/app/utils/schema-converters';

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
        .from('therapists')
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
        .from('availability')
        .select('*')
        .eq('therapist_id', therapistProfile.id)
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

  // Updated to use the new schema
  async function addAvailability({
    start_time,
    end_time,
    recurrence,
    reason,
    forceAdd = false,
  }: {
    start_time: string;
    end_time: string;
    recurrence: string | null;
    reason?: string;
    forceAdd?: boolean;
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Adding availability for user:', user.id);
      
      // First, get the therapist profile ID
      let { data: therapistProfile, error: profileError } = await supabase
        .from('therapists')
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
          start_time,
          end_time,
          recurrence
        );
        
        if (hasOverlap) {
          throw new Error('This time slot overlaps with an existing availability. Please choose a different time or use the "Save Anyway" option to override.');
        }
      }
      
      const availabilityData = {
        therapist_id: therapistProfile.id,
        start_time,
        end_time,
        recurrence,
        reason
      };

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
        throw error;
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

  // Helper function to check for overlapping time slots (updated for new schema)
  async function checkForOverlappingSlots(
    therapistId: string,
    start_time: string,
    end_time: string,
    recurrence: string | null
  ): Promise<boolean> {
    try {
      // Get existing availability slots for this therapist
      const { data: availabilityData, error } = await supabase
        .from('availability')
        .select('*')
        .eq('therapist_id', therapistId);
        
      if (error) throw error;
      
      if (!availabilityData || availabilityData.length === 0) {
        return false; // No existing slots, so no overlaps
      }
      
      // Parse dates from start_time and end_time
      const newStartTime = new Date(start_time);
      const newEndTime = new Date(end_time);
      const newStartMinutes = newStartTime.getHours() * 60 + newStartTime.getMinutes();
      const newEndMinutes = newEndTime.getHours() * 60 + newEndTime.getMinutes();
      const newDate = newStartTime.toISOString().split('T')[0];
      const newDayOfWeek = newStartTime.getDay() as DayOfWeek;
      
      // Filter availability based on recurrence
      let relevantSlots = availabilityData;
      
      if (recurrence) {
        // For recurring slots, check other recurring slots on the same day
        const newDaysOfWeek = getDaysOfWeekFromRecurrence(recurrence);
        
        relevantSlots = availabilityData.filter(slot => {
          if (!slot.recurrence) return false;
          
          // Extract days of week from recurrence pattern
          const daysOfWeek = getDaysOfWeekFromRecurrence(slot.recurrence);
          return newDaysOfWeek.some(day => daysOfWeek.includes(day));
        });
      } else {
        // For specific date slots, check both:
        // 1. One-time slots on the same date
        // 2. Recurring slots on the same day of week
        
        relevantSlots = availabilityData.filter(slot => {
          // Check one-time slots for the same date
          if (!slot.recurrence) {
            const slotDate = new Date(slot.start_time);
            const slotDateStr = slotDate.toISOString().split('T')[0];
            return slotDateStr === newDate;
          }
          
          // Check recurring slots for the same day of week
          const daysOfWeek = getDaysOfWeekFromRecurrence(slot.recurrence);
          return daysOfWeek.includes(newDayOfWeek);
        });
      }
      
      // Check for time overlaps in the relevant slots
      for (const slot of relevantSlots) {
        // Extract time from the slot
        const slotStartTime = new Date(slot.start_time);
        const slotEndTime = new Date(slot.end_time);
        
        const slotStartMinutes = slotStartTime.getHours() * 60 + slotStartTime.getMinutes();
        const slotEndMinutes = slotEndTime.getHours() * 60 + slotEndTime.getMinutes();
        
        // Check if time ranges overlap
        if (doTimeSlotsOverlap(newStartMinutes, newEndMinutes, slotStartMinutes, slotEndMinutes)) {
          return true; // Found an overlap
        }
      }
      
      return false; // No overlaps found
    } catch (err) {
      console.error('Error checking for overlapping slots:', err);
      return false; // Return false on error to let the operation proceed
    }
  }

  // Helper function to check if two time ranges overlap
  function doTimeSlotsOverlap(
    startMinutes1: number,
    endMinutes1: number,
    startMinutes2: number,
    endMinutes2: number
  ): boolean {
    // Two time ranges overlap if:
    // 1. The start of one range is within the other range, or
    // 2. The end of one range is within the other range, or
    // 3. One range completely contains the other
    return (
      (startMinutes1 >= startMinutes2 && startMinutes1 < endMinutes2) ||
      (endMinutes1 > startMinutes2 && endMinutes1 <= endMinutes2) ||
      (startMinutes1 <= startMinutes2 && endMinutes1 >= endMinutes2)
    );
  }

  // Helper function to convert time string to minutes since midnight
  function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
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
    fetchAvailability
  };
} 