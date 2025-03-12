'use client';

import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, parseISO, isWithinInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Edit, Clock, X, Check, Calendar as CalendarIcon } from 'lucide-react';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { TherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { timeToMinutes } from './utils/time-utils';

// Interface for a time block that can be either availability or time off
interface TimeBlock {
  id: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  type: 'availability' | 'time-off';
  reason?: string;
  original: TherapistAvailability | UnifiedAvailabilityException;
  original_time?: string;
  is_all_day?: boolean;
  start_date?: string; // For multi-day events
  end_date?: string;   // For multi-day events
}

export interface UnifiedCalendarViewProps {
  availability: TherapistAvailability[];
  unifiedExceptions?: UnifiedAvailabilityException[];
  exceptions?: UnifiedAvailabilityException[];
  onTimeSlotClick?: (date: Date, timeSlot?: string) => void;
  onAddException?: (date: Date) => void;
  onEditException?: (exception: UnifiedAvailabilityException) => void;
  onEditAvailability?: (availability: TherapistAvailability) => void;
}

export default function UnifiedCalendarView({ 
  availability,
  unifiedExceptions,
  exceptions,
  onTimeSlotClick,
  onAddException,
  onEditException,
  onEditAvailability
}: UnifiedCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Use either exceptions or unifiedExceptions
  const allExceptions = exceptions || unifiedExceptions || [];

  // Navigation functions
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Handle clicking on a time slot
  const handleTimeSlotClick = (date: Date, timeSlot?: string) => {
    if (onTimeSlotClick) {
      onTimeSlotClick(date, timeSlot);
    } else if (onAddException) {
      onAddException(date);
    }
  };

  // Get days in current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate the days to display in the calendar grid
  // This includes days from the previous and next months to fill the grid
  const startDay = monthStart.getDay(); // 0 for Sunday, 1 for Monday, etc.
  
  // Create an array of all days to display in the calendar
  const calendarDays = [];
  
  // Add days from previous month to fill the first row
  const prevMonthDays = startDay;
  for (let i = prevMonthDays - 1; i >= 0; i--) {
    const date = new Date(monthStart);
    date.setDate(date.getDate() - (i + 1));
    calendarDays.push({ date, isCurrentMonth: false });
  }
  
  // Add days from current month
  daysInMonth.forEach(date => {
    calendarDays.push({ date, isCurrentMonth: true });
  });
  
  // Add days from next month to fill the last row
  const totalDaysDisplayed = Math.ceil((daysInMonth.length + startDay) / 7) * 7;
  const nextMonthDays = totalDaysDisplayed - (daysInMonth.length + startDay);
  for (let i = 1; i <= nextMonthDays; i++) {
    const date = new Date(monthEnd);
    date.setDate(date.getDate() + i);
    calendarDays.push({ date, isCurrentMonth: false });
  }

  // Helper function to convert minutes to time string (HH:MM:SS)
  const minutesToTimeString = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
  };

  // Function to create a unified timeline of availability and time off blocks
  const createUnifiedTimeline = (
    availabilitySlots: TherapistAvailability[], 
    exceptionSlots: UnifiedAvailabilityException[]
  ): TimeBlock[] => {
    // Convert availability slots to TimeBlock format
    const availabilityBlocks: TimeBlock[] = availabilitySlots.map(slot => ({
      id: slot.id,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_recurring: slot.is_recurring,
      type: 'availability',
      original: slot
    }));

    // Handle overlapping time-off blocks (one-time should override recurring)
    const processedExceptionBlocks: TimeBlock[] = [];
    
    // First, sort exceptions by priority (non-recurring first, then by start time)
    const sortedExceptions = [...exceptionSlots].sort((a, b) => {
      // Non-recurring exceptions take precedence
      if (a.is_recurring !== b.is_recurring) {
        return a.is_recurring ? 1 : -1;
      }
      // If both are the same type, sort by start time
      return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
    });
    
    // Process each exception and handle overlaps
    sortedExceptions.forEach(ex => {
      const exStartMinutes = timeToMinutes(ex.start_time);
      const exEndMinutes = timeToMinutes(ex.end_time);
      
      // Check for overlaps with already processed exceptions
      const overlappingBlocks = processedExceptionBlocks.filter(block => {
        const blockStartMinutes = timeToMinutes(block.start_time);
        const blockEndMinutes = timeToMinutes(block.end_time);
        
        return (
          (exStartMinutes < blockEndMinutes && exEndMinutes > blockStartMinutes) ||
          (blockStartMinutes < exEndMinutes && blockEndMinutes > exStartMinutes)
        );
      });
      
      if (overlappingBlocks.length === 0) {
        // No overlaps, add the exception as is
        processedExceptionBlocks.push({
          id: ex.id,
          start_time: ex.start_time,
          end_time: ex.end_time,
          is_recurring: ex.is_recurring,
          type: 'time-off',
          reason: ex.reason,
          original: ex,
          is_all_day: ex.is_all_day,
          start_date: ex.start_date,
          end_date: ex.end_date
        });
        return;
      }
      
      // Handle overlaps - for recurring exceptions that overlap with one-time exceptions
      if (ex.is_recurring) {
        // If this is a recurring exception and it overlaps with a one-time exception,
        // we may need to split it or skip it entirely
        
        // Check if it's completely covered by any one-time exception
        const completelyOverlapped = overlappingBlocks.some(block => {
          const blockStartMinutes = timeToMinutes(block.start_time);
          const blockEndMinutes = timeToMinutes(block.end_time);
          return blockStartMinutes <= exStartMinutes && blockEndMinutes >= exEndMinutes;
        });
        
        if (completelyOverlapped) {
          // Skip this recurring exception as it's completely covered
          return;
        }
        
        // Split the recurring exception around one-time exceptions
        let currentStartMinutes = exStartMinutes;
        let segments: {start: number, end: number}[] = [];
        
        // Sort overlapping blocks by start time
        const sortedOverlaps = [...overlappingBlocks].sort((a, b) => 
          timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
        );
        
        // Create segments for the parts of the recurring exception that don't overlap
        sortedOverlaps.forEach(block => {
          const blockStartMinutes = timeToMinutes(block.start_time);
          const blockEndMinutes = timeToMinutes(block.end_time);
          
          // Add segment before this overlap if there's a gap
          if (currentStartMinutes < blockStartMinutes) {
            segments.push({
              start: currentStartMinutes,
              end: blockStartMinutes
            });
          }
          
          // Update current start to after this overlap
          currentStartMinutes = Math.max(currentStartMinutes, blockEndMinutes);
        });
        
        // Add final segment if needed
        if (currentStartMinutes < exEndMinutes) {
          segments.push({
            start: currentStartMinutes,
            end: exEndMinutes
          });
        }
        
        // Add each segment as a separate block
        segments.forEach((segment, index) => {
          processedExceptionBlocks.push({
            id: `${ex.id}-split-${index}`,
            start_time: minutesToTimeString(segment.start),
            end_time: minutesToTimeString(segment.end),
            is_recurring: true,
            type: 'time-off',
            reason: ex.reason,
            original: ex,
            is_all_day: ex.is_all_day,
            start_date: ex.start_date,
            end_date: ex.end_date
          });
        });
      } else {
        // For one-time exceptions, they take precedence over recurring ones
        // Just add them as is
        processedExceptionBlocks.push({
          id: ex.id,
          start_time: ex.start_time,
          end_time: ex.end_time,
          is_recurring: ex.is_recurring,
          type: 'time-off',
          reason: ex.reason,
          original: ex,
          is_all_day: ex.is_all_day,
          start_date: ex.start_date,
          end_date: ex.end_date
        });
      }
    });
    
    // Convert processed exceptions to TimeBlock format
    const exceptionBlocks = processedExceptionBlocks;

    // If there are no availability blocks, just return the exception blocks
    if (availabilityBlocks.length === 0) {
      return exceptionBlocks.sort((a, b) => 
        timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
      );
    }

    // If there are no exception blocks, just return the availability blocks
    if (exceptionBlocks.length === 0) {
      return availabilityBlocks.sort((a, b) => 
        timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
      );
    }

    // Create a unified timeline by splitting availability blocks around time off blocks
    let unifiedBlocks: TimeBlock[] = [];

    // Process each availability block
    availabilityBlocks.forEach(availBlock => {
      const availStartMinutes = timeToMinutes(availBlock.start_time);
      const availEndMinutes = timeToMinutes(availBlock.end_time);
      
      // Find all overlapping time off blocks
      const overlappingExceptions = exceptionBlocks.filter(exBlock => {
        const exStartMinutes = timeToMinutes(exBlock.start_time);
        const exEndMinutes = timeToMinutes(exBlock.end_time);
        
        return (
          (exStartMinutes >= availStartMinutes && exStartMinutes < availEndMinutes) ||
          (exEndMinutes > availStartMinutes && exEndMinutes <= availEndMinutes) ||
          (exStartMinutes <= availStartMinutes && exEndMinutes >= availEndMinutes)
        );
      }).sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
      
      // If no overlapping exceptions, add the availability block as is
      if (overlappingExceptions.length === 0) {
        unifiedBlocks.push(availBlock);
        return;
      }
      
      // Split the availability block around the time off blocks
      let currentStartMinutes = availStartMinutes;
      
      overlappingExceptions.forEach(exBlock => {
        const exStartMinutes = timeToMinutes(exBlock.start_time);
        const exEndMinutes = timeToMinutes(exBlock.end_time);
        
        // Add availability block before the time off if there's a gap
        if (currentStartMinutes < exStartMinutes) {
          unifiedBlocks.push({
            ...availBlock,
            id: `${availBlock.id}-split-${currentStartMinutes}-${exStartMinutes}`,
            start_time: minutesToTimeString(currentStartMinutes),
            end_time: minutesToTimeString(exStartMinutes),
            original_time: `${availBlock.start_time} - ${availBlock.end_time}`,
            is_all_day: availBlock.is_all_day
          });
        }
        
        // Add the time off block
        unifiedBlocks.push(exBlock);
        
        // Update the current start time to after this time off block
        currentStartMinutes = Math.max(currentStartMinutes, exEndMinutes);
      });
      
      // Add the final availability block after all time off blocks if needed
      if (currentStartMinutes < availEndMinutes) {
        unifiedBlocks.push({
          ...availBlock,
          id: `${availBlock.id}-split-${currentStartMinutes}-${availEndMinutes}`,
          start_time: minutesToTimeString(currentStartMinutes),
          end_time: minutesToTimeString(availEndMinutes),
          original_time: `${availBlock.start_time} - ${availBlock.end_time}`,
          is_all_day: availBlock.is_all_day
        });
      }
    });
    
    // Sort the unified blocks by start time
    return unifiedBlocks.sort((a, b) => 
      timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    );
  };

  // Get all multi-day events that span the entire month
  const getMultiDayEvents = () => {
    return allExceptions
      .filter(ex => ex.is_all_day && ex.start_date && ex.end_date)
      .map(ex => ({
        id: ex.id,
        start_date: ex.start_date,
        end_date: ex.end_date,
        reason: ex.reason,
        is_all_day: true,
        type: 'time-off' as const,
        original: ex,
        start_time: '00:00',
        end_time: '23:59',
        is_recurring: false
      }));
  };

  // Get availability and exceptions for a specific date
  const getAvailabilityForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    const formattedDate = format(date, 'yyyy-MM-dd');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastDate = date < today;

    // Get specific date availability
    const specificAvailability = availability.filter(
      slot => !slot.is_recurring && slot.specific_date === formattedDate
    );

    // Get specific date exceptions
    const specificExceptions = allExceptions.filter(
      ex => !ex.is_recurring && ex.start_date === formattedDate
    );

    // Get multi-day events that include this date
    const multiDayEvents = allExceptions.filter(ex => {
      if (!ex.is_all_day || !ex.start_date || !ex.end_date) return false;
      
      try {
        const currentDate = new Date(formattedDate);
        const startDate = parseISO(ex.start_date);
        const endDate = parseISO(ex.end_date);
        
        return isWithinInterval(currentDate, { start: startDate, end: endDate });
      } catch (error) {
        console.error('Error parsing dates:', error);
        return false;
      }
    });

    // If there are specific date entries, use only those
    if (specificAvailability.length > 0) {
      // Create unified timeline with specific date entries and include multi-day events
      const allExceptionsForDate = [...specificExceptions, ...multiDayEvents];
      return createUnifiedTimeline(specificAvailability, allExceptionsForDate);
    }

    // Otherwise, get recurring availability for this day
    // Only show recurring availability for dates after it was created
    const recurringAvailability = availability.filter(slot => {
      if (!slot.is_recurring || slot.day_of_week !== dayOfWeek) return false;
      
      // If this is a past date, check if the availability was created before this date
      if (isPastDate) {
        const createdAt = new Date(slot.created_at);
        const dateToCheck = new Date(date);
        // Only show recurring availability if it was created before this date
        return createdAt < dateToCheck;
      }
      
      // For current and future dates, show all recurring availability
      return true;
    });

    // Get recurring exceptions for this day
    // Only show recurring exceptions for dates after they were created
    const recurringExceptions = allExceptions.filter(ex => {
      if (!ex.is_recurring || ex.day_of_week !== dayOfWeek) return false;
      
      // If this is a past date, check if the exception was created before this date
      if (isPastDate) {
        const createdAt = new Date(ex.created_at);
        const dateToCheck = new Date(date);
        // Only show recurring exceptions if they were created before this date
        return createdAt < dateToCheck;
      }
      
      // For current and future dates, show all recurring exceptions
      return true;
    }) || [];

    // Create unified timeline with recurring entries and include multi-day events
    return createUnifiedTimeline(
      recurringAvailability, 
      [...specificExceptions, ...recurringExceptions, ...multiDayEvents]
    );
  };

  // Get multi-day events for the current month
  const multiDayEvents = getMultiDayEvents();

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-100 p-2 text-center font-medium">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map(({ date, isCurrentMonth }) => {
          const isToday = isSameDay(date, new Date());
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const timeBlocks = getAvailabilityForDate(date);
          
          // Separate all-day events
          const allDayEvents = timeBlocks.filter(block => 
            block.type === 'time-off' && block.is_all_day
          );
          
          // Regular time blocks (not all-day)
          const regularTimeBlocks = timeBlocks.filter(block => 
            !(block.type === 'time-off' && block.is_all_day)
          );

          return (
            <div
              key={date.toISOString()}
              className={`
                bg-white p-2 min-h-[100px] cursor-pointer
                ${isToday ? 'bg-blue-50' : ''}
                ${isSelected ? 'ring-2 ring-blue-500' : ''}
                ${!isCurrentMonth ? 'opacity-40' : ''}
              `}
              onClick={() => setSelectedDate(date)}
            >
              <div className="font-medium mb-1">{format(date, 'd')}</div>
              
              {/* All-day events at the top */}
              {allDayEvents.map(event => {
                // Format date range for multi-day events
                let dateRangeText = '';
                if (event.start_date && event.end_date) {
                  const startDate = parseISO(event.start_date);
                  const endDate = parseISO(event.end_date);
                  if (!isSameDay(startDate, endDate)) {
                    dateRangeText = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`;
                  }
                }
                
                return (
                  <div
                    key={`all-day-${event.id}`}
                    className="text-xs bg-blue-100 text-blue-800 p-1.5 rounded-md mb-1.5 flex justify-between items-center border border-blue-300 shadow-sm group hover:bg-blue-200 transition-colors"
                    title={event.reason || 'All day event'}
                  >
                    <div className="flex items-center gap-1 overflow-hidden">
                      <CalendarIcon className="h-3 w-3 text-blue-600 flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-medium truncate">
                          {event.reason || 'All Day'}
                        </span>
                        {dateRangeText && (
                          <span className="text-blue-600 text-[10px]">{dateRangeText}</span>
                        )}
                        <span className="text-blue-600 text-[10px]">All Day</span>
                      </div>
                    </div>
                    {onEditException && !isBefore(date, new Date()) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditException(event.original as UnifiedAvailabilityException);
                        }}
                        title="Edit event"
                      >
                        <Edit className="h-3 w-3 text-blue-700" />
                      </Button>
                    )}
                  </div>
                );
              })}
              
              {/* Regular time blocks */}
              {regularTimeBlocks.map(block => {
                const isPastDate = isBefore(date, new Date());
                
                if (block.type === 'availability') {
                  return (
                    <div
                      key={block.id}
                      className="text-xs bg-green-100 text-green-800 p-1.5 rounded-md mb-1.5 flex justify-between items-center border border-green-300 shadow-sm group hover:bg-green-200 transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span className="font-medium">
                          {format(new Date(`2000-01-01T${block.start_time}`), 'h:mm a')} -
                          {format(new Date(`2000-01-01T${block.end_time}`), 'h:mm a')}
                        </span>
                      </div>
                      {onEditAvailability && !isPastDate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAvailability(block.original as TherapistAvailability);
                          }}
                          title="Edit availability"
                        >
                          <Edit className="h-3 w-3 text-green-700" />
                        </Button>
                      )}
                    </div>
                  );
                } else {
                  // Time-off block
                  return (
                    <div
                      key={block.id}
                      className="text-xs bg-red-100 text-red-800 p-1.5 rounded-md mb-1.5 flex justify-between items-center border border-red-300 shadow-sm group hover:bg-red-200 transition-colors"
                      title={block.reason || 'Time off'}
                    >
                      <div className="flex items-center gap-1">
                        <X className="h-3 w-3 text-red-600 flex-shrink-0" />
                        <span className="font-medium">
                          {format(new Date(`2000-01-01T${block.start_time}`), 'h:mm a')} -
                          {format(new Date(`2000-01-01T${block.end_time}`), 'h:mm a')}
                          {block.reason && (
                            <span className="ml-1 text-red-700">({block.reason})</span>
                          )}
                        </span>
                      </div>
                      {onEditException && !isPastDate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditException(block.original as UnifiedAvailabilityException);
                          }}
                          title="Edit time off"
                        >
                          <Edit className="h-3 w-3 text-red-700" />
                        </Button>
                      )}
                    </div>
                  );
                }
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
} 