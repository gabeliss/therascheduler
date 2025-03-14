import { format } from 'date-fns';

// Define a TimeBlock interface for type safety
export interface TimeBlock {
  id: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  type: 'availability' | 'time-off' | 'appointment';
  reason?: string;
  original: any;
  original_time?: string;
  is_all_day?: boolean;
  start_date?: string;
  end_date?: string;
  client_name?: string;
  status?: string;
  overrides_time_off?: boolean;
}

// Generate time options in 15-minute increments with AM/PM format
export const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const displayTime = format(new Date(2024, 0, 1, hour, minute), 'h:mm a');
  return { value: time, label: displayTime };
});

// Business hours presets (8am to 6pm)
export const BUSINESS_HOURS = {
  DEFAULT_START: '08:00', // 8:00 AM
  DEFAULT_END: '18:00',   // 6:00 PM
  MORNING_START: '08:00', // 8:00 AM
  MORNING_END: '12:00',   // 12:00 PM
  AFTERNOON_START: '13:00', // 1:00 PM
  AFTERNOON_END: '17:00',   // 5:00 PM
};

// Find the index of a time in the TIME_OPTIONS array
export const findTimeIndex = (time: string) => {
  return TIME_OPTIONS.findIndex(option => option.value === time);
};

// Format time for display
export const formatTime = (time: string) => {
  if (!time) return '';
  
  try {
    // Handle both HH:MM and HH:MM:SS formats
    const timeValue = time.includes(':') ? time.split(':').slice(0, 2).join(':') : time;
    
    // Find the corresponding time option
    const timeOption = TIME_OPTIONS.find(option => option.value === timeValue);
    
    if (timeOption) {
      return timeOption.label; // This is already in the format "h:mm a" (e.g., "9:00 am")
    }
    
    // Fallback for times not in TIME_OPTIONS
    // Parse the time string (assuming format is HH:MM or HH:MM:SS)
    const [hoursStr, minutesStr] = timeValue.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    
    // Validate hours and minutes
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error(`Invalid time format: ${time}`);
    }
    
    // Format the time manually without using date-fns format
    const period = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${period}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    
    // Try to extract and format the time in a more basic way
    try {
      const parts = time.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        
        if (!isNaN(hours) && !isNaN(minutes)) {
          const period = hours >= 12 ? 'pm' : 'am';
          const displayHours = hours % 12 || 12;
          const displayMinutes = minutes.toString().padStart(2, '0');
          
          return `${displayHours}:${displayMinutes} ${period}`;
        }
      }
    } catch (e) {
      // If all else fails, return the original time
      console.error('Fallback formatting failed:', e);
    }
    
    return time; // Return the original time string if all parsing fails
  }
};

// Check if two time ranges overlap
export function checkTimeOverlap(
  startTime1: string,
  endTime1: string,
  startTime2: string,
  endTime2: string
): boolean {
  // Convert times to minutes for easier comparison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const start1 = timeToMinutes(startTime1);
  const end1 = timeToMinutes(endTime1);
  const start2 = timeToMinutes(startTime2);
  const end2 = timeToMinutes(endTime2);

  // Check for overlap
  return start1 < end2 && start2 < end1;
}

// Days of week array
export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// Get dates for a week with an offset
export const getWeekDates = (weekOffset = 0) => {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate the start of the current week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - currentDay + (weekOffset * 7));
  
  // Generate an array of dates for the week
  return DAYS_OF_WEEK.map((day, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    return {
      dayName: day,
      date: date,
      formattedDate: format(date, 'MMMM d, yyyy')
    };
  });
};

// Format date for display
export const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '';
  try {
    // Parse the date string and handle timezone issues
    // Add time component and force UTC interpretation to avoid timezone shifts
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Create date with local timezone interpretation (no timezone conversion)
    const date = new Date(year, month - 1, day);
    
    return format(date, 'MMMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

// Add TIME_SLOTS constant for the unified calendar view
export const TIME_SLOTS = Array.from({ length: 26 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7; // Start at 7am
  const minute = (i % 2) * 30;
  const timeValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  
  // Format for display (e.g., "7:00 AM")
  const displayHour = hour % 12 || 12;
  const amPm = hour < 12 ? 'AM' : 'PM';
  const label = `${displayHour}:${minute.toString().padStart(2, '0')} ${amPm}`;
  
  return {
    value: timeValue,
    label
  };
});

// Convert time string (HH:MM) to minutes
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Validate that end time is after start time
export function validateTimeRange(startTime: string, endTime: string): { isValid: boolean; errorMessage?: string } {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  if (endMinutes <= startMinutes) {
    return {
      isValid: false,
      errorMessage: 'End time cannot be before or equal to start time'
    };
  }
  
  return { isValid: true };
}

/**
 * Determines whether a recurring availability or time off should be shown for a specific date.
 * For past dates, it checks if the item was created on or before that date.
 * For current and future dates, it always returns true.
 * 
 * @param date The date to check against
 * @param createdAt The creation date of the recurring item
 * @param isPastDateOverride Optional override for isPastDate calculation (for testing)
 * @returns boolean Whether the recurring item should be shown for this date
 */
export function shouldShowRecurringForDate(
  date: Date,
  createdAt: string | Date,
  isPastDateOverride?: boolean
): boolean {
  // Check if this date is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastDate = isPastDateOverride !== undefined ? isPastDateOverride : date < today;
  
  // If this is a past date, check if the item was created before or on this date
  if (isPastDate) {
    const createdAtDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    const dateToCheck = new Date(date);
    // Only show recurring items if they were created on or before this date
    return createdAtDate <= dateToCheck;
  }
  
  // For current and future dates, always show recurring items
  return true;
}

/**
 * Resolves conflicts between appointments and time off blocks
 * Appointments always take precedence over time off blocks
 * 
 * @param blocks Array of time blocks to resolve conflicts for
 * @returns Array of time blocks with conflicts resolved
 */
export function resolveTimeBlockConflicts(blocks: TimeBlock[]): TimeBlock[] {
  // First pass: identify all appointments
  const appointments = blocks.filter(block => block.type === 'appointment');
  
  
  // If no appointments, return blocks as is
  if (appointments.length === 0) {
    return blocks;
  }
  
  // Second pass: remove or split time off blocks that conflict with appointments
  const resolvedBlocks: TimeBlock[] = [];
  
  // First add all non-time-off blocks (including appointments)
  const nonTimeOffBlocks = blocks.filter(block => block.type !== 'time-off');
  resolvedBlocks.push(...nonTimeOffBlocks);
  
  // Then process time-off blocks
  for (const block of blocks) {
    // Skip non-time-off blocks as we've already added them
    if (block.type !== 'time-off') {
      continue;
    }
    
    const blockStartMinutes = timeToMinutes(block.start_time);
    const blockEndMinutes = timeToMinutes(block.end_time);
    
    // Find all appointments that overlap with this time off block
    const overlappingAppointments = appointments.filter(appt => {
      const apptStartMinutes = timeToMinutes(appt.start_time);
      const apptEndMinutes = timeToMinutes(appt.end_time);
      
      const overlaps = (
        (apptStartMinutes < blockEndMinutes && apptEndMinutes > blockStartMinutes) ||
        (blockStartMinutes < apptEndMinutes && blockEndMinutes > apptStartMinutes)
      );
      
      return overlaps;
    }).sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    
    // If no overlapping appointments, add the time off block as is
    if (overlappingAppointments.length === 0) {
      resolvedBlocks.push(block);
      continue;
    }
    
    // Split the time off block around the appointments
    let currentStartMinutes = blockStartMinutes;
    let hasAddedSegment = false;
    
    for (const appt of overlappingAppointments) {
      const apptStartMinutes = timeToMinutes(appt.start_time);
      const apptEndMinutes = timeToMinutes(appt.end_time);
      
      // Add time off segment before the appointment if there's a gap
      if (currentStartMinutes < apptStartMinutes) {
        const newBlock = {
          ...block,
          id: `${block.id}-split-before-${appt.id}`,
          start_time: minutesToTimeString(currentStartMinutes),
          end_time: minutesToTimeString(apptStartMinutes)
        };

        resolvedBlocks.push(newBlock);
        hasAddedSegment = true;
      }
      
      // Update current start to after this appointment
      currentStartMinutes = Math.max(currentStartMinutes, apptEndMinutes);
    }
    
    // Add final time off segment after all appointments if needed
    if (currentStartMinutes < blockEndMinutes) {
      const newBlock = {
        ...block,
        id: `${block.id}-split-after`,
        start_time: minutesToTimeString(currentStartMinutes),
        end_time: minutesToTimeString(blockEndMinutes)
      };
      
      resolvedBlocks.push(newBlock);
      hasAddedSegment = true;
    }
    
  }
  
  // Sort the resolved blocks by start time
  const result = resolvedBlocks.sort((a, b) => 
    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );
  
  return result;
}

/**
 * Helper function to convert time string to minutes since midnight
 * 
 * @param timeString Time string in format HH:MM:SS
 * @returns Minutes since midnight
 */
function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
}

/**
 * Creates a unified timeline of availability, time off, and appointment blocks
 * with all conflicts properly resolved.
 * 
 * @param availabilitySlots Array of availability slots
 * @param exceptionSlots Array of time off exceptions
 * @param appointmentSlots Array of appointments
 * @param date The date for which to create the timeline
 * @returns Array of time blocks with all conflicts resolved
 */
export function createUnifiedTimeBlocks(
  availabilitySlots: any[],
  exceptionSlots: any[],
  appointmentSlots: any[] = [],
  date?: Date
): TimeBlock[] {
  // Helper function to convert minutes to time string (HH:MM:SS)
  const minutesToTimeString = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
  };

  // Process appointments first - they take highest priority
  let appointmentBlocks: TimeBlock[] = [];
  if (appointmentSlots.length > 0) {
    // Convert appointments to TimeBlock format
    appointmentBlocks = appointmentSlots.map(appointment => {
      // Get the correct start and end times
      let startTimeStr, endTimeStr;
      
      if ('display_start_time' in appointment && typeof appointment.display_start_time === 'string') {
        // Use the display time properties if available
        startTimeStr = appointment.display_start_time;
        endTimeStr = 'display_end_time' in appointment && typeof appointment.display_end_time === 'string' 
          ? appointment.display_end_time 
          : format(new Date(appointment.end_time), 'HH:mm:ss');
      } else if ('formatted_start_time' in appointment && typeof appointment.formatted_start_time === 'string') {
        // Use the formatted time if available
        const formattedStart = new Date(appointment.formatted_start_time);
        const formattedEnd = new Date(
          'formatted_end_time' in appointment && typeof appointment.formatted_end_time === 'string' 
            ? appointment.formatted_end_time 
            : appointment.end_time
        );
        startTimeStr = format(formattedStart, 'HH:mm:ss');
        endTimeStr = format(formattedEnd, 'HH:mm:ss');
      } else {
        // Fall back to regular time handling
        const startDate = new Date(appointment.start_time);
        const endDate = new Date(appointment.end_time);
        startTimeStr = format(startDate, 'HH:mm:ss');
        endTimeStr = format(endDate, 'HH:mm:ss');
      }
      
      // Get client name safely with proper type checking
      let clientName = undefined;
      if ('client' in appointment && 
          appointment.client && 
          typeof appointment.client === 'object' && 
          'name' in appointment.client) {
        clientName = appointment.client.name;
      }
      
      
      return {
        id: appointment.id,
        start_time: startTimeStr,
        end_time: endTimeStr,
        is_recurring: false,
        type: 'appointment' as const,
        reason: appointment.notes,
        original: appointment,
        start_date: format(new Date(appointment.start_time), 'yyyy-MM-dd'),
        end_date: format(new Date(appointment.end_time), 'yyyy-MM-dd'),
        client_name: clientName,
        status: appointment.status,
        // All appointments now override time-off by default
        overrides_time_off: true
      };
    });
  }

  // Convert availability slots to TimeBlock format
  const availabilityBlocks: TimeBlock[] = availabilitySlots.map(slot => ({
    id: slot.id,
    start_time: slot.start_time,
    end_time: slot.end_time,
    is_recurring: slot.is_recurring,
    type: 'availability' as const,
    original: slot,
    is_all_day: slot.is_all_day
  }));

  // Process time off exceptions, but exclude any that overlap with appointments
  const processedExceptionBlocks: TimeBlock[] = [];
  
  // Sort exceptions by priority (non-recurring first, then by start time)
  const sortedExceptions = [...exceptionSlots].sort((a, b) => {
    // Non-recurring exceptions take precedence
    if (a.is_recurring !== b.is_recurring) {
      return a.is_recurring ? 1 : -1;
    }
    // If both are the same type, sort by start time
    return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
  });
  
  // Process each exception and handle overlaps
  for (const ex of sortedExceptions) {
    const exStartMinutes = timeToMinutes(ex.start_time);
    const exEndMinutes = timeToMinutes(ex.end_time);
    
    // Check if this exception overlaps with any appointment
    const overlapsWithAppointment = appointmentBlocks.some(appt => {
      const apptStartMinutes = timeToMinutes(appt.start_time);
      const apptEndMinutes = timeToMinutes(appt.end_time);
      
      return (
        (exStartMinutes < apptEndMinutes && exEndMinutes > apptStartMinutes) ||
        (apptStartMinutes < exEndMinutes && apptEndMinutes > exStartMinutes)
      );
    });
    
    // If this exception overlaps with an appointment, split it or skip it
    if (overlapsWithAppointment) {
      // Find all overlapping appointments
      const overlappingAppointments = appointmentBlocks
        .filter(appt => {
          const apptStartMinutes = timeToMinutes(appt.start_time);
          const apptEndMinutes = timeToMinutes(appt.end_time);
          
          return (
            (exStartMinutes < apptEndMinutes && exEndMinutes > apptStartMinutes) ||
            (apptStartMinutes < exEndMinutes && apptEndMinutes > exStartMinutes)
          );
        })
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
      
      // Split the exception around appointments
      let currentStartMinutes = exStartMinutes;
      
      for (const appt of overlappingAppointments) {
        const apptStartMinutes = timeToMinutes(appt.start_time);
        const apptEndMinutes = timeToMinutes(appt.end_time);
        
        // Add exception segment before the appointment if there's a gap
        if (currentStartMinutes < apptStartMinutes) {
          processedExceptionBlocks.push({
            id: `${ex.id}-split-before-${appt.id}`,
            start_time: minutesToTimeString(currentStartMinutes),
            end_time: minutesToTimeString(apptStartMinutes),
            is_recurring: ex.is_recurring,
            type: 'time-off' as const,
            reason: ex.reason,
            original: ex,
            is_all_day: ex.is_all_day,
            start_date: ex.start_date,
            end_date: ex.end_date
          });
        }
        
        // Update current start to after this appointment
        currentStartMinutes = Math.max(currentStartMinutes, apptEndMinutes);
      }
      
      // Add final exception segment after all appointments if needed
      if (currentStartMinutes < exEndMinutes) {
        processedExceptionBlocks.push({
          id: `${ex.id}-split-after`,
          start_time: minutesToTimeString(currentStartMinutes),
          end_time: minutesToTimeString(exEndMinutes),
          is_recurring: ex.is_recurring,
          type: 'time-off' as const,
          reason: ex.reason,
          original: ex,
          is_all_day: ex.is_all_day,
          start_date: ex.start_date,
          end_date: ex.end_date
        });
      }
    } else {
      // No overlaps with appointments, check for overlaps with other exceptions
      const overlappingBlocks = processedExceptionBlocks.filter(block => {
        const blockStartMinutes = timeToMinutes(block.start_time);
        const blockEndMinutes = timeToMinutes(block.end_time);
        
        return (
          (exStartMinutes < blockEndMinutes && exEndMinutes > blockStartMinutes) ||
          (blockStartMinutes < exEndMinutes && blockEndMinutes > exStartMinutes)
        );
      });
      
      if (overlappingBlocks.length === 0) {
        // No overlaps, add the exception as is
        processedExceptionBlocks.push({
          id: ex.id,
          start_time: ex.start_time,
          end_time: ex.end_time,
          is_recurring: ex.is_recurring,
          type: 'time-off' as const,
          reason: ex.reason,
          original: ex,
          is_all_day: ex.is_all_day,
          start_date: ex.start_date,
          end_date: ex.end_date
        });
        continue;
      }
      
      // Handle overlaps for recurring exceptions
      if (ex.is_recurring) {
        // Check if it's completely covered by any one-time exception
        const completelyOverlapped = overlappingBlocks.some(block => {
          const blockStartMinutes = timeToMinutes(block.start_time);
          const blockEndMinutes = timeToMinutes(block.end_time);
          return blockStartMinutes <= exStartMinutes && blockEndMinutes >= exEndMinutes;
        });
        
        if (completelyOverlapped) {
          // Skip this recurring exception as it's completely covered
          continue;
        }
        
        // Split the recurring exception around one-time exceptions
        let currentStartMinutes = exStartMinutes;
        let segments: {start: number, end: number}[] = [];
        
        // Sort overlapping blocks by start time
        const sortedOverlaps = [...overlappingBlocks].sort((a, b) => 
          timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
        );
        
        // Create segments for the parts of the recurring exception that don't overlap
        for (const block of sortedOverlaps) {
          const blockStartMinutes = timeToMinutes(block.start_time);
          const blockEndMinutes = timeToMinutes(block.end_time);
          
          // Add segment before this overlap if there's a gap
          if (currentStartMinutes < blockStartMinutes) {
            segments.push({
              start: currentStartMinutes,
              end: blockStartMinutes
            });
          }
          
          // Update current start to after this overlap
          currentStartMinutes = Math.max(currentStartMinutes, blockEndMinutes);
        }
        
        // Add final segment if needed
        if (currentStartMinutes < exEndMinutes) {
          segments.push({
            start: currentStartMinutes,
            end: exEndMinutes
          });
        }
        
        // Add each segment as a separate block
        segments.forEach((segment, index) => {
          processedExceptionBlocks.push({
            id: `${ex.id}-split-${index}`,
            start_time: minutesToTimeString(segment.start),
            end_time: minutesToTimeString(segment.end),
            is_recurring: true,
            type: 'time-off' as const,
            reason: ex.reason,
            original: ex,
            is_all_day: ex.is_all_day,
            start_date: ex.start_date,
            end_date: ex.end_date
          });
        });
      } else {
        // For one-time exceptions, they take precedence over recurring ones
        // Just add them as is
        processedExceptionBlocks.push({
          id: ex.id,
          start_time: ex.start_time,
          end_time: ex.end_time,
          is_recurring: ex.is_recurring,
          type: 'time-off' as const,
          reason: ex.reason,
          original: ex,
          is_all_day: ex.is_all_day,
          start_date: ex.start_date,
          end_date: ex.end_date
        });
      }
    }
  }
  
  const exceptionBlocks = processedExceptionBlocks;

  // Create a unified timeline by splitting availability blocks around time off blocks
  let unifiedBlocks: TimeBlock[] = [];

  // Process each availability block
  for (const availBlock of availabilityBlocks) {
    const availStartMinutes = timeToMinutes(availBlock.start_time);
    const availEndMinutes = timeToMinutes(availBlock.end_time);
    
    // Find all overlapping time off blocks
    const overlappingExceptions = exceptionBlocks.filter(exBlock => {
      const exStartMinutes = timeToMinutes(exBlock.start_time);
      const exEndMinutes = timeToMinutes(exBlock.end_time);
      
      return (
        (exStartMinutes >= availStartMinutes && exStartMinutes < availEndMinutes) ||
        (exEndMinutes > availStartMinutes && exEndMinutes <= availEndMinutes) ||
        (exStartMinutes <= availStartMinutes && exEndMinutes >= availEndMinutes)
      );
    }).sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    
    // If no overlapping exceptions, add the availability block as is
    if (overlappingExceptions.length === 0) {
      unifiedBlocks.push(availBlock);
      continue;
    }
    
    // Split the availability block around the time off blocks
    let currentStartMinutes = availStartMinutes;
    
    for (const exBlock of overlappingExceptions) {
      const exStartMinutes = timeToMinutes(exBlock.start_time);
      const exEndMinutes = timeToMinutes(exBlock.end_time);
      
      // Add availability block before the time off if there's a gap
      if (currentStartMinutes < exStartMinutes) {
        unifiedBlocks.push({
          ...availBlock,
          id: `${availBlock.id}-split-${currentStartMinutes}-${exStartMinutes}`,
          start_time: minutesToTimeString(currentStartMinutes),
          end_time: minutesToTimeString(exStartMinutes),
          original_time: `${availBlock.start_time} - ${availBlock.end_time}`
        });
      }
      
      // Add the time off block
      unifiedBlocks.push(exBlock);
      
      // Update the current start time to after this time off block
      currentStartMinutes = Math.max(currentStartMinutes, exEndMinutes);
    }
    
    // Add the final availability block after all time off blocks if needed
    if (currentStartMinutes < availEndMinutes) {
      unifiedBlocks.push({
        ...availBlock,
        id: `${availBlock.id}-split-${currentStartMinutes}-${availEndMinutes}`,
        start_time: minutesToTimeString(currentStartMinutes),
        end_time: minutesToTimeString(availEndMinutes),
        original_time: `${availBlock.start_time} - ${availBlock.end_time}`
      });
    }
  }
  
  // Process availability blocks around appointments
  if (appointmentBlocks.length > 0) {
    const availabilityBlocksToProcess = [...unifiedBlocks].filter(block => block.type === 'availability');
    const otherBlocks = unifiedBlocks.filter(block => block.type !== 'availability');
    
    let processedBlocks: TimeBlock[] = [...otherBlocks];
    
    // Process each availability block
    for (const availBlock of availabilityBlocksToProcess) {
      const availStartMinutes = timeToMinutes(availBlock.start_time);
      const availEndMinutes = timeToMinutes(availBlock.end_time);
      
      // Find all overlapping appointment blocks
      const overlappingAppointments = appointmentBlocks.filter(apptBlock => {
        const apptStartMinutes = timeToMinutes(apptBlock.start_time);
        const apptEndMinutes = timeToMinutes(apptBlock.end_time);
        
        return (
          (apptStartMinutes >= availStartMinutes && apptStartMinutes < availEndMinutes) ||
          (apptEndMinutes > availStartMinutes && apptEndMinutes <= availEndMinutes) ||
          (apptStartMinutes <= availStartMinutes && apptEndMinutes >= availEndMinutes)
        );
      }).sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
      
      // If no overlapping appointments, add the availability block as is
      if (overlappingAppointments.length === 0) {
        processedBlocks.push(availBlock);
        continue;
      }
      
      // Split the availability block around the appointment blocks
      let currentStartMinutes = availStartMinutes;
      
      for (const apptBlock of overlappingAppointments) {
        const apptStartMinutes = timeToMinutes(apptBlock.start_time);
        const apptEndMinutes = timeToMinutes(apptBlock.end_time);
        
        // Add availability block before the appointment if there's a gap
        if (currentStartMinutes < apptStartMinutes) {
          processedBlocks.push({
            ...availBlock,
            id: `${availBlock.id}-split-${currentStartMinutes}-${apptStartMinutes}`,
            start_time: minutesToTimeString(currentStartMinutes),
            end_time: minutesToTimeString(apptStartMinutes),
            original_time: `${availBlock.start_time} - ${availBlock.end_time}`
          });
        }
        
        // Add the appointment block
        processedBlocks.push(apptBlock);
        
        // Update the current start time to after this appointment block
        currentStartMinutes = Math.max(currentStartMinutes, apptEndMinutes);
      }
      
      // Add the final availability block after all appointment blocks if needed
      if (currentStartMinutes < availEndMinutes) {
        processedBlocks.push({
          ...availBlock,
          id: `${availBlock.id}-split-${currentStartMinutes}-${availEndMinutes}`,
          start_time: minutesToTimeString(currentStartMinutes),
          end_time: minutesToTimeString(availEndMinutes),
          original_time: `${availBlock.start_time} - ${availBlock.end_time}`
        });
      }
    }
    
    unifiedBlocks = processedBlocks;
  }
  
  // Make sure all appointments are included in the final blocks
  // This ensures appointments are always shown, even if they don't overlap with availability
  const existingAppointmentIds = unifiedBlocks
    .filter(block => block.type === 'appointment')
    .map(block => block.id);
  
  const missingAppointments = appointmentBlocks.filter(
    appt => !existingAppointmentIds.includes(appt.id)
  );
  
  if (missingAppointments.length > 0) {
    unifiedBlocks = [...unifiedBlocks, ...missingAppointments];
  }
  
  // Sort the unified blocks by start time
  const sortedBlocks = unifiedBlocks.sort((a, b) => 
    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );

  return sortedBlocks;
} 