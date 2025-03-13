import { format, addDays, startOfWeek, isAfter, isSameDay, parseISO } from 'date-fns';

// Generate time options in 15-minute increments with AM/PM format
export const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const displayTime = format(new Date(2024, 0, 1, hour, minute), 'h:mm a');
  return { value: time, label: displayTime };
});

// Business hours presets
export const BUSINESS_HOURS = {
  DEFAULT_START: '08:00', // 8:00 AM
  DEFAULT_END: '18:00',   // 6:00 PM
  MORNING_START: '08:00', // 8:00 AM
  MORNING_END: '12:00',   // 12:00 PM
  AFTERNOON_START: '13:00', // 1:00 PM
  AFTERNOON_END: '17:00',   // 5:00 PM
};

// Days of week constants
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

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
    
    // Create a date object with the parsed hours and minutes
    const date = new Date(2024, 0, 1, hours, minutes);
    
    // Format the date to get the time in "h:mm a" format
    return format(date, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', error);
    return time; // Return the original time string if there's an error
  }
};

// Convert time string to minutes for comparison
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convert minutes to time string
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Check if two time ranges overlap
export function checkTimeOverlap(
  startTime1: string,
  endTime1: string,
  startTime2: string,
  endTime2: string
): boolean {
  const start1 = timeToMinutes(startTime1);
  const end1 = timeToMinutes(endTime1);
  const start2 = timeToMinutes(startTime2);
  const end2 = timeToMinutes(endTime2);
  
  return (start1 < end2 && end1 > start2);
}

// Get an array of dates for a week
export const getWeekDates = (weekOffset = 0) => {
  const today = new Date();
  const startDate = startOfWeek(today);
  
  // Apply the week offset
  startDate.setDate(startDate.getDate() + (weekOffset * 7));
  
  // Generate an array of 7 days starting from the start date
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date;
  });
};

// Format date for display
export const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '';
  
  try {
    // Parse the date string manually to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Create date with local timezone interpretation (no timezone conversion)
    const date = new Date(year, month - 1, day);
    
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

// Format a date for datetime-local input
export function formatDateForInput(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

// Create a default date with specific hours
export function createDefaultDate(hours: number, minutes: number = 0): string {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return formatDateForInput(date);
}

// Validate that end time is after start time
export function validateTimeRange(startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) return true;
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  return end > start;
}

// Ensure end time is after start time, adjusting if necessary
export function ensureEndTimeAfterStartTime(startTime: string, endTime: string, minDurationMinutes: number = 60): string {
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  if (end <= start) {
    // Set end time to be minDurationMinutes after start time
    const newEnd = new Date(start);
    newEnd.setMinutes(start.getMinutes() + minDurationMinutes);
    return formatDateForInput(newEnd);
  }
  
  return endTime;
}

// Get day name from day of week number
export const getDayName = (dayOfWeek: number): string => {
  const day = DAYS_OF_WEEK.find(d => d.value === dayOfWeek);
  return day ? day.label : '';
};

// Format date range for display
export const formatDateRange = (startDate?: string, endDate?: string): string => {
  if (!startDate) return '';
  if (!endDate) return formatDate(startDate);
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}; 