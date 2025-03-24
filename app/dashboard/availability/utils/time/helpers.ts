import { format } from 'date-fns';

/**
 * Parse time string from ISO time string to HH:MM format
 */
export const parseTimeString = (timeStr: string): string => {
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) {
      // If timeStr is already in HH:MM format, just return it
      if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
        return timeStr;
      }
      // Default fallback
      return '09:00';
    }
    return date.toTimeString().substring(0, 5); // Returns HH:MM format
  } catch (error) {
    console.error('Error parsing time string:', timeStr, error);
    return '09:00'; // Default fallback
  }
};

/**
 * Calculate the merged time slot for overlapping availability
 */
export const calculateMergedSlot = (
  newStartTime: string,
  newEndTime: string,
  existingStartTime: string,
  existingEndTime: string
) => {
  // We just take the earlier start time and later end time
  const mergedStartTime = newStartTime < existingStartTime ? newStartTime : existingStartTime;
  const mergedEndTime = newEndTime > existingEndTime ? newEndTime : existingEndTime;
  
  return {
    startTime: mergedStartTime,
    endTime: mergedEndTime
  };
};

/**
 * Calculate the merged time slot for overlapping time off
 */
export const calculateMergedTimeOffSlot = (
  newStartTime: string,
  newEndTime: string,
  existingStartTime: string,
  existingEndTime: string
) => {
  // We just take the earlier start time and later end time
  const mergedStartTime = newStartTime < existingStartTime ? newStartTime : existingStartTime;
  const mergedEndTime = newEndTime > existingEndTime ? newEndTime : existingEndTime;
  
  return {
    startTime: mergedStartTime,
    endTime: mergedEndTime
  };
};

/**
 * Format timestamp to a formatted time (HH:MM)
 */
export const formatTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return format(date, 'HH:mm');
  } catch (error) {
    console.error('Error formatting time:', error);
    return timestamp;
  }
};

/**
 * Create an ISO timestamp from date and time strings
 */
export const createISOTimestamp = (dateStr: string, timeStr: string): string => {
  return `${dateStr}T${timeStr}:00`;
};

/**
 * Determine if a time off period is an all-day event
 */
export const isAllDayTimeOff = (start_time: string, end_time: string): boolean => {
  try {
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    
    const startHours = startDate.getHours();
    const startMinutes = startDate.getMinutes();
    const endHours = endDate.getHours();
    const endMinutes = endDate.getMinutes();
    
    // Check if it starts at midnight (00:00) or very early
    // and ends at 23:59 or very late
    return (
      (startHours === 0 && startMinutes === 0) || 
      (startHours <= 1 && startMinutes <= 10)
    ) && (
      (endHours === 23 && endMinutes >= 50) ||
      (endHours >= 22 && endMinutes >= 45)
    );
  } catch (error) {
    console.error('Error checking if time off is all day:', error);
    return false;
  }
}; 