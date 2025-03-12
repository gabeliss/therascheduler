'use client';

import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { TherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { timeToMinutes } from './utils/time-utils';

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

    // If there are specific date entries, use only those
    if (specificAvailability.length > 0) {
      return {
        availability: specificAvailability,
        exceptions: specificExceptions
      };
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

    return {
      availability: recurringAvailability,
      exceptions: [...specificExceptions, ...recurringExceptions].sort((a, b) => {
        // Sort by start time
        return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
      })
    };
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

        {/* Calendar Days */}
        {calendarDays.map(({ date, isCurrentMonth }) => {
          const isToday = isSameDay(date, new Date());
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const { availability: dayAvailability, exceptions: dayExceptions } = getAvailabilityForDate(date);

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
              
              {/* Available Hours */}
              {dayAvailability.map(slot => {
                const isPastDate = isBefore(date, new Date());
                return (
                  <div
                    key={slot.id}
                    className="text-xs bg-green-100 text-green-800 p-1 rounded mb-1 flex justify-between items-center"
                  >
                    <span>
                      {format(new Date(`2000-01-01T${slot.start_time}`), 'h:mm a')} -
                      {format(new Date(`2000-01-01T${slot.end_time}`), 'h:mm a')}
                    </span>
                    {onEditAvailability && !isPastDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAvailability(slot);
                        }}
                        title="Edit availability"
                      >
                        <Edit className="h-3 w-3 text-blue-500" />
                      </Button>
                    )}
                  </div>
                );
              })}

              {/* Exceptions */}
              {dayExceptions.map(ex => {
                const isPastDate = isBefore(date, new Date());
                return (
                  <div
                    key={ex.id}
                    className="text-xs bg-red-100 text-red-800 p-1 rounded mb-1 flex justify-between items-center"
                    title={ex.reason || 'Time off'}
                  >
                    <span>
                      {format(new Date(`2000-01-01T${ex.start_time}`), 'h:mm a')} -
                      {format(new Date(`2000-01-01T${ex.end_time}`), 'h:mm a')}
                    </span>
                    {onEditException && !isPastDate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditException(ex);
                        }}
                        title="Edit time off"
                      >
                        <Edit className="h-3 w-3 text-blue-500" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
} 