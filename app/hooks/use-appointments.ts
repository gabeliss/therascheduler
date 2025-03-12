import { useEffect, useState } from 'react';
import { supabase } from '@/app/utils/supabase';
import { Appointment } from '@/app/types';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { useTherapistProfile } from './use-therapist-profile';
import { format, parseISO, isWithinInterval, isSameDay } from 'date-fns';

// Define conflict types
export interface AvailabilityConflict {
  type: 'outside_hours';
  message: string;
}

export interface TimeOffConflict {
  type: 'time_off';
  exception: UnifiedAvailabilityException;
  message: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  availabilityConflict: AvailabilityConflict | null;
  timeOffConflict: TimeOffConflict | null;
}

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { therapistProfile, loading: profileLoading } = useTherapistProfile();

  useEffect(() => {
    if (therapistProfile && !profileLoading) {
      fetchAppointments();
    }
  }, [therapistProfile, profileLoading]);

  async function fetchAppointments() {
    try {
      setLoading(true);
      
      if (!therapistProfile) {
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:client_profiles(*)
        `)
        .eq('therapist_id', therapistProfile.id)
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      // Process appointments to ensure correct time display
      const processedAppointments = data?.map(appointment => {
        // Get the original UTC times from the database
        const startTimeUTC = appointment.start_time; // Format: "2025-03-18T14:00:00+00:00"
        const endTimeUTC = appointment.end_time;     // Format: "2025-03-18T15:00:00+00:00"
        
        // Create Date objects which will convert to local time
        const startDate = new Date(startTimeUTC);
        const endDate = new Date(endTimeUTC);
        
        // Format the date string for filtering by day (using local date)
        const dateString = format(startDate, 'yyyy-MM-dd');
        
        // Format the display times in local timezone for UI display
        const displayStartTime = format(startDate, 'HH:mm:ss');
        const displayEndTime = format(endDate, 'HH:mm:ss');
        
        // Format the full datetime for internal use (in local time)
        const formattedStartTime = format(startDate, "yyyy-MM-dd'T'HH:mm:ss");
        const formattedEndTime = format(endDate, "yyyy-MM-dd'T'HH:mm:ss");
        
        // Add timezone debugging information
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timezoneOffset = startDate.getTimezoneOffset();
        
        console.log('Timezone debugging:');
        console.log('User timezone:', userTimezone);
        console.log('Timezone offset (minutes):', timezoneOffset);
        console.log('Original UTC start time:', startTimeUTC);
        console.log('Local start time:', formattedStartTime);
        console.log('Display start time:', displayStartTime);
        
        return {
          ...appointment,
          // Store the original ISO string to preserve the exact time
          start_time: startTimeUTC,
          end_time: endTimeUTC,
          // Add formatted times for display purposes (in local time)
          formatted_start_time: formattedStartTime,
          formatted_end_time: formattedEndTime,
          // Add display properties for the UI
          display_start_time: displayStartTime,
          display_end_time: displayEndTime,
          // Add date string for filtering by day
          date_string: dateString,
          // Add timezone information for debugging
          time_zone: userTimezone,
          time_zone_offset: timezoneOffset
        };
      }) || [];
      
      setAppointments(processedAppointments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function updateAppointmentStatus(id: string, status: Appointment['status']) {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      await fetchAppointments(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }

  // Check if appointment conflicts with therapist's availability
  async function checkAvailabilityConflict(startTime: string, endTime: string): Promise<AvailabilityConflict | null> {
    if (!therapistProfile) return null;
    
    try {
      // Parse the ISO string to get a Date object in local time
      const startDate = new Date(startTime);
      const dayOfWeek = startDate.getDay(); // 0 = Sunday, 6 = Saturday
      const timeOnly = format(startDate, 'HH:mm:ss');
      
      // Get therapist's availability for this day
      const { data: availabilityData, error } = await supabase
        .from('therapist_availability')
        .select('*')
        .eq('therapist_id', therapistProfile.id)
        .eq('is_recurring', true)
        .eq('day_of_week', dayOfWeek);
      
      if (error) throw error;
      
      // If no availability is set for this day, it's a conflict
      if (!availabilityData || availabilityData.length === 0) {
        return {
          type: 'outside_hours',
          message: `You don't have any availability set for ${format(startDate, 'EEEE')}s.`
        };
      }
      
      // Check if the appointment time falls within any availability slot
      const isWithinAvailability = availabilityData.some(slot => {
        const slotStart = slot.start_time;
        const slotEnd = slot.end_time;
        
        // Compare time strings
        return timeOnly >= slotStart && timeOnly <= slotEnd;
      });
      
      if (!isWithinAvailability) {
        return {
          type: 'outside_hours',
          message: `This appointment is outside your regular availability hours for ${format(startDate, 'EEEE')}s.`
        };
      }
      
      return null; // No conflict
    } catch (err) {
      console.error('Error checking availability conflict:', err);
      return null; // Return null on error to avoid blocking appointment creation
    }
  }

  // Check if appointment conflicts with time-off
  async function checkTimeOffConflict(startTime: string, endTime: string): Promise<TimeOffConflict | null> {
    if (!therapistProfile) return null;
    
    try {
      // Parse the ISO strings to get Date objects in local time
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      const dayOfWeek = startDate.getDay();
      const formattedDate = format(startDate, 'yyyy-MM-dd');
      
      // Get all time-off exceptions
      const { data: exceptionsData, error } = await supabase
        .from('unified_availability_exceptions')
        .select('*')
        .eq('therapist_id', therapistProfile.id);
      
      if (error) throw error;
      
      if (!exceptionsData || exceptionsData.length === 0) {
        return null; // No time-off exceptions
      }
      
      // Check for conflicts with time-off
      for (const exception of exceptionsData) {
        // Check recurring time-off (e.g., lunch breaks)
        if (exception.is_recurring && exception.day_of_week === dayOfWeek) {
          const exceptionStart = exception.start_time;
          const exceptionEnd = exception.end_time;
          const appointmentTimeOnly = format(startDate, 'HH:mm:ss');
          
          // Check if appointment time overlaps with recurring time-off
          if (appointmentTimeOnly >= exceptionStart && appointmentTimeOnly <= exceptionEnd) {
            return {
              type: 'time_off',
              exception,
              message: `This appointment conflicts with your recurring time-off on ${format(startDate, 'EEEE')}s${exception.reason ? ` (${exception.reason})` : ''}.`
            };
          }
        }
        // Check specific date or multi-day time-off
        else if (!exception.is_recurring && exception.start_date && exception.end_date) {
          const exceptionStartDate = new Date(exception.start_date);
          const exceptionEndDate = new Date(exception.end_date);
          
          // Check if appointment date falls within time-off period
          if (
            (startDate >= exceptionStartDate && startDate <= exceptionEndDate) ||
            (endDate >= exceptionStartDate && endDate <= exceptionEndDate)
          ) {
            // For all-day time-off, it's automatically a conflict
            if (exception.is_all_day) {
              return {
                type: 'time_off',
                exception,
                message: `This appointment conflicts with your time-off from ${format(exceptionStartDate, 'MMM d, yyyy')} to ${format(exceptionEndDate, 'MMM d, yyyy')}${exception.reason ? ` (${exception.reason})` : ''}.`
              };
            }
            
            // For time-specific time-off, check time overlap
            const appointmentTimeOnly = format(startDate, 'HH:mm:ss');
            if (appointmentTimeOnly >= exception.start_time && appointmentTimeOnly <= exception.end_time) {
              return {
                type: 'time_off',
                exception,
                message: `This appointment conflicts with your time-off on ${format(exceptionStartDate, 'MMM d, yyyy')}${exception.reason ? ` (${exception.reason})` : ''}.`
              };
            }
          }
        }
      }
      
      return null; // No conflict
    } catch (err) {
      console.error('Error checking time-off conflict:', err);
      return null; // Return null on error to avoid blocking appointment creation
    }
  }

  // Check for all conflicts
  async function checkConflicts(startTime: string, endTime: string): Promise<ConflictCheckResult> {
    const availabilityConflict = await checkAvailabilityConflict(startTime, endTime);
    const timeOffConflict = await checkTimeOffConflict(startTime, endTime);
    
    return {
      hasConflict: !!(availabilityConflict || timeOffConflict),
      availabilityConflict,
      timeOffConflict
    };
  }

  // Create appointment with conflict checking
  async function createAppointmentWithConflictCheck({
    clientName,
    clientEmail,
    clientPhone,
    startTime,
    endTime,
    type,
    notes,
    overrideTimeOff = false,
    overrideReason = ''
  }: {
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    startTime: string;
    endTime: string;
    type: string;
    notes?: string;
    overrideTimeOff?: boolean;
    overrideReason?: string;
  }) {
    try {
      if (!therapistProfile) {
        throw new Error('Therapist profile not found');
      }
      
      // Convert local time strings to Date objects
      const startDate = new Date(startTime);
      const endDate = new Date(endTime);
      
      // Format as ISO strings to preserve timezone information
      // This ensures the time selected by the user is what gets stored in the database
      const startTimeISO = startDate.toISOString();
      const endTimeISO = endDate.toISOString();
      
      // Add timezone debugging information
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const timezoneOffset = startDate.getTimezoneOffset();
      
      console.log('Timezone debugging (appointment creation):');
      console.log('User timezone:', userTimezone);
      console.log('Timezone offset (minutes):', timezoneOffset);
      console.log('Local time selected:', startTime);
      console.log('Converting to UTC for storage:', startTimeISO);
      
      // Check for conflicts if not overriding
      if (!overrideTimeOff) {
        const conflicts = await checkConflicts(startTimeISO, endTimeISO);
        
        // If conflicts exist and not overriding, return the conflicts
        if (conflicts.hasConflict) {
          return { 
            conflicts,
            requiresOverride: true
          };
        }
      }
      
      // First, create or get the client profile
      const { data: existingClient, error: clientError } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('email', clientEmail)
        .single();

      if (clientError && clientError.code !== 'PGRST116') {
        throw clientError;
      }

      let clientId: string;
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Create a new client profile
        const { data: newClient, error: createError } = await supabase
          .from('client_profiles')
          .insert([
            {
              name: clientName,
              email: clientEmail,
              phone: clientPhone,
            },
          ])
          .select('id')
          .single();

        if (createError) throw createError;
        clientId = newClient.id;
      }

      // Create the appointment with override information if needed
      const { data: newAppointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([
          {
            therapist_id: therapistProfile.id,
            client_id: clientId,
            start_time: startTimeISO,
            end_time: endTimeISO,
            type,
            notes,
            status: 'pending',
            overrides_time_off: overrideTimeOff,
            override_reason: overrideTimeOff ? overrideReason : null
          },
        ])
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      await fetchAppointments(); // Refresh the list
      
      return { 
        appointment: newAppointment,
        requiresOverride: false
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }

  return {
    appointments,
    loading,
    error,
    updateAppointmentStatus,
    createAppointment: createAppointmentWithConflictCheck,
    checkConflicts,
    refreshAppointments: fetchAppointments,
  };
} 