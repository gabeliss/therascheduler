import { useEffect, useState } from 'react';
import { supabase } from '@/app/utils/supabase';
import { Appointment } from '@/app/types';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { useTherapistProfile } from './use-therapist-profile';
import { format, parseISO, isWithinInterval, isSameDay, areIntervalsOverlapping } from 'date-fns';
import { timeToMinutes } from '@/app/utils/time-utils';
import { sendAppointmentStatusNotification } from '@/app/utils/email-service';

// Define conflict types
export interface AvailabilityConflict {
  type: 'outside_hours';
  message: string;
  severity: 'high' | 'medium' | 'low';
}

export interface TimeOffConflict {
  type: 'time_off';
  exception: UnifiedAvailabilityException;
  message: string;
  severity: 'high' | 'medium' | 'low';
}

export interface AppointmentConflict {
  type: 'appointment';
  message: string;
  severity: 'high' | 'medium' | 'low';
  conflictingAppointments: Appointment[];
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  availabilityConflict: AvailabilityConflict | null;
  timeOffConflict: TimeOffConflict | null;
  appointmentConflict: AppointmentConflict | null;
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
      // First, get the appointment details
      const { data: appointmentData, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          client:client_profiles(*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      // Update the appointment status
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (updateError) throw updateError;
      
      // Send email notification if we have therapist profile
      if (therapistProfile && appointmentData) {
        // Send notification based on the new status
        await sendAppointmentStatusNotification(
          appointmentData as Appointment,
          therapistProfile.name,
          therapistProfile.email,
          status as 'pending' | 'confirmed' | 'cancelled' | 'completed'
        );
      }

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
      // Validate input times
      if (!startTime || !endTime) {
        console.error('Invalid time inputs to checkAvailabilityConflict:', { startTime, endTime });
        return null;
      }
      
      // Parse the ISO string to get a Date object in local time
      let startDate: Date;
      try {
        startDate = new Date(startTime);
        
        // Check if date is valid
        if (isNaN(startDate.getTime())) {
          console.error('Invalid start date in checkAvailabilityConflict:', startTime);
          return null;
        }
      } catch (error) {
        console.error('Error parsing start date in checkAvailabilityConflict:', error);
        return null;
      }
      
      const dayOfWeek = startDate.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Format time safely
      let timeOnly: string;
      try {
        timeOnly = format(startDate, 'HH:mm:ss');
      } catch (error) {
        console.error('Error formatting time in checkAvailabilityConflict:', error);
        // Fallback to extracting time manually
        const hours = startDate.getHours().toString().padStart(2, '0');
        const minutes = startDate.getMinutes().toString().padStart(2, '0');
        const seconds = startDate.getSeconds().toString().padStart(2, '0');
        timeOnly = `${hours}:${minutes}:${seconds}`;
      }
      
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
          message: `You don't have any availability set for ${format(startDate, 'EEEE')}s.`,
          severity: 'high'
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
          message: `This appointment is outside your regular availability hours for ${format(startDate, 'EEEE')}s.`,
          severity: 'medium'
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
      // Validate input times
      if (!startTime || !endTime) {
        console.error('Invalid time inputs to checkTimeOffConflict:', { startTime, endTime });
        return null;
      }
      
      // Parse the ISO strings to get Date objects in local time
      let startDate: Date;
      let endDate: Date;
      
      try {
        startDate = new Date(startTime);
        endDate = new Date(endTime);
        
        // Check if dates are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error('Invalid date(s) in checkTimeOffConflict:', { startTime, endTime });
          return null;
        }
      } catch (error) {
        console.error('Error parsing dates in checkTimeOffConflict:', error);
        return null;
      }
      
      const dayOfWeek = startDate.getDay();
      
      // Format date safely
      let formattedDate: string;
      try {
        formattedDate = format(startDate, 'yyyy-MM-dd');
      } catch (error) {
        console.error('Error formatting date in checkTimeOffConflict:', error);
        // Fallback to manual formatting
        const year = startDate.getFullYear();
        const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
        const day = startDate.getDate().toString().padStart(2, '0');
        formattedDate = `${year}-${month}-${day}`;
      }
      
      // Get all time-off exceptions
      const { data: exceptionsData, error } = await supabase
        .from('time_off')
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
          
          // Format appointment time safely
          let appointmentTimeOnly: string;
          let appointmentEndTimeOnly: string;
          
          try {
            appointmentTimeOnly = format(startDate, 'HH:mm:ss');
            appointmentEndTimeOnly = format(endDate, 'HH:mm:ss');
          } catch (error) {
            console.error('Error formatting appointment time in checkTimeOffConflict:', error);
            // Fallback to manual formatting
            appointmentTimeOnly = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}:00`;
            appointmentEndTimeOnly = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`;
          }
          
          // Check if appointment time overlaps with recurring time-off
          // Convert times to minutes for proper comparison
          const apptStart = timeToMinutes(appointmentTimeOnly);
          const apptEnd = timeToMinutes(appointmentEndTimeOnly);
          const exStart = timeToMinutes(exceptionStart);
          const exEnd = timeToMinutes(exceptionEnd);
          
          // Check for any overlap between the two time ranges
          if (!(apptEnd <= exStart || apptStart >= exEnd)) {
            let dayName: string;
            try {
              dayName = format(startDate, 'EEEE');
            } catch (error) {
              dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
            }
            
            return {
              type: 'time_off',
              exception,
              message: `This appointment conflicts with your recurring time-off on ${dayName}s${exception.reason ? ` (${exception.reason})` : ''}.`,
              severity: 'high'
            };
          }
        }
        // Check specific date or multi-day time-off
        else if (!exception.is_recurring && exception.start_date && exception.end_date) {
          let exceptionStartDate: Date;
          let exceptionEndDate: Date;
          
          try {
            exceptionStartDate = new Date(exception.start_date);
            exceptionEndDate = new Date(exception.end_date);
            
            // Check if dates are valid
            if (isNaN(exceptionStartDate.getTime()) || isNaN(exceptionEndDate.getTime())) {
              console.error('Invalid exception date(s):', { start: exception.start_date, end: exception.end_date });
              continue; // Skip this exception
            }
          } catch (error) {
            console.error('Error parsing exception dates:', error);
            continue; // Skip this exception
          }
          
          // Check if appointment date falls within time-off period
          if (
            (startDate >= exceptionStartDate && startDate <= exceptionEndDate) ||
            (endDate >= exceptionStartDate && endDate <= exceptionEndDate)
          ) {
            // For all-day time-off, it's automatically a conflict
            if (exception.is_all_day) {
              let formattedStartDate: string;
              let formattedEndDate: string;
              
              try {
                formattedStartDate = format(exceptionStartDate, 'MMM d, yyyy');
                formattedEndDate = format(exceptionEndDate, 'MMM d, yyyy');
              } catch (error) {
                console.error('Error formatting exception dates:', error);
                // Fallback to simple formatting
                formattedStartDate = exceptionStartDate.toLocaleDateString();
                formattedEndDate = exceptionEndDate.toLocaleDateString();
              }
              
              return {
                type: 'time_off',
                exception,
                message: `This appointment conflicts with your time-off from ${formattedStartDate} to ${formattedEndDate}${exception.reason ? ` (${exception.reason})` : ''}.`,
                severity: 'high'
              };
            }
            
            // For time-specific time-off, check time overlap
            let appointmentTimeOnly: string;
            let appointmentEndTimeOnly: string;
            
            try {
              appointmentTimeOnly = format(startDate, 'HH:mm:ss');
              appointmentEndTimeOnly = format(endDate, 'HH:mm:ss');
            } catch (error) {
              console.error('Error formatting appointment time in checkTimeOffConflict:', error);
              // Fallback to manual formatting
              appointmentTimeOnly = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}:00`;
              appointmentEndTimeOnly = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`;
            }
            
            // Convert times to minutes for proper comparison
            const apptStart = timeToMinutes(appointmentTimeOnly);
            const apptEnd = timeToMinutes(appointmentEndTimeOnly);
            const exStart = timeToMinutes(exception.start_time);
            const exEnd = timeToMinutes(exception.end_time);
            
            // Check for any overlap between the two time ranges
            if (!(apptEnd <= exStart || apptStart >= exEnd)) {
              let formattedExceptionStartDate: string;
              
              try {
                formattedExceptionStartDate = format(exceptionStartDate, 'MMM d, yyyy');
              } catch (error) {
                console.error('Error formatting exception start date:', error);
                formattedExceptionStartDate = exceptionStartDate.toLocaleDateString();
              }
              
              return {
                type: 'time_off',
                exception,
                message: `This appointment conflicts with your time-off on ${formattedExceptionStartDate}${exception.reason ? ` (${exception.reason})` : ''}.`,
                severity: 'high'
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

  // Function to check for conflicts with existing appointments
  const checkAppointmentConflicts = (
    appointments: Appointment[],
    appointmentDate: string,
    startTime: string,
    endTime: string
  ): AppointmentConflict | null => {
    try {
      if (!appointments || appointments.length === 0) {
        return null;
      }

      // Parse the new appointment times
      let newStartDateTime: Date;
      let newEndDateTime: Date;
      
      try {
        // If startTime and endTime are ISO strings, use them directly
        if (startTime.includes('T') && startTime.includes('Z')) {
          newStartDateTime = new Date(startTime);
        } else {
          // Otherwise, combine date and time
          newStartDateTime = new Date(`${appointmentDate}T${startTime}`);
        }
        
        if (endTime.includes('T') && endTime.includes('Z')) {
          newEndDateTime = new Date(endTime);
        } else {
          newEndDateTime = new Date(`${appointmentDate}T${endTime}`);
        }
      } catch (error) {
        console.error('Error parsing appointment times:', error);
        return null;
      }
      
      // Check for conflicts with existing appointments
      const conflictingAppointments = appointments.filter(appointment => {
        try {
          // Parse existing appointment times
          const existingStartTime = new Date(appointment.start_time);
          const existingEndTime = new Date(appointment.end_time);
          
          // Check for overlap
          return (
            (newStartDateTime < existingEndTime && newEndDateTime > existingStartTime) ||
            (existingStartTime < newEndDateTime && existingEndTime > newStartDateTime)
          );
        } catch (error) {
          console.error('Error checking appointment conflict:', error);
          return false;
        }
      });
      
      if (conflictingAppointments.length > 0) {
        return {
          type: 'appointment',
          severity: 'high',
          message: `This appointment overlaps with ${conflictingAppointments.length} existing appointment(s)`,
          conflictingAppointments
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error in checkAppointmentConflicts:', error);
      return null;
    }
  };

  // Function to check for conflicts
  const checkConflicts = async (
    startDate: string,
    startTime: string,
    endTime: string,
    therapistId: string = '',
    exceptions: UnifiedAvailabilityException[] = [],
    appointments: Appointment[] = []
  ): Promise<ConflictCheckResult> => {
    try {
      // Validate inputs
      if (!startDate || !startTime || !endTime) {
        console.error('Invalid inputs to checkConflicts:', { startDate, startTime, endTime });
        return {
          hasConflict: false,
          availabilityConflict: null,
          timeOffConflict: null,
          appointmentConflict: null
        };
      }
      
      // Log the input values for debugging
      console.log('checkConflicts input values:', { startDate, startTime, endTime });
      
      // Use the therapist profile ID if not provided
      const effectiveTherapistId = therapistId || (therapistProfile?.id || '');
      
      // Fetch exceptions if not provided
      let effectiveExceptions = exceptions;
      if (effectiveTherapistId && (!exceptions || exceptions.length === 0)) {
        try {
          const { data: exceptionsData } = await supabase
            .from('time_off')
            .select('*')
            .eq('therapist_id', effectiveTherapistId);
          
          effectiveExceptions = exceptionsData || [];
        } catch (error) {
          console.error('Error fetching exceptions:', error);
        }
      }
      
      // Check for availability conflicts
      let availabilityConflict: AvailabilityConflict | null = null;
      try {
        availabilityConflict = await checkAvailabilityConflict(startTime, endTime);
      } catch (error) {
        console.error('Error in availability conflict check:', error);
      }
      
      // Check for time-off conflicts
      let timeOffConflict: TimeOffConflict | null = null;
      try {
        timeOffConflict = await checkTimeOffConflict(startTime, endTime);
      } catch (error) {
        console.error('Error in time-off conflict check:', error);
      }
      
      // Check for appointment conflicts
      let appointmentConflict: AppointmentConflict | null = null;
      try {
        appointmentConflict = checkAppointmentConflicts(appointments, startDate, startTime, endTime);
      } catch (error) {
        console.error('Error in appointment conflict check:', error);
      }
      
      return {
        hasConflict: !!(availabilityConflict || timeOffConflict || appointmentConflict),
        availabilityConflict,
        timeOffConflict,
        appointmentConflict
      };
    } catch (error) {
      console.error('Error in checkConflicts:', error);
      return {
        hasConflict: false,
        availabilityConflict: null,
        timeOffConflict: null,
        appointmentConflict: null
      };
    }
  };

  // Function to create an appointment with conflict checking
  const createAppointmentWithConflictCheck = async (
    appointmentData: Partial<Appointment>,
    overrideTimeOff: boolean = false
  ): Promise<{ success: boolean; appointment?: Appointment; conflicts?: ConflictCheckResult }> => {
    try {
      // Validate required fields
      if (!appointmentData.start_time || !appointmentData.end_time) {
        throw new Error('Start time and end time are required');
      }
      
      // Parse the start and end times
      let startDate: Date;
      let endDate: Date;
      
      try {
        startDate = new Date(appointmentData.start_time);
        endDate = new Date(appointmentData.end_time);
      } catch (error) {
        console.error('Error parsing appointment dates:', error);
        throw new Error('Invalid date format');
      }
      
      // Format the date and times for conflict checking
      const appointmentDateStr = format(startDate, 'yyyy-MM-dd');
      const startTimeStr = appointmentData.start_time; // Use ISO string for conflict checking
      const endTimeStr = appointmentData.end_time;     // Use ISO string for conflict checking
      
      // Add timezone debugging information
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const timezoneOffset = startDate.getTimezoneOffset();
      
      console.log('Timezone debugging in createAppointmentWithConflictCheck:');
      console.log('User timezone:', userTimezone);
      console.log('Timezone offset (minutes):', timezoneOffset);
      console.log('Start time (ISO):', startTimeStr);
      console.log('End time (ISO):', endTimeStr);
      console.log('Appointment date:', appointmentDateStr);
      
      // Check for conflicts if not overriding time-off
      if (!overrideTimeOff) {
        try {
          // Fetch time-off exceptions for the therapist
          const { data: exceptionsData } = await supabase
            .from('time_off')
            .select('*')
            .eq('therapist_id', appointmentData.therapist_id || therapistProfile?.id || '');
          
          // Fetch existing appointments for conflict checking
          const { data: existingAppointments } = await supabase
            .from('appointments')
            .select('*')
            .eq('therapist_id', appointmentData.therapist_id || therapistProfile?.id || '');
          
          // Check for conflicts
          const conflicts = await checkConflicts(
            appointmentDateStr,
            startTimeStr,
            endTimeStr,
            appointmentData.therapist_id || therapistProfile?.id || '',
            exceptionsData || [],
            existingAppointments || []
          );
          
          if (conflicts.hasConflict) {
            return { success: false, conflicts };
          }
        } catch (error) {
          console.error('Error checking conflicts:', error);
        }
      }
      
      // Create the appointment
      const { data, error } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return { success: true, appointment: data };
    } catch (error) {
      console.error('Error creating appointment:', error);
      return { success: false };
    }
  };

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