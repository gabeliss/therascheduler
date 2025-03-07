import { format } from 'date-fns';

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
    const date = new Date(dateString);
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