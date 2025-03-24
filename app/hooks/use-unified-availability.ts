import { useState, useEffect } from 'react';
import { useSupabase } from '@/app/utils/supabase';
import { useTherapistProfile } from '@/app/hooks/use-therapist-profile';
import { useAuth } from '@/app/context/auth-context';
import { createRecurrenceString, getDaysOfWeekFromRecurrence, DayOfWeek } from '@/app/utils/schema-converters';

// Import from the new modular structure
import { DAYS_OF_WEEK } from '@/app/dashboard/availability/utils/time/types';
import { timeToMinutes } from '@/app/dashboard/availability/utils/time/calculations';

// Define TimeOff interface directly to avoid import error
interface TimeOff {
  id: string;
  therapist_id: string;
  start_time: string;   // ISO timestamp
  end_time: string;     // ISO timestamp
  reason?: string;      // Optional reason for time off
  recurrence: string | null; // "weekly:Day1,Day2,..." or null for one-time
  created_at: string;
  updated_at: string;
}

export function useUnifiedAvailability() {
  const [timeOffPeriods, setTimeOffPeriods] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { supabase, session } = useSupabase();
  const { user } = useAuth();
  const { therapistProfile, loading: profileLoading, error: profileError } = useTherapistProfile();

  // Fetch all time-off periods
  async function fetchTimeOffPeriods() {
    try {
      setLoading(true);
      setError(null);

      // If user is not authenticated, don't try to fetch data
      if (!user) {
        setLoading(false);
        return;
      }
      
      // If profile is still loading, wait for it
      if (profileLoading) {
        return;
      }
      
      // If there was an error loading the profile, propagate it
      if (profileError) {
        console.error("Profile error:", profileError);
        setError('Could not load therapist profile. Please try refreshing the page.');
        setLoading(false);
        return;
      }

      // Ensure therapistProfile is not null before proceeding
      if (!therapistProfile) {
        console.error("No therapist profile found");
        setError('Could not load therapist profile. Please try refreshing the page.');
        setLoading(false);
        return;
      }

      await fetchTimeOffWithProfile(therapistProfile);
    } catch (err) {
      console.error('Error in fetchTimeOffPeriods:', err);
      setError(`Error fetching time-off periods: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  }
  
  // Helper function to fetch time-off with a given profile
  async function fetchTimeOffWithProfile(profile: any) {
    // Fetch time-off periods
    const { data: timeOffData, error: timeOffError } = await supabase
      .from('time_off')
      .select('*')
      .eq('therapist_id', profile.id);

    if (timeOffError) {
      console.error("Error fetching time-off periods:", timeOffError);
      setError(`Error fetching time-off periods: ${timeOffError.message || JSON.stringify(timeOffError)}`);
      setLoading(false);
      return;
    }

    setTimeOffPeriods(timeOffData as TimeOff[] || []);
  }

  // Initial fetch
  useEffect(() => {
    if (user && !profileLoading) {
      fetchTimeOffPeriods();
    }
  }, [user, therapistProfile, profileLoading]);

  // Properly typed interface for adding a time-off period
  interface AddTimeOffParams {
    start_time: string;           // Full ISO timestamp
    end_time: string;             // Full ISO timestamp
    reason?: string;              // Optional reason for time off
    recurrence: string | null;    // "weekly:Day1,Day2,..." or null for one-time
  }

  // Add a new time-off period
  async function addTimeOff({
    start_time,
    end_time,
    reason,
    recurrence,
    skipOverlapCheck = false,
  }: AddTimeOffParams & {
    skipOverlapCheck?: boolean;
  }) {
    try {
      if (!therapistProfile) {
        throw new Error('Therapist profile not found. Please refresh the page and try again.');
      }

      // Add detailed logging for authentication state
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('Authentication state in addTimeOff:', {
        hasSession: !!currentSession,
        userId: currentSession?.user?.id,
        therapistId: therapistProfile.id,
        accessToken: currentSession?.access_token ? 'Present' : 'Missing'
      });

      // If no session, try to refresh it
      if (!currentSession) {
        console.log('No session found, attempting to refresh...');
        const { data: refreshData } = await supabase.auth.refreshSession();
        console.log('Session refresh result:', {
          hasSession: !!refreshData.session,
          userId: refreshData.session?.user?.id,
          accessToken: refreshData.session?.access_token ? 'Present' : 'Missing'
        });
      }

      // Check for overlaps only if skipOverlapCheck is false
      if (!skipOverlapCheck) {
        const overlaps = checkForOverlaps(
          start_time, 
          end_time, 
          recurrence
        );
        
        if (overlaps) {
          // Provide a more descriptive error message
          if (recurrence) {
            const days = getDaysOfWeekFromRecurrence(recurrence);
            const dayNames = days.map(d => DAYS_OF_WEEK[d]).join(', ');
            throw new Error(`This time range overlaps with an existing time-off period on ${dayNames}. Please choose a different time.`);
          } else {
            const formattedDate = new Date(start_time).toLocaleDateString();
            throw new Error(`This time range overlaps with an existing time-off period on ${formattedDate}. Please choose a different time.`);
          }
        }
      }

      // Prepare time-off data
      const timeOffData = {
        therapist_id: therapistProfile.id,
        start_time,
        end_time,
        reason,
        recurrence,
      };

      console.log("Adding time-off period:", timeOffData);

      // Insert the time-off period
      const { data, error } = await supabase
        .from('time_off')
        .insert([timeOffData])
        .select();

      if (error) {
        console.error("Error adding time-off period:", error);
        throw new Error(`Error adding time-off period: ${error.message || JSON.stringify(error)}`);
      }

      console.log("Time-off period added:", data);

      // Refresh the data
      await fetchTimeOffPeriods();
      return data?.[0];
    } catch (err) {
      console.error('Error in addTimeOff:', err);
      throw err;
    }
  }

  // Check for overlapping time-off periods
  function checkForOverlaps(
    start_time: string,
    end_time: string,
    recurrence: string | null
  ): boolean {
    // For easier time comparisons
    const startMinutes = timeToMinutes(typeof start_time === 'string' && start_time.includes(':') ? start_time : new Date(start_time).toTimeString().substring(0, 5));
    const endMinutes = timeToMinutes(typeof end_time === 'string' && end_time.includes(':') ? end_time : new Date(end_time).toTimeString().substring(0, 5));
    
    const isRecurringSlot = recurrence !== null;
    const daysOfWeek = isRecurringSlot ? getDaysOfWeekFromRecurrence(recurrence) : [];

    // Create date objects for date comparisons with non-recurring slots
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    
    console.log("Checking for overlaps:", {
      start_time,
      end_time,
      recurrence,
      isRecurringSlot,
      daysOfWeek,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // For one-time time-off periods (non-recurring), check if date is in the past
    if (!isRecurringSlot) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // If the start date is in the past, don't allow setting time-off periods
      if (startDate < today) {
        return true; // Treat as overlap to prevent setting time-off periods in the past
      }
    }

    return timeOffPeriods.some(timeOff => {
      // Determine if the time-off period is recurring
      const isTimeOffRecurring = timeOff.recurrence !== null;
      
      // Skip comparing different types (recurring vs. one-time)
      if (isTimeOffRecurring !== isRecurringSlot) return false;
      
      // For recurring time-off periods, check day of week overlap
      if (isRecurringSlot && isTimeOffRecurring) {
        // Get days of week for both the new slot and the existing time-off period
        const timeOffDays = getDaysOfWeekFromRecurrence(timeOff.recurrence);
        
        // Check if there's any overlap in days
        const hasOverlappingDay = daysOfWeek.some(day => timeOffDays.includes(day));
        if (!hasOverlappingDay) return false;
        
        // Extract time components for comparison
        const exStartMinutes = timeToMinutes(timeOff.start_time.includes(':') ? 
          timeOff.start_time : 
          new Date(timeOff.start_time).toTimeString().substring(0, 5));
        
        const exEndMinutes = timeToMinutes(timeOff.end_time.includes(':') ? 
          timeOff.end_time : 
          new Date(timeOff.end_time).toTimeString().substring(0, 5));
        
        // If days overlap, check if times overlap
        return (
          (startMinutes >= exStartMinutes && startMinutes < exEndMinutes) ||
          (endMinutes > exStartMinutes && endMinutes <= exEndMinutes) ||
          (startMinutes <= exStartMinutes && endMinutes >= exEndMinutes)
        );
      }
      
      // For one-time time-off periods
      if (!isRecurringSlot && !isTimeOffRecurring) {
        // Create Date objects for comparison
        const exStartDate = new Date(timeOff.start_time);
        const exEndDate = new Date(timeOff.end_time);
        
        // Check if date ranges overlap (uses Date objects for comparison)
        const datesOverlap = (
          startDate <= exEndDate && endDate >= exStartDate
        );
        
        if (!datesOverlap) return false;
        
        // Check if time ranges overlap (already covered by date overlap check for full timestamps)
        return true;
      }
      
      return false;
    });
  }

  // Update an existing time-off period
  async function updateTimeOff(id: string, updates: Partial<{
    start_time: string;
    end_time: string;
    reason?: string;
    recurrence: string | null;
  }>) {
    try {
      console.log("Updating time-off period:", id, updates);
      
      const { error } = await supabase
        .from('time_off')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error("Error updating time-off period:", error);
        throw new Error(`Error updating time-off period: ${error.message || JSON.stringify(error)}`);
      }

      console.log("Time-off period updated successfully");
      
      // Refresh the data
      await fetchTimeOffPeriods();
    } catch (err) {
      console.error('Error in updateTimeOff:', err);
      throw err;
    }
  }

  // Delete a time-off period
  async function deleteTimeOff(id: string) {
    try {
      console.log("Deleting time-off period:", id);
      
      const { error } = await supabase
        .from('time_off')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting time-off period:", error);
        throw new Error(`Error deleting time-off period: ${error.message || JSON.stringify(error)}`);
      }

      console.log("Time-off period deleted successfully");
      
      // Refresh the data
      await fetchTimeOffPeriods();
    } catch (err) {
      console.error('Error in deleteTimeOff:', err);
      throw err;
    }
  }

  // Function to check if a specific time is available
  function isTimeAvailable(date: Date, timeToCheck: string): boolean {
    const dayOfWeek = date.getDay();
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Find all time-off periods that might apply to this date/time
    const applicableTimeOffs = timeOffPeriods.filter(timeOff => {
      // Check if this is a recurring time-off period that applies to this day of week
      if (timeOff.recurrence) {
        const daysOfWeek = getDaysOfWeekFromRecurrence(timeOff.recurrence);
        return daysOfWeek.includes(dayOfWeek as DayOfWeek);
      } 
      
      // For non-recurring time-off period, check if this date falls within the timestamp range
      if (!timeOff.recurrence) {
        const timeOffStartDate = new Date(timeOff.start_time).toISOString().split('T')[0];
        const timeOffEndDate = new Date(timeOff.end_time).toISOString().split('T')[0];
        return formattedDate >= timeOffStartDate && formattedDate <= timeOffEndDate;
      }
      
      return false;
    });
    
    if (applicableTimeOffs.length === 0) return true; // No time-off periods, time is available
    
    // Check if the time is blocked by any time-off period
    const checkTimeMinutes = timeToMinutes(timeToCheck);
    
    const isBlocked = applicableTimeOffs.some(timeOff => {
      const timeOffStartMinutes = timeToMinutes(timeOff.start_time);
      const timeOffEndMinutes = timeToMinutes(timeOff.end_time);
      return checkTimeMinutes >= timeOffStartMinutes && checkTimeMinutes < timeOffEndMinutes;
    });
    
    return !isBlocked;
  }

  // Get all time-off periods for a specific date
  function getTimeOffPeriodsForDate(date: Date): TimeOff[] {
    const dayOfWeek = date.getDay();
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return timeOffPeriods.filter(timeOff => {
      // Check if this is a recurring time-off period that applies to this day of week
      if (timeOff.recurrence) {
        const daysOfWeek = getDaysOfWeekFromRecurrence(timeOff.recurrence);
        return daysOfWeek.includes(dayOfWeek as DayOfWeek);
      }
      
      // For non-recurring time-off period, check if this date falls within the timestamp range
      if (!timeOff.recurrence) {
        const timeOffStartDate = new Date(timeOff.start_time).toISOString().split('T')[0];
        const timeOffEndDate = new Date(timeOff.end_time).toISOString().split('T')[0];
        return formattedDate >= timeOffStartDate && formattedDate <= timeOffEndDate;
      }
      
      return false;
    });
  }

  return {
    timeOffPeriods,
    loading,
    error,
    addTimeOff,
    updateTimeOff,
    deleteTimeOff,
    isTimeAvailable,
    getTimeOffPeriodsForDate,
    refreshTimeOff: fetchTimeOffPeriods,
    checkForOverlaps,
    getDaysOfWeek: getDaysOfWeekFromRecurrence,
    isRecurring: (recurrence: string | null) => !!recurrence
  };
} 