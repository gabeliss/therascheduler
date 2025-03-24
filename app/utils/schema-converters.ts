/**
 * Schema converter utilities
 * 
 * These functions help convert between different schema formats
 * and provide utilities for working with the new recurrence-based schema.
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 6 = Saturday

/**
 * Creates a recurrence string in the format "weekly:Day1,Day2,..."
 */
export function createRecurrenceString(days: DayOfWeek[]): string {
  const dayNames = days.map(day => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]);
  return `weekly:${dayNames.join(',')}`;
}

/**
 * Extracts days of week from a recurrence string
 */
export function getDaysOfWeekFromRecurrence(recurrence: string | null): DayOfWeek[] {
  if (!recurrence || !recurrence.startsWith('weekly:')) return [];
  
  const daysString = recurrence.split(':')[1];
  const dayNames = daysString.split(',');
  
  return dayNames.map(day => {
    switch (day) {
      case 'Sun': return 0;
      case 'Mon': return 1;
      case 'Tue': return 2;
      case 'Wed': return 3;
      case 'Thu': return 4;
      case 'Fri': return 5;
      case 'Sat': return 6;
      default: return -1;
    }
  }).filter(day => day !== -1) as DayOfWeek[];
}

/**
 * Checks if a recurrence pattern includes a specific day of week
 */
export function recurrenceIncludesDay(recurrence: string | null, dayOfWeek: DayOfWeek): boolean {
  const days = getDaysOfWeekFromRecurrence(recurrence);
  return days.includes(dayOfWeek);
}

/**
 * Creates an ISO timestamp from date and time parts
 */
export function createTimestamp(date: string, time: string): string {
  const dateObj = new Date(date);
  const [hours, minutes] = time.split(':').map(Number);
  dateObj.setHours(hours, minutes, 0, 0);
  return dateObj.toISOString();
}

/**
 * Creates a multi-day time-off timestamp range (inclusive start, exclusive end)
 */
export function createMultiDayTimeOffRange(startDate: string, endDate: string, isAllDay: boolean = true): {
  start_time: string;
  end_time: string;
} {
  // For all-day time off, we use midnight to midnight
  if (isAllDay) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    // End date is exclusive in our schema, so we set it to midnight of the day AFTER the end date
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);
    
    return {
      start_time: start.toISOString(),
      end_time: end.toISOString()
    };
  }

  // For partial day time off, the caller needs to provide the specific time range
  throw new Error('createMultiDayTimeOffRange requires specific times for non-all-day ranges');
} 