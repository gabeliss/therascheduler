import { useState, useEffect } from 'react';
import { useSupabase } from '@/app/utils/supabase';
import { useTherapistProfile } from './use-therapist-profile';
import { createRecurrenceString, getDaysOfWeekFromRecurrence, DayOfWeek } from '@/app/utils/schema-converters';
import { Availability } from '@/app/types';

// Explicitly define the interface with all properties to avoid linter errors
export interface TherapistAvailability {
  id: string;
  therapist_id: string;
  start_time: string;
  end_time: string;
  recurrence: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddAvailabilityParams {
  start_time: string;  // ISO timestamp
  end_time: string;    // ISO timestamp
  recurrence: string | null; // "weekly:Day1,Day2,..." or null for one-time
  // Only keeping _selectedDays as an internal app parameter
  _selectedDays?: DayOfWeek[]; // Used to help build recurrence string when needed
}

export function useTherapistAvailability() {
  const [availability, setAvailability] = useState<TherapistAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { supabase } = useSupabase();
  const { therapistProfile, loading: profileLoading } = useTherapistProfile();

  // Helper function to extract days of week from recurrence string
  const getDaysOfWeek = (recurrence: string | null): DayOfWeek[] => {
    return getDaysOfWeekFromRecurrence(recurrence);
  };

  // Helper function to determine if availability is recurring from recurrence string
  const isRecurring = (recurrence: string | null): boolean => {
    return !!recurrence;
  };

  // Fetch availability
  const fetchAvailability = async () => {
    if (!therapistProfile) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('availability')
        .select('*')
        .eq('therapist_id', therapistProfile.id)
        .order('recurrence', { ascending: false })
        .order('start_time', { ascending: true });

      if (fetchError) {
        throw new Error(`Error fetching availability: ${fetchError.message}`);
      }

      setAvailability(data || []);
    } catch (err) {
      console.error('Error in fetchAvailability:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching availability');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (therapistProfile && !profileLoading) {
      fetchAvailability();
    }
  }, [therapistProfile, profileLoading]);

  // Add availability
  const addAvailability = async (params: AddAvailabilityParams) => {
    if (!therapistProfile) {
      throw new Error('No therapist profile found');
    }

    try {
      // Add detailed logging
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Authentication state:', {
        hasSession: !!session,
        userId: session?.user?.id,
        therapistId: therapistProfile.id,
        accessToken: session?.access_token ? 'Present' : 'Missing'
      });

      // If no session, try to refresh it
      if (!session) {
        console.log('No session found, attempting to refresh...');
        const { data: refreshData } = await supabase.auth.refreshSession();
        console.log('Session refresh result:', {
          hasSession: !!refreshData.session,
          userId: refreshData.session?.user?.id,
          accessToken: refreshData.session?.access_token ? 'Present' : 'Missing'
        });
      }

      console.log('Adding availability with params:', {
        ...params,
        therapist_id: therapistProfile.id,
      });
      
      // Create recurrence string if needed but not provided
      let finalRecurrence = params.recurrence;
      if (params._selectedDays && params._selectedDays.length > 0 && !finalRecurrence) {
        finalRecurrence = createRecurrenceString(params._selectedDays);
      }
      
      const insertData = {
        therapist_id: therapistProfile.id,
        start_time: params.start_time,
        end_time: params.end_time,
        recurrence: finalRecurrence,
      };
      
      console.log('Final insert data:', insertData);
      
      const { data, error: addError } = await supabase
        .from('availability')
        .insert([insertData])
        .select('*');

      if (addError) {
        console.error('Error details:', addError);
        throw new Error(`Error adding availability: ${addError.message}`);
      }

      // Refresh availability
      await fetchAvailability();

      return data || [];
    } catch (err) {
      console.error('Error in addAvailability:', err);
      throw err;
    }
  };

  // Delete availability
  const deleteAvailability = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('availability')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(`Error deleting availability: ${deleteError.message}`);
      }

      // Refresh availability
      await fetchAvailability();
    } catch (err) {
      console.error('Error in deleteAvailability:', err);
      throw err;
    }
  };

  // Check for overlaps
  const checkForOverlaps = (
    start_time: string,
    end_time: string,
    recurrence: string | null
  ): boolean => {
    // Helper function to convert time string to minutes
    const timeToMinutes = (timeStr: string): number => {
      if (!timeStr) return 0;
      
      let hours = 0;
      let minutes = 0;
      
      if (timeStr.includes(':')) {
        const [h, m] = timeStr.split(':').map(Number);
        hours = h;
        minutes = m;
      } else if (timeStr.includes('T')) {
        const timeComponent = timeStr.split('T')[1];
        const [h, m] = timeComponent.substring(0, 5).split(':').map(Number);
        hours = h;
        minutes = m;
      }
      
      return hours * 60 + minutes;
    };
    
    // Parse the recurrence pattern to get the days of week (if applicable)
    const daysOfWeek = recurrence ? getDaysOfWeekFromRecurrence(recurrence) : [];
    const isRecurringSlot = recurrence !== null;
    
    // For recurring availability
    if (isRecurringSlot && daysOfWeek.length > 0) {
      // Check each day for overlaps
      return daysOfWeek.some(day => {
        // Now check for overlaps with other recurring slots for the same day of week
        return availability.some(slot => {
          if (!slot.recurrence) return false;
          
          // Check if this slot includes this day of week
          const daysInSlot = getDaysOfWeekFromRecurrence(slot.recurrence);
          if (!daysInSlot.includes(day)) return false;
          
          // Extract time components for comparison
          const slotStartTime = slot.start_time.includes('T') ? 
            slot.start_time.split('T')[1].substring(0, 5) : 
            slot.start_time;
          
          const slotEndTime = slot.end_time.includes('T') ? 
            slot.end_time.split('T')[1].substring(0, 5) : 
            slot.end_time;
          
          const newStartTime = start_time.includes('T') ? 
            start_time.split('T')[1].substring(0, 5) : 
            start_time;
          
          const newEndTime = end_time.includes('T') ? 
            end_time.split('T')[1].substring(0, 5) : 
            end_time;
          
          // Check time overlap using minutes for more accurate comparison
          const slotStart = timeToMinutes(slotStartTime);
          const slotEnd = timeToMinutes(slotEndTime);
          const newStart = timeToMinutes(newStartTime);
          const newEnd = timeToMinutes(newEndTime);
          
          return (
            (newStart >= slotStart && newStart < slotEnd) ||
            (newEnd > slotStart && newEnd <= slotEnd) ||
            (newStart <= slotStart && newEnd >= slotEnd)
          );
        });
      });
    }
    
    // For one-time availability (non-recurring)
    if (!isRecurringSlot) {
      // Create Date objects for comparison
      const startDate = new Date(start_time);
      
      // Don't allow setting availability in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        return true; // Treat as overlap to prevent setting availability in the past
      }
      
      // Check for overlaps with non-recurring slots
      const specificDateOverlap = availability.some(slot => {
        if (slot.recurrence !== null) return false;
        
        // For one-time slots, compare the dates
        const slotStart = new Date(slot.start_time);
        const slotEnd = new Date(slot.end_time);
        const newStart = new Date(start_time);
        const newEnd = new Date(end_time);
        
        // Check for date and time overlap
        return (
          (newStart >= slotStart && newStart < slotEnd) ||
          (newEnd > slotStart && newEnd <= slotEnd) ||
          (newStart <= slotStart && newEnd >= slotEnd)
        );
      });
      
      if (specificDateOverlap) return true;
      
      // Also check for overlaps with recurring slots on this day of week
      const dayOfWeekForDate = new Date(start_time).getDay() as DayOfWeek;
      
      return availability.some(slot => {
        if (!slot.recurrence) return false;
        
        const daysInSlot = getDaysOfWeekFromRecurrence(slot.recurrence);
        if (!daysInSlot.includes(dayOfWeekForDate)) return false;
        
        // Extract the time parts for comparison
        const slotStartTime = slot.start_time.includes('T') ? 
          slot.start_time.split('T')[1].substring(0, 5) : 
          slot.start_time;
        
        const slotEndTime = slot.end_time.includes('T') ? 
          slot.end_time.split('T')[1].substring(0, 5) : 
          slot.end_time;
        
        const newStartTime = start_time.includes('T') ? 
          start_time.split('T')[1].substring(0, 5) : 
          start_time;
        
        const newEndTime = end_time.includes('T') ? 
          end_time.split('T')[1].substring(0, 5) : 
          end_time;
        
        // Convert times to minutes for comparison
        const slotStart = timeToMinutes(slotStartTime);
        const slotEnd = timeToMinutes(slotEndTime);
        const newStart = timeToMinutes(newStartTime);
        const newEnd = timeToMinutes(newEndTime);
        
        // Check time overlap
        return (
          (newStart >= slotStart && newStart < slotEnd) ||
          (newEnd > slotStart && newEnd <= slotEnd) ||
          (newStart <= slotStart && newEnd >= slotEnd)
        );
      });
    }
    
    return false;
  };

  return {
    availability,
    loading,
    error,
    addAvailability,
    deleteAvailability,
    checkForOverlaps,
    isRecurring,
    getDaysOfWeek,
    fetchAvailability,
  };
} 