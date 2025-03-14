import { format, addDays, startOfWeek } from 'date-fns';
import { DAYS_OF_WEEK } from './types';

/**
 * Formats a date for input fields (YYYY-MM-DD format)
 */
export function formatDateForInput(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Creates a default date string with specified hours and minutes
 */
export function createDefaultDate(hours: number, minutes: number = 0): string {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

/**
 * Ensures that the end time is after the start time by at least minDurationMinutes
 */
export function ensureEndTimeAfterStartTime(startTime: string, endTime: string, minDurationMinutes: number = 60): string {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  if (endTotalMinutes <= startTotalMinutes || (endTotalMinutes - startTotalMinutes) < minDurationMinutes) {
    const newEndTotalMinutes = startTotalMinutes + minDurationMinutes;
    const newEndHour = Math.floor(newEndTotalMinutes / 60);
    const newEndMinute = newEndTotalMinutes % 60;
    return `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}`;
  }
  
  return endTime;
}

/**
 * Gets the name of a day from its number (0 = Sunday, 6 = Saturday)
 */
export function getDayName(dayOfWeek: number): string {
  return DAYS_OF_WEEK[dayOfWeek];
}

/**
 * Formats a date range for display
 */
export function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate) return '';
  if (!endDate || startDate === endDate) {
    return format(new Date(startDate), 'MMMM d, yyyy');
  }
  return `${format(new Date(startDate), 'MMMM d')} - ${format(new Date(endDate), 'MMMM d, yyyy')}`;
}

/**
 * Converts minutes since midnight to a time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
} 