import { useState, useEffect } from 'react';
import { useSupabase } from '@/app/utils/supabase';
import { useTherapistProfile } from './use-therapist-profile';

export interface TherapistAvailability {
  id: string;
  therapist_id: string;
  day_of_week?: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  specific_date?: string;
  created_at: string;
  updated_at: string;
}

export interface AddAvailabilityParams {
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  dayOfWeek?: number;
  specificDate?: string;
}

export function useTherapistAvailability() {
  const [availability, setAvailability] = useState<TherapistAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { supabase } = useSupabase();
  const { therapistProfile, loading: profileLoading } = useTherapistProfile();

  // Fetch availability
  const fetchAvailability = async () => {
    if (!therapistProfile) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('therapist_availability')
        .select('*')
        .eq('therapist_id', therapistProfile.id)
        .order('is_recurring', { ascending: false })
        .order('day_of_week', { ascending: true })
        .order('specific_date', { ascending: true })
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
        therapist_id: therapistProfile.id,
        ...params,
        dayOfWeek_type: typeof params.dayOfWeek,
        dayOfWeek_value: params.dayOfWeek,
        isRecurring_type: typeof params.isRecurring,
        isRecurring_value: params.isRecurring
      });
      
      const insertData = {
        therapist_id: therapistProfile.id,
        start_time: params.startTime,
        end_time: params.endTime,
        is_recurring: params.isRecurring,
        day_of_week: params.isRecurring ? params.dayOfWeek : null,
        specific_date: !params.isRecurring ? params.specificDate : null,
      };
      
      console.log('Final insert data:', insertData);
      
      const { data, error: addError } = await supabase
        .from('therapist_availability')
        .insert([insertData])
        .select('*');

      if (addError) {
        console.error('Error details:', addError);
        throw new Error(`Error adding availability: ${addError.message}`);
      }

      // Refresh availability
      await fetchAvailability();

      return data;
    } catch (err) {
      console.error('Error in addAvailability:', err);
      throw err;
    }
  };

  // Delete availability
  const deleteAvailability = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('therapist_availability')
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
    startTime: string,
    endTime: string,
    isRecurring: boolean,
    dayOfWeek?: number,
    specificDate?: string
  ): boolean => {
    // For recurring availability, only check for overlaps with other recurring slots
    if (isRecurring && dayOfWeek !== undefined) {
      // For recurring availability, we need to ensure it only affects current and future days
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get the next occurrence of this day of the week
      const nextOccurrence = new Date(today);
      const currentDayOfWeek = today.getDay();
      const daysToAdd = (dayOfWeek - currentDayOfWeek + 7) % 7;
      
      // If today is the same day of week and it's already past the start time,
      // we should consider the next week's occurrence
      if (daysToAdd === 0) {
        const currentHour = new Date().getHours();
        const currentMinute = new Date().getMinutes();
        const [startHour, startMinute] = startTime.split(':').map(Number);
        
        if (currentHour > startHour || (currentHour === startHour && currentMinute >= startMinute)) {
          nextOccurrence.setDate(nextOccurrence.getDate() + 7);
        }
      } else {
        nextOccurrence.setDate(nextOccurrence.getDate() + daysToAdd);
      }
      
      // Now check for overlaps with other recurring slots for the same day of week
      return availability.some(slot => {
        // Only check recurring slots for the same day of week
        if (slot.is_recurring && slot.day_of_week === dayOfWeek) {
          return (
            (startTime >= slot.start_time && startTime < slot.end_time) ||
            (endTime > slot.start_time && endTime <= slot.end_time) ||
            (startTime <= slot.start_time && endTime >= slot.end_time)
          );
        }
        return false;
      });
    }
    
    // For specific date availability
    if (specificDate) {
      const specificDateObj = new Date(specificDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // If the specific date is in the past, don't allow setting availability
      if (specificDateObj < today) {
        return true; // Treat as overlap to prevent setting availability in the past
      }
      
      // Check for overlaps with specific date slots
      const specificDateOverlap = availability.some(slot => {
        if (!slot.is_recurring && slot.specific_date === specificDate) {
          return (
            (startTime >= slot.start_time && startTime < slot.end_time) ||
            (endTime > slot.start_time && endTime <= slot.end_time) ||
            (startTime <= slot.start_time && endTime >= slot.end_time)
          );
        }
        return false;
      });
      
      if (specificDateOverlap) return true;
      
      // Also check for overlaps with recurring slots for the same day of week
      const dayOfWeekForSpecificDate = new Date(specificDate).getDay();
      return availability.some(slot => {
        if (slot.is_recurring && slot.day_of_week === dayOfWeekForSpecificDate) {
          return (
            (startTime >= slot.start_time && startTime < slot.end_time) ||
            (endTime > slot.start_time && endTime <= slot.end_time) ||
            (startTime <= slot.start_time && endTime >= slot.end_time)
          );
        }
        return false;
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
    refreshAvailability: fetchAvailability,
  };
} 