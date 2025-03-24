'use client';

import React, { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Edit, Clock, X, Check, Calendar as CalendarIcon, Users, Loader2 } from 'lucide-react';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { TherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { Appointment } from '@/app/types';
import { useAppointments } from '@/app/hooks/use-appointments';

// Import from the new modular structure
import { useCalendarNavigation } from './utils/hooks/useCalendarNavigation';
import { CalendarNavigationControls } from './utils/components/CalendarNavigationControls';
import { TimeBlockRenderer } from './utils/components/TimeBlockRenderer';
import { getAvailabilityForDate, separateAllDayEvents } from './utils/time/availability';
import type { TimeBlock } from './utils/time/types';

export interface UnifiedCalendarViewProps {
  availability: TherapistAvailability[];
  unifiedExceptions?: UnifiedAvailabilityException[];
  exceptions?: UnifiedAvailabilityException[];
  appointments?: Appointment[];
  onTimeSlotClick?: (date: Date, timeSlot?: string) => void;
  onAddException?: (date: Date) => void;
  onEditException?: (exception: UnifiedAvailabilityException) => void;
  onEditAvailability?: (availability: TherapistAvailability) => void;
  onDeleteException?: (id: string) => void;
  onDeleteAvailability?: (id: string) => void;
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
  onDeleteException,
  onDeleteAvailability,
  showAppointments = true,
  loading = false
}: UnifiedCalendarViewProps) {
  // Use the shared calendar navigation hook
  const { 
    currentDate, 
    setCurrentDate, 
    goToPreviousPeriod: goToPreviousMonth, 
    goToNextPeriod: goToNextMonth 
  } = useCalendarNavigation({ periodType: 'month' });
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { appointments: hookAppointments, loading: appointmentsLoading } = useAppointments();

  // Use either exceptions or unifiedExceptions
  const allExceptions = exceptions || unifiedExceptions || [];
  
  // Use either provided appointments or appointments from the hook
  const appointments = propAppointments || (showAppointments ? hookAppointments : []);

  // Determine if we're in a loading state
  const isLoading = loading || appointmentsLoading;

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

  // Format month and year for the header
  const currentMonthLabel = format(currentDate, 'MMMM yyyy');

  return (
    <div className="space-y-4">
      {/* Use the shared calendar navigation component */}
      <CalendarNavigationControls
        periodLabel={currentMonthLabel}
        onPreviousPeriod={goToPreviousMonth}
        onNextPeriod={goToNextMonth}
        onCurrentPeriod={() => setCurrentDate(new Date())}
      />

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
            
            // Use the shared utility function to get availability data for this date
            const { finalTimelineBlocks: timeBlocks } = getAvailabilityForDate(
              date,
              availability,
              allExceptions,
              appointments as any // Use type assertion to fix type mismatch
            );
            
            // Separate all-day events and regular time blocks
            const { allDayEvents, regularTimeBlocks } = separateAllDayEvents(timeBlocks);
            
            // Check if this date is in the past
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isPastDate = date < today;

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
                
                {/* Render all-day events using the shared time block renderer */}
                {allDayEvents.map(event => (
                  <TimeBlockRenderer
                    key={`all-day-${event.id}`}
                    block={event}
                    onEditException={onEditException}
                    onDeleteException={onDeleteException}
                    isPastDate={isPastDate}
                    compact={true}
                  />
                ))}
                
                {/* Render regular time blocks using the shared time block renderer */}
                {regularTimeBlocks.map(block => (
                  <TimeBlockRenderer
                    key={block.id}
                    block={block}
                    onEditException={onEditException}
                    onEditAvailability={onEditAvailability}
                    onDeleteException={onDeleteException}
                    onDeleteAvailability={onDeleteAvailability}
                    isPastDate={isPastDate}
                    compact={true}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
} 