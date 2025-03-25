import { format } from 'date-fns';
import { TherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { TimeOff, Appointment } from '@/app/types/index';
import { TimeBlock } from './types';
import { shouldShowRecurringForDate, isDateInMultiDayEvent } from './dates';
import { createUnifiedTimeBlocks } from './conflicts';
import { getDaysOfWeekFromRecurrence, DayOfWeek } from '@/app/utils/schema-converters';

/**
 * Helper to determine if a time-off period spans multiple days
 */
function isMultiDayTimeOff(start_time: string, end_time: string): boolean {
  try {
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    return startDateStr !== endDateStr;
  } catch (error) {
    return false;
  }
}

/**
 * Processes availability, exceptions, and appointments for a specific date.
 * Common code extracted from both WeeklyView and calendar-view components.
 */
export function getAvailabilityForDate(
  date: Date,
  availability: TherapistAvailability[],
  timeOffPeriods: TimeOff[],
  appointments: Appointment[] = []
): {
  dayAvailability: TherapistAvailability[];
  dayTimeOffPeriods: TimeOff[];
  dayAppointments: Appointment[];
  finalTimelineBlocks: TimeBlock[];
} {
  const dayOfWeek = date.getDay() as DayOfWeek;
  const formattedDate = format(date, 'yyyy-MM-dd');
  
  // Get specific date availability
  const nonRecurringAvailability = availability.filter(slot => {
    if (slot.recurrence) return false; // Skip recurring slots
    
    // Extract date from start_time for one-time slots
    const slotDate = new Date(slot.start_time);
    const slotDateStr = format(slotDate, 'yyyy-MM-dd');
    return slotDateStr === formattedDate;
  });
  
  // Get recurring availability if needed
  let dayAvailability = nonRecurringAvailability;
  if (nonRecurringAvailability.length === 0) {
    dayAvailability = availability.filter(slot => {
      if (!slot.recurrence) return false;
      
      // Check if this day of week is included in the recurrence pattern
      const daysOfWeek = getDaysOfWeekFromRecurrence(slot.recurrence);
      if (!daysOfWeek.includes(dayOfWeek)) return false;
      
      return shouldShowRecurringForDate(date, slot.created_at);
    });
  }
  
  // Get specific date time-off periods
  const nonRecurringTimeOff = timeOffPeriods.filter(timeOff => {
    if (timeOff.recurrence) return false;
    
    // For one-time time-off, check if this date falls within the start and end time
    const startDate = new Date(timeOff.start_time);
    const endDate = new Date(timeOff.end_time);
    
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    if (startDateStr === endDateStr) {
      // Single-day time-off
      return startDateStr === formattedDate;
    } else {
      // Multi-day time-off
      return isDateInMultiDayEvent(date, startDateStr, endDateStr);
    }
  });
  
  // Get recurring time-off periods
  const recurringTimeOff = timeOffPeriods.filter(timeOff => {
    if (!timeOff.recurrence) return false;
    
    // Check if this day of week is included in the recurrence pattern
    const daysOfWeek = getDaysOfWeekFromRecurrence(timeOff.recurrence);
    if (!daysOfWeek.includes(dayOfWeek)) return false;
    
    return shouldShowRecurringForDate(date, timeOff.created_at);
  });
  
  // Combine time-off periods
  const dayTimeOffPeriods = [...nonRecurringTimeOff, ...recurringTimeOff];
  
  // Filter appointments for this date
  const dayAppointments = appointments.filter(appointment => {
    // Check status
    const status = appointment.status as string;
    if (status !== 'confirmed' && status !== 'scheduled' && status !== 'completed') {
      return false;
    }
    
    // Check date
    if ('date_string' in appointment && appointment.date_string) {
      return appointment.date_string === formattedDate;
    }
    
    const appointmentDate = new Date(appointment.start_time);
    return format(appointmentDate, 'yyyy-MM-dd') === formattedDate;
  });
  
  // Create unified time blocks
  const finalTimelineBlocks = createUnifiedTimeBlocks(
    dayAvailability,
    dayTimeOffPeriods,
    dayAppointments,
    date
  );
  
  return {
    dayAvailability,
    dayTimeOffPeriods,
    dayAppointments,
    finalTimelineBlocks
  };
}

/**
 * Helper to determine if a time-off is all-day based on timestamps
 */
function isAllDayTimeOff(start_time: string, end_time: string): boolean {
  try {
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    
    const startHours = startDate.getHours();
    const startMinutes = startDate.getMinutes();
    const endHours = endDate.getHours();
    const endMinutes = endDate.getMinutes();
    
    // Consider it all-day if it starts at/before 00:10 and ends at/after 23:50
    return (startHours === 0 && startMinutes <= 10) && 
           (endHours === 23 && endMinutes >= 50);
  } catch (error) {
    return false;
  }
}

/**
 * Separates all-day events from regular time blocks
 */
export function separateAllDayEvents(timeBlocks: TimeBlock[]): {
  allDayEvents: TimeBlock[],
  regularTimeBlocks: TimeBlock[]
} {
  const allDayEvents = timeBlocks.filter(block => 
    block.type === 'time-off' && isAllDayTimeOff(block.start_time, block.end_time)
  );
  
  const regularTimeBlocks = timeBlocks.filter(block => 
    !(block.type === 'time-off' && isAllDayTimeOff(block.start_time, block.end_time))
  );
  
  return { allDayEvents, regularTimeBlocks };
} 