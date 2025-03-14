import { format } from 'date-fns';
import { DAYS_OF_WEEK } from './types';

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
 * Checks if a given date falls within a multi-day event's date range
 * 
 * @param date The date to check (Date object)
 * @param startDate The event's start date (string in format 'YYYY-MM-DD')
 * @param endDate The event's end date (string in format 'YYYY-MM-DD')
 * @returns boolean indicating if the date is within the event's range
 */
export function isDateInMultiDayEvent(
  date: Date,
  startDate?: string,
  endDate?: string
): boolean {
  if (!startDate || !endDate) return false;
  
  const dateString = format(date, 'yyyy-MM-dd');
  return dateString >= startDate && dateString <= endDate;
} 