// Import the original types
import { BaseAvailability as OriginalBaseAvailability, AvailabilityException as OriginalAvailabilityException, HierarchicalAvailability as OriginalHierarchicalAvailability } from '@/app/types';

// Re-export the original types with type aliases
export type BaseAvailability = OriginalBaseAvailability;
export type AvailabilityException = OriginalAvailabilityException;

// Export the original HierarchicalAvailability type
export type HierarchicalAvailability = OriginalHierarchicalAvailability[];

// Define additional types for our UI components
export interface AvailabilityBase {
  id: string;
  type: 'recurring' | 'specific';
  day?: string;
  date?: string;
  start_time: string;
  end_time: string;
}

export interface Exception {
  id: string;
  start_time: string;
  end_time: string;
  reason?: string;
}

export interface HierarchicalItem {
  base: AvailabilityBase;
  exceptions: Exception[];
}

// Helper function to convert from API format to UI format
export function convertToUIFormat(item: OriginalHierarchicalAvailability): HierarchicalItem {
  const { base, exceptions } = item;
  
  // Convert base availability
  const uiBase: AvailabilityBase = {
    id: base.id,
    type: base.recurrence ? 'recurring' : 'specific',
    day: base.recurrence ? getDayNamesFromRecurrence(base.recurrence) : undefined,
    date: base.recurrence ? undefined : formatDateFromTimestamp(base.start_time),
    start_time: formatTimeFromTimestamp(base.start_time),
    end_time: formatTimeFromTimestamp(base.end_time)
  };
  
  // Convert exceptions
  const uiExceptions: Exception[] = exceptions.map(ex => ({
    id: ex.id,
    start_time: formatTimeFromTimestamp(ex.start_time),
    end_time: formatTimeFromTimestamp(ex.end_time),
    reason: ex.reason
  }));
  
  return {
    base: uiBase,
    exceptions: uiExceptions
  };
}

// Helper function to convert from UI format to API format for adding base availability
export function convertBaseToAPIFormat(data: {
  type: 'recurring' | 'specific';
  day?: string;
  date?: string;
  startTime: string;
  endTime: string;
  forceAdd?: boolean;
}): {
  start_time: string; 
  end_time: string;
  recurrence: string | null;
  forceAdd?: boolean;
} {
  // For recurring availability, create recurrence string
  let recurrence: string | null = null;
  if (data.type === 'recurring' && data.day) {
    const dayNumber = getDayNumber(data.day);
    recurrence = `weekly:${dayNumber}`;
  }
  
  // Create ISO timestamps
  let startTimestamp: string; 
  let endTimestamp: string;
  
  if (data.type === 'specific' && data.date) {
    // For specific date, use the provided date with the time
    startTimestamp = `${data.date}T${data.startTime}:00`;
    endTimestamp = `${data.date}T${data.endTime}:00`;
  } else {
    // For recurring slots, use the current date with the time
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    startTimestamp = `${today}T${data.startTime}:00`;
    endTimestamp = `${today}T${data.endTime}:00`;
  }
  
  return {
    start_time: startTimestamp,
    end_time: endTimestamp,
    recurrence,
    forceAdd: data.forceAdd
  };
}

// Helper function to get day names from recurrence pattern
function getDayNamesFromRecurrence(recurrence: string | null): string | undefined {
  if (!recurrence) return undefined;
  
  const parts = recurrence.split(':');
  if (parts.length !== 2 || parts[0] !== 'weekly') return undefined;
  
  const dayNumbers = parts[1].split(',').map(Number);
  return dayNumbers.map(getDayName).join(', ');
}

// Helper function to format date from ISO timestamp
function formatDateFromTimestamp(timestamp: string): string | undefined {
  try {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch (error) {
    return undefined;
  }
}

// Helper function to format time from ISO timestamp
function formatTimeFromTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } catch (error) {
    return '00:00';
  }
}

// Helper function to get day name from number
function getDayName(dayNumber: number): string {
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];
  return days[dayNumber];
}

// Helper function to get day number from name
function getDayNumber(dayName: string): number {
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];
  return days.indexOf(dayName);
} 