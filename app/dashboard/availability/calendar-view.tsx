'use client';

import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, parseISO, isWithinInterval } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Edit, Clock, X, Check, Calendar as CalendarIcon, Users, Loader2 } from 'lucide-react';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { TherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { timeToMinutes, shouldShowRecurringForDate, createUnifiedTimeBlocks, isDateInMultiDayEvent } from './utils/time-utils';
import { Appointment } from '@/app/types';
import { useAppointments } from '@/app/hooks/use-appointments';

// Interface for a time block that can be either availability or time off
interface TimeBlock {
  id: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  type: 'availability' | 'time-off' | 'appointment';
  reason?: string;
  original: TherapistAvailability | UnifiedAvailabilityException | Appointment;
  original_time?: string;
  is_all_day?: boolean;
  start_date?: string; // For multi-day events
  end_date?: string;   // For multi-day events
  client_name?: string; // For appointments
  status?: string; // For appointments
  overrides_time_off?: boolean; // For appointments that override time off
}

export interface UnifiedCalendarViewProps {
  availability: TherapistAvailability[];
  unifiedExceptions?: UnifiedAvailabilityException[];
  exceptions?: UnifiedAvailabilityException[];
  appointments?: Appointment[];
  onTimeSlotClick?: (date: Date, timeSlot?: string) => void;
  onAddException?: (date: Date) => void;
  onEditException?: (exception: UnifiedAvailabilityException) => void;
  onEditAvailability?: (availability: TherapistAvailability) => void;
  showAppointments?: boolean;
  loading?: boolean;
}

export default function UnifiedCalendarView({ 
  availability,
  unifiedExceptions,
  exceptions,
  appointments: propAppointments,
  onTimeSlotClick,
  onAddException,
  onEditException,
  onEditAvailability,
  showAppointments = true,
  loading = false
}: UnifiedCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { appointments: hookAppointments, loading: appointmentsLoading } = useAppointments();

  // Use either exceptions or unifiedExceptions
  const allExceptions = exceptions || unifiedExceptions || [];
  
  // Use either provided appointments or appointments from the hook
  const appointments = propAppointments || (showAppointments ? hookAppointments : []);

  // Determine if we're in a loading state
  const isLoading = loading || appointmentsLoading;

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

  // Get all multi-day events that span the entire month
  const getMultiDayEvents = () => {
    // Filter all-day exceptions
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
    const dateString = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Check if this date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastDate = date < today;
    
    // Get recurring availability for this day of week
    // Only show recurring availability for dates on or after it was created
    const recurringAvailability = availability.filter(slot => {
      if (!slot.is_recurring || slot.day_of_week !== dayOfWeek) return false;
      
      // Use the utility function to determine if we should show this recurring availability
      return shouldShowRecurringForDate(date, slot.created_at);
    });
    
    // Get specific date availability for this date
    const specificAvailability = availability.filter(slot => 
      !slot.is_recurring && slot.specific_date === dateString
    );
    
    // Get recurring exceptions for this day of week
    // Only show recurring exceptions for dates on or after they were created
    const recurringExceptions = allExceptions.filter(exception => {
      if (!exception.is_recurring || exception.day_of_week !== dayOfWeek) return false;
      
      // Use the utility function to determine if we should show this recurring exception
      return shouldShowRecurringForDate(date, exception.created_at);
    });
    
    // Get specific date exceptions for this date
    // Use the utility function to check if this date falls within any multi-day event's range
    const specificExceptions = allExceptions.filter(exception => {
      if (exception.is_recurring) return false;
      
      // For all-day multi-day events, check if this date is within the range
      if (exception.is_all_day && exception.start_date && exception.end_date) {
        return isDateInMultiDayEvent(date, exception.start_date, exception.end_date);
      }
      
      // For regular exceptions, check if it's for this specific date
      // Use type assertion to handle the case where specific_date might not exist
      return (exception as any).specific_date === dateString;
    });
    
    // Get appointments for this date
    const dateAppointments = appointments.filter(appointment => {
      // First filter by status - only show confirmed/scheduled or completed appointments
      const status = appointment.status as string;
      if (status !== 'confirmed' && status !== 'scheduled' && status !== 'completed') {
        return false;
      }
      
      // Then filter by date
      // Use the date_string property if available, otherwise calculate it
      if ('date_string' in appointment && appointment.date_string) {
        return appointment.date_string === dateString;
      }
      
      // Fallback to calculating from start_time
      const appointmentDate = new Date(appointment.start_time);
      return format(appointmentDate, 'yyyy-MM-dd') === dateString;
    });
    
    // Log the number of appointments found for this date
    if (dateAppointments.length > 0) {
      console.log(`Found ${dateAppointments.length} appointments for ${dateString}`);
    }
    
    // Use the unified utility function to create and resolve all time blocks
    return createUnifiedTimeBlocks(
      [...recurringAvailability, ...specificAvailability],
      [...recurringExceptions, ...specificExceptions],
      dateAppointments,
      date
    );
  };

  // Get multi-day events for the current month
  const multiDayEvents = getMultiDayEvents();

  // Render a time block
  const renderTimeBlock = (block: TimeBlock) => {
    const startMinutes = timeToMinutes(block.start_time);
    const endMinutes = timeToMinutes(block.end_time);
    const duration = endMinutes - startMinutes;
    const height = `${duration / 15}rem`; // 1rem = 15 minutes
    const top = `${startMinutes / 15}rem`;
    
    let blockClass = '';
    let blockTitle = '';
    
    if (block.type === 'availability') {
      blockClass = 'bg-green-100 border-green-300 text-green-800';
      blockTitle = block.is_recurring ? 'Recurring Availability' : 'Specific Date Availability';
    } else if (block.type === 'time-off') {
      blockClass = 'bg-red-100 border-red-300 text-red-800';
      blockTitle = block.reason || (block.is_recurring ? 'Recurring Time Off' : 'Time Off');
    } else if (block.type === 'appointment') {
      // Always use blue for appointments in the calendar view
      blockClass = 'bg-blue-100 border-blue-300 text-blue-800';
      blockTitle = `Appointment${block.client_name ? ` with ${block.client_name}` : ''}`;
    }
    
    return (
      <div
        key={block.id}
        className={`absolute left-0 right-0 px-2 py-1 border rounded-md text-xs overflow-hidden ${blockClass}`}
        style={{ top, height, minHeight: '1.5rem' }}
        title={blockTitle}
      >
        <div className="flex justify-between items-center">
          <span className="font-medium truncate">
            {block.start_time.substring(0, 5)} - {block.end_time.substring(0, 5)}
          </span>
          {block.type === 'appointment' && (
            <Users className="h-3 w-3 ml-1" />
          )}
        </div>
        {block.type === 'time-off' && block.reason && (
          <div className="truncate text-xs opacity-80">{block.reason}</div>
        )}
        {block.client_name && block.type === 'appointment' && (
          <div className="truncate text-xs opacity-80">Appointment with {block.client_name}</div>
        )}
      </div>
    );
  };

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

        {isLoading ? (
          // Loading state - show a loading spinner in the center of the grid
          <div className="col-span-7 bg-white p-12 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
            <p className="text-sm text-gray-500">Loading schedule...</p>
          </div>
        ) : (
          // Calendar Days
          calendarDays.map(({ date, isCurrentMonth }, index) => {
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
                  bg-white p-2 min-h-[100px] cursor-pointer border-t border-gray-300
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
                  
                  // Determine if this is the first day, last day, or middle day of a multi-day event
                  let dayPosition = '';
                  if (event.start_date && event.end_date) {
                    const currentDateStr = format(date, 'yyyy-MM-dd');
                    if (currentDateStr === event.start_date && currentDateStr === event.end_date) {
                      dayPosition = 'single-day';
                    } else if (currentDateStr === event.start_date) {
                      dayPosition = 'first-day';
                    } else if (currentDateStr === event.end_date) {
                      dayPosition = 'last-day';
                    } else if (currentDateStr > event.start_date && currentDateStr < event.end_date) {
                      dayPosition = 'middle-day';
                    }
                  }
                  
                  return (
                    <div
                      key={`all-day-${event.id}`}
                      className="text-xs bg-red-100 text-red-800 p-1.5 rounded-md mb-1.5 flex justify-between items-center border border-red-300 shadow-sm group hover:bg-red-200 transition-colors"
                      title={event.reason || 'All day event'}
                    >
                      <div className="flex items-center gap-1 overflow-hidden">
                        <CalendarIcon className="h-3 w-3 text-red-600 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="font-medium truncate">
                            {event.reason || 'All Day'}
                          </span>
                          {dateRangeText && (
                            <span className="text-red-600 text-[10px]">{dateRangeText}</span>
                          )}
                          <span className="text-red-600 text-[10px]">All Day</span>
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
                          <Edit className="h-3 w-3 text-red-700" />
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
                  } else if (block.type === 'appointment') {
                    // Appointment block
                    return (
                      <div
                        key={block.id}
                        className="text-xs bg-blue-100 text-blue-800 p-1.5 rounded-md mb-1.5 flex justify-between items-center border border-blue-300 shadow-sm group hover:bg-blue-200 transition-colors"
                        title={block.client_name ? `Appointment with ${block.client_name}` : 'Appointment'}
                      >
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-blue-600 flex-shrink-0" />
                          <span className="font-medium">
                            {format(new Date(`2000-01-01T${block.start_time}`), 'h:mm a')} -
                            {format(new Date(`2000-01-01T${block.end_time}`), 'h:mm a')}
                            {block.client_name && (
                              <span className="ml-1 text-blue-700">
                                (with {block.client_name})
                              </span>
                            )}
                          </span>
                        </div>
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
          })
        )}
      </div>
    </div>
  );
} 