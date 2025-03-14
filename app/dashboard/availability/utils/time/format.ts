import { format } from 'date-fns';

// Generate time options in 15-minute increments with AM/PM format
export const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const displayTime = format(new Date(2024, 0, 1, hour, minute), 'h:mm a');
  return { value: time, label: displayTime };
});

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