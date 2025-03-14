import { useState, useEffect } from 'react';
import { useSupabase } from '@/app/utils/supabase';
import { UnifiedAvailabilityException, UnifiedAvailability } from '@/app/types/index';
import { useTherapistProfile } from '@/app/hooks/use-therapist-profile';
import { useAuth } from '@/app/context/auth-context';
import { DAYS_OF_WEEK } from '@/app/dashboard/availability/utils/time-utils';

export function useUnifiedAvailability() {
  const [unifiedAvailability, setUnifiedAvailability] = useState<UnifiedAvailabilityException[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { supabase, session } = useSupabase();
  const { user } = useAuth();
  const { therapistProfile, loading: profileLoading, error: profileError } = useTherapistProfile();

  // Log when therapistProfile changes
  useEffect(() => {
    console.log("PROFILE CHANGE DETECTED in useUnifiedAvailability:", { 
      therapistProfile, 
      profileLoading, 
      profileError 
    });
  }, [therapistProfile, profileLoading, profileError]);

  // Helper function to convert time string to minutes for comparison
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Fetch all unified exceptions
  async function fetchUnifiedAvailability() {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching unified availability...");
      
      // If user is not authenticated, don't try to fetch data
      if (!user) {
        console.log("No authenticated user, skipping fetch");
        setLoading(false);
        return;
      }
      
      console.log("Therapist profile in fetchUnifiedAvailability:", therapistProfile);
      console.log("Profile loading state:", profileLoading);
      console.log("Profile error state:", profileError);
      
      // If profile is still loading, wait for it
      if (profileLoading) {
        console.log("Profile is still loading, waiting...");
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

      await fetchExceptionsWithProfile(therapistProfile);
    } catch (err) {
      console.error('Error in fetchUnifiedAvailability:', err);
      setError(`Error fetching availability: ${err instanceof Error ? err.message : JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  }
  
  // Helper function to fetch exceptions with a given profile
  async function fetchExceptionsWithProfile(profile: any) {
    console.log("Fetching exceptions for therapist ID:", profile.id);

    // Fetch unified exceptions
    const { data: exceptionsData, error: exceptionsError } = await supabase
      .from('time_off')
      .select('*')
      .eq('therapist_id', profile.id);

    if (exceptionsError) {
      console.error("Error fetching exceptions:", exceptionsError);
      setError(`Error fetching exceptions: ${exceptionsError.message || JSON.stringify(exceptionsError)}`);
      setLoading(false);
      return;
    }

    console.log("Exceptions fetched:", exceptionsData);
    setUnifiedAvailability(exceptionsData as UnifiedAvailabilityException[] || []);
  }

  // Initial fetch
  useEffect(() => {
    console.log("useEffect triggered, user:", user, "therapistProfile:", therapistProfile);
    if (user && !profileLoading) {
      fetchUnifiedAvailability();
    }
  }, [user, therapistProfile, profileLoading]);

  // Add a new exception
  async function addUnifiedException({
    startTime,
    endTime,
    reason,
    isRecurring,
    dayOfWeek,
    startDate,
    endDate,
    isAllDay,
    skipOverlapCheck = false,
  }: {
    startTime: string;
    endTime: string;
    reason?: string;
    isRecurring: boolean;
    dayOfWeek?: number;
    startDate?: string;
    endDate?: string;
    isAllDay?: boolean;
    skipOverlapCheck?: boolean;
  }) {
    try {
      if (!therapistProfile) {
        throw new Error('Therapist profile not found. Please refresh the page and try again.');
      }

      // Add detailed logging for authentication state
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('Authentication state in addUnifiedException:', {
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

      // Validate inputs
      if (isRecurring && dayOfWeek === undefined) {
        throw new Error('Day of week is required for recurring exceptions');
      }

      if (!isRecurring) {
        // For non-recurring exceptions, we need start_date and end_date
        if (!startDate || !endDate) {
          throw new Error('Both start date and end date are required for non-recurring exceptions');
        }
        
        // Validate that endDate is not before startDate
        if (new Date(startDate) > new Date(endDate)) {
          throw new Error('End date must be on or after start date');
        }
      }

      // Check for overlaps only if skipOverlapCheck is false
      if (!skipOverlapCheck) {
        const overlaps = checkForOverlaps(
          startTime, 
          endTime, 
          isRecurring, 
          dayOfWeek, 
          startDate,
          endDate
        );
        
        if (overlaps) {
          // Provide a more descriptive error message
          if (isRecurring) {
            throw new Error(`This time range overlaps with an existing exception on ${DAYS_OF_WEEK[dayOfWeek || 0]}. Please choose a different time.`);
          } else {
            const formattedDate = startDate ? new Date(startDate).toLocaleDateString() : 'the selected date';
            throw new Error(`This time range overlaps with an existing exception on ${formattedDate}. Please choose a different time.`);
          }
        }
      }

      // Prepare exception data
      const exceptionData = {
        therapist_id: therapistProfile.id,
        day_of_week: isRecurring ? dayOfWeek : null,
        start_time: startTime,
        end_time: endTime,
        reason,
        is_recurring: isRecurring,
        start_date: !isRecurring ? startDate : null,
        end_date: !isRecurring ? endDate : null,
        is_all_day: isAllDay || false,
      };

      console.log("Adding exception:", exceptionData);

      // Insert the exception
      const { data, error } = await supabase
        .from('time_off')
        .insert([exceptionData])
        .select();

      if (error) {
        console.error("Error adding exception:", error);
        throw new Error(`Error adding exception: ${error.message || JSON.stringify(error)}`);
      }

      console.log("Exception added:", data);

      // Refresh the data
      await fetchUnifiedAvailability();
      return data?.[0];
    } catch (err) {
      console.error('Error in addUnifiedException:', err);
      throw err;
    }
  }

  // Check for overlapping exceptions
  function checkForOverlaps(
    startTime: string,
    endTime: string,
    isRecurring: boolean,
    dayOfWeek?: number,
    startDate?: string,
    endDate?: string
  ): boolean {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    console.log("Checking for overlaps:", {
      startTime,
      endTime,
      isRecurring,
      dayOfWeek,
      startDate,
      endDate
    });

    // For specific date exceptions, check if the date is in the past
    if (!isRecurring) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Check start date
      if (startDate) {
        const startDateObj = new Date(startDate);
        
        // If the start date is in the past, don't allow setting exceptions
        if (startDateObj < today) {
          return true; // Treat as overlap to prevent setting exceptions in the past
        }
      }
    }
    
    // For recurring exceptions, ensure they only affect current and future days
    if (isRecurring && dayOfWeek !== undefined) {
      // Get the next occurrence of this day of the week
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
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
    }

    return unifiedAvailability.some(exception => {
      // Skip if different types (recurring vs specific)
      if (exception.is_recurring !== isRecurring) return false;

      // For recurring exceptions, check day of week
      if (isRecurring && exception.day_of_week !== dayOfWeek) return false;

      // For non-recurring exceptions
      if (!isRecurring) {
        // If we're checking a multi-day exception
        if (startDate && endDate) {
          // If the existing exception has start_date and end_date
          if (exception.start_date && exception.end_date) {
            // Check if date ranges overlap
            const datesOverlap = (startDate <= exception.end_date && endDate >= exception.start_date);
            
            // If dates don't overlap, no need to check times
            if (!datesOverlap) return false;
            
            // If dates overlap, check if times overlap too
            // Only consider it an overlap if both date ranges AND time ranges overlap
            const exStartMinutes = timeToMinutes(exception.start_time);
            const exEndMinutes = timeToMinutes(exception.end_time);
            
            const timesOverlap = (
              (startMinutes >= exStartMinutes && startMinutes < exEndMinutes) ||
              (endMinutes > exStartMinutes && endMinutes <= exEndMinutes) ||
              (startMinutes <= exStartMinutes && endMinutes >= exEndMinutes)
            );
            
            return datesOverlap && timesOverlap;
          }
          return false;
        }
      }

      // Check time overlap
      const exStartMinutes = timeToMinutes(exception.start_time);
      const exEndMinutes = timeToMinutes(exception.end_time);

      return (
        (startMinutes >= exStartMinutes && startMinutes < exEndMinutes) ||
        (endMinutes > exStartMinutes && endMinutes <= exEndMinutes) ||
        (startMinutes <= exStartMinutes && endMinutes >= exEndMinutes)
      );
    });
  }

  // Update an existing exception
  async function updateUnifiedException(id: string, updates: Partial<UnifiedAvailabilityException>) {
    try {
      console.log("Updating exception:", id, updates);
      
      const { error } = await supabase
        .from('time_off')
        .update(updates)
        .eq('id', id);

      if (error) {
        console.error("Error updating exception:", error);
        throw new Error(`Error updating exception: ${error.message || JSON.stringify(error)}`);
      }

      console.log("Exception updated successfully");
      
      // Refresh the data
      await fetchUnifiedAvailability();
    } catch (err) {
      console.error('Error in updateUnifiedException:', err);
      throw err;
    }
  }

  // Delete an exception
  async function deleteUnifiedException(id: string) {
    try {
      console.log("Deleting exception:", id);
      
      const { error } = await supabase
        .from('time_off')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting exception:", error);
        throw new Error(`Error deleting exception: ${error.message || JSON.stringify(error)}`);
      }

      console.log("Exception deleted successfully");
      
      // Refresh the data
      await fetchUnifiedAvailability();
    } catch (err) {
      console.error('Error in deleteUnifiedException:', err);
      throw err;
    }
  }

  // Function to check if a specific time is available
  function isTimeAvailable(date: Date, timeToCheck: string): boolean {
    const dayOfWeek = date.getDay();
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Find all exceptions that might apply to this date/time
    const applicableExceptions = unifiedAvailability.filter(exception => 
      (exception.is_recurring && exception.day_of_week === dayOfWeek) || 
      (!exception.is_recurring && exception.start_date && exception.end_date && 
       formattedDate >= exception.start_date && formattedDate <= exception.end_date)
    );
    
    if (applicableExceptions.length === 0) return true; // No exceptions, time is available
    
    // Check if the time is blocked by any exception
    const checkTimeMinutes = timeToMinutes(timeToCheck);
    
    const isBlocked = applicableExceptions.some(exception => {
      const exceptionStartMinutes = timeToMinutes(exception.start_time);
      const exceptionEndMinutes = timeToMinutes(exception.end_time);
      return checkTimeMinutes >= exceptionStartMinutes && checkTimeMinutes < exceptionEndMinutes;
    });
    
    return !isBlocked;
  }

  // Get all exceptions for a specific date
  function getExceptionsForDate(date: Date): UnifiedAvailabilityException[] {
    const dayOfWeek = date.getDay();
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return unifiedAvailability.filter(exception => 
      // Recurring exceptions for this day of week
      (exception.is_recurring && exception.day_of_week === dayOfWeek) || 
      // Non-recurring exceptions where this date falls within the range
      (!exception.is_recurring && exception.start_date && exception.end_date && 
       formattedDate >= exception.start_date && formattedDate <= exception.end_date)
    );
  }

  return {
    unifiedAvailability,
    loading,
    error,
    addUnifiedException,
    updateUnifiedException,
    deleteUnifiedException,
    isTimeAvailable,
    getExceptionsForDate,
    refreshAvailability: fetchUnifiedAvailability,
    checkForOverlaps
  };
} 