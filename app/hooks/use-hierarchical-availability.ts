import { useEffect, useState } from 'react';
import { supabase } from '@/app/utils/supabase';
import { BaseAvailability, AvailabilityException, HierarchicalAvailability, BaseAvailabilityInput, ExceptionInput } from '@/app/types';

export function useHierarchicalAvailability() {
  const [hierarchicalAvailability, setHierarchicalAvailability] = useState<HierarchicalAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHierarchicalAvailability();
  }, []);

  async function fetchHierarchicalAvailability() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the therapist profile ID
      let { data: therapistProfile, error: profileError } = await supabase
        .from('therapist_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!therapistProfile) {
        // Create therapist profile if it doesn't exist
        try {
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
          if (!response.ok) {
            throw new Error(`Failed to create therapist profile: ${JSON.stringify(responseData)}`);
          }

          therapistProfile = responseData;
        } catch (createError) {
          console.error('Error creating therapist profile:', createError);
          setError('Failed to create therapist profile. Please try again later.');
          setLoading(false);
          return;
        }
      }

      // Ensure therapistProfile is not null before proceeding
      if (!therapistProfile) {
        setError('Could not create or retrieve therapist profile.');
        setLoading(false);
        return;
      }

      // Fetch base availability
      const { data: baseAvailabilityData, error: baseAvailabilityError } = await supabase
        .from('base_availability')
        .select('*')
        .eq('therapist_id', therapistProfile.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (baseAvailabilityError) throw baseAvailabilityError;

      // Fetch exceptions for each base availability
      const hierarchicalData: HierarchicalAvailability[] = [];

      if (baseAvailabilityData && baseAvailabilityData.length > 0) {
        for (const baseAvail of baseAvailabilityData) {
          const { data: exceptionsData, error: exceptionsError } = await supabase
            .from('availability_exceptions')
            .select('*')
            .eq('base_availability_id', baseAvail.id)
            .order('start_time', { ascending: true });

          if (exceptionsError) throw exceptionsError;

          hierarchicalData.push({
            base: baseAvail as BaseAvailability,
            exceptions: exceptionsData as AvailabilityException[] || []
          });
        }
      }

      setHierarchicalAvailability(hierarchicalData);
    } catch (err) {
      console.error('Error in fetchHierarchicalAvailability:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function addBaseAvailability({
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
    console.log('addBaseAvailability called with:', { dayOfWeek, startTime, endTime, isRecurring, specificDate });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the therapist profile ID
      let { data: therapistProfile, error: profileError } = await supabase
        .from('therapist_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!therapistProfile) {
        throw new Error('Therapist profile not found. Please complete your profile setup first.');
      }

      // Check for overlapping base availability
      const hasOverlap = await checkForOverlappingBaseAvailability(
        therapistProfile.id,
        dayOfWeek,
        startTime,
        endTime,
        isRecurring,
        specificDate
      );

      if (hasOverlap) {
        throw new Error('This time slot overlaps with an existing availability. Please choose a different time or delete the existing slot first.');
      }

      const baseAvailabilityData: any = {
        therapist_id: therapistProfile.id,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        is_recurring: isRecurring,
      };

      // Only add specific_date if isRecurring is false
      if (!isRecurring && specificDate) {
        baseAvailabilityData.specific_date = specificDate;
      }

      // Insert the base availability
      const { data, error } = await supabase
        .from('base_availability')
        .insert([baseAvailabilityData])
        .select();

      if (error) throw error;

      // Refresh the data
      await fetchHierarchicalAvailability();
      return data?.[0];
    } catch (err) {
      console.error('Error in addBaseAvailability:', err);
      throw err;
    }
  }

  async function addAvailabilityException({
    baseAvailabilityId,
    startTime,
    endTime,
    reason,
  }: {
    baseAvailabilityId: string;
    startTime: string;
    endTime: string;
    reason?: string;
  }) {
    try {
      // Check if the exception is within the base availability time range
      const { data: baseAvailability, error: baseError } = await supabase
        .from('base_availability')
        .select('*')
        .eq('id', baseAvailabilityId)
        .single();

      if (baseError) throw baseError;
      if (!baseAvailability) {
        throw new Error('Base availability not found.');
      }

      // Check if the exception time is within the base availability time range
      if (startTime < baseAvailability.start_time || endTime > baseAvailability.end_time) {
        throw new Error('Exception time must be within the base availability time range.');
      }

      // Check for overlapping exceptions
      const hasOverlap = await checkForOverlappingExceptions(
        baseAvailabilityId,
        startTime,
        endTime
      );

      if (hasOverlap) {
        throw new Error('This exception overlaps with an existing exception. Please choose a different time.');
      }

      const exceptionData = {
        base_availability_id: baseAvailabilityId,
        start_time: startTime,
        end_time: endTime,
        reason,
      };

      // Insert the exception
      const { data, error } = await supabase
        .from('availability_exceptions')
        .insert([exceptionData])
        .select();

      if (error) throw error;

      // Refresh the data
      await fetchHierarchicalAvailability();
      return data?.[0];
    } catch (err) {
      console.error('Error in addAvailabilityException:', err);
      throw err;
    }
  }

  async function updateBaseAvailability(id: string, updates: Partial<BaseAvailability>) {
    try {
      const { error } = await supabase
        .from('base_availability')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Refresh the data
      await fetchHierarchicalAvailability();
    } catch (err) {
      console.error('Error in updateBaseAvailability:', err);
      throw err;
    }
  }

  async function updateAvailabilityException(id: string, updates: Partial<AvailabilityException>) {
    try {
      const { error } = await supabase
        .from('availability_exceptions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Refresh the data
      await fetchHierarchicalAvailability();
    } catch (err) {
      console.error('Error in updateAvailabilityException:', err);
      throw err;
    }
  }

  async function deleteBaseAvailability(id: string) {
    try {
      // This will also delete all associated exceptions due to CASCADE
      const { error } = await supabase
        .from('base_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh the data
      await fetchHierarchicalAvailability();
    } catch (err) {
      console.error('Error in deleteBaseAvailability:', err);
      throw err;
    }
  }

  async function deleteAvailabilityException(id: string) {
    try {
      const { error } = await supabase
        .from('availability_exceptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh the data
      await fetchHierarchicalAvailability();
    } catch (err) {
      console.error('Error in deleteAvailabilityException:', err);
      throw err;
    }
  }

  // Helper function to check for overlapping base availability
  async function checkForOverlappingBaseAvailability(
    therapistId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    isRecurring: boolean,
    specificDate?: string
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('base_availability')
        .select('*')
        .eq('therapist_id', therapistId);

      if (isRecurring) {
        // For recurring availability, check other recurring slots on the same day
        query = query
          .eq('day_of_week', dayOfWeek)
          .eq('is_recurring', true);
      } else if (specificDate) {
        // For specific date, check both specific date slots and recurring slots for that day
        query = query.or(`specific_date.eq.${specificDate},and(is_recurring.eq.true,day_of_week.eq.${dayOfWeek})`);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (!data || data.length === 0) return false;

      // Check for time overlaps
      return data.some(slot => doTimeSlotsOverlap(startTime, endTime, slot.start_time, slot.end_time));
    } catch (err) {
      console.error('Error in checkForOverlappingBaseAvailability:', err);
      throw err;
    }
  }

  // Helper function to check for overlapping exceptions
  async function checkForOverlappingExceptions(
    baseAvailabilityId: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('availability_exceptions')
        .select('*')
        .eq('base_availability_id', baseAvailabilityId);

      if (error) throw error;
      if (!data || data.length === 0) return false;

      // Check for time overlaps
      return data.some(exception => doTimeSlotsOverlap(startTime, endTime, exception.start_time, exception.end_time));
    } catch (err) {
      console.error('Error in checkForOverlappingExceptions:', err);
      throw err;
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
    return start1 < end2 && end1 > start2;
  }

  // Helper function to convert HH:MM time to minutes since midnight
  function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Function to check if a specific time is available
  function isTimeAvailable(
    date: Date,
    timeToCheck: string
  ): boolean {
    const dayOfWeek = date.getDay();
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Find all base availability slots for this day
    const baseSlots = hierarchicalAvailability.filter(ha => 
      (ha.base.is_recurring && ha.base.day_of_week === dayOfWeek) || 
      (!ha.base.is_recurring && ha.base.specific_date === formattedDate)
    );
    
    if (baseSlots.length === 0) return false;
    
    // Check if the time is within any base slot
    for (const slot of baseSlots) {
      const baseStart = timeToMinutes(slot.base.start_time);
      const baseEnd = timeToMinutes(slot.base.end_time);
      const checkTime = timeToMinutes(timeToCheck);
      
      if (checkTime >= baseStart && checkTime < baseEnd) {
        // Time is within base slot, now check if it's blocked by any exception
        const isBlocked = slot.exceptions.some(exception => {
          const exceptionStart = timeToMinutes(exception.start_time);
          const exceptionEnd = timeToMinutes(exception.end_time);
          return checkTime >= exceptionStart && checkTime < exceptionEnd;
        });
        
        if (!isBlocked) return true;
      }
    }
    
    return false;
  }

  return {
    hierarchicalAvailability,
    loading,
    error,
    addBaseAvailability,
    addAvailabilityException,
    updateBaseAvailability,
    updateAvailabilityException,
    deleteBaseAvailability,
    deleteAvailabilityException,
    isTimeAvailable,
    refreshAvailability: fetchHierarchicalAvailability
  };
} 