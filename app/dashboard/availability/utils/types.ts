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
    type: base.is_recurring ? 'recurring' : 'specific',
    day: base.is_recurring ? getDayName(base.day_of_week) : undefined,
    date: base.specific_date,
    start_time: base.start_time,
    end_time: base.end_time
  };
  
  // Convert exceptions
  const uiExceptions: Exception[] = exceptions.map(ex => ({
    id: ex.id,
    start_time: ex.start_time,
    end_time: ex.end_time,
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
}): {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate?: string;
} {
  return {
    dayOfWeek: data.type === 'recurring' && data.day ? getDayNumber(data.day) : 0,
    startTime: data.startTime,
    endTime: data.endTime,
    isRecurring: data.type === 'recurring',
    specificDate: data.type === 'specific' ? data.date : undefined
  };
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