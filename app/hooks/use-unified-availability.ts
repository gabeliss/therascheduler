import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { UnifiedAvailabilityException, UnifiedAvailability } from '@/app/types/index';
import { useTherapistProfile } from '@/app/hooks/use-therapist-profile';
import { useAuth } from '@/app/context/auth-context';

export function useUnifiedAvailability() {
  const [unifiedAvailability, setUnifiedAvailability] = useState<UnifiedAvailabilityException[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();
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
      .from('unified_availability_exceptions')
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
    specificDate,
  }: {
    startTime: string;
    endTime: string;
    reason?: string;
    isRecurring: boolean;
    dayOfWeek?: number;
    specificDate?: string;
  }) {
    try {
      if (!therapistProfile) {
        throw new Error('Therapist profile not found. Please refresh the page and try again.');
      }

      // Validate inputs
      if (isRecurring && dayOfWeek === undefined) {
        throw new Error('Day of week is required for recurring exceptions');
      }

      if (!isRecurring && !specificDate) {
        throw new Error('Specific date is required for non-recurring exceptions');
      }

      // Check for overlaps
      const overlaps = checkForOverlaps(startTime, endTime, isRecurring, dayOfWeek, specificDate);
      if (overlaps) {
        throw new Error('This time range overlaps with an existing exception');
      }

      // Prepare exception data
      const exceptionData = {
        therapist_id: therapistProfile.id,
        day_of_week: isRecurring ? dayOfWeek : null,
        start_time: startTime,
        end_time: endTime,
        reason,
        is_recurring: isRecurring,
        specific_date: !isRecurring ? specificDate : null,
      };

      console.log("Adding exception:", exceptionData);

      // Insert the exception
      const { data, error } = await supabase
        .from('unified_availability_exceptions')
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
    specificDate?: string
  ): boolean {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    return unifiedAvailability.some(exception => {
      // Skip if different types (recurring vs specific)
      if (exception.is_recurring !== isRecurring) return false;

      // For recurring exceptions, check day of week
      if (isRecurring && exception.day_of_week !== dayOfWeek) return false;

      // For specific date exceptions, check date
      if (!isRecurring && exception.specific_date !== specificDate) return false;

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
        .from('unified_availability_exceptions')
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
        .from('unified_availability_exceptions')
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
      (!exception.is_recurring && exception.specific_date === formattedDate)
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
      (exception.is_recurring && exception.day_of_week === dayOfWeek) || 
      (!exception.is_recurring && exception.specific_date === formattedDate)
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