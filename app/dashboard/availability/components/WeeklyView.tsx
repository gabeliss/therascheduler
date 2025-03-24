'use client';

import { useState } from 'react';
import { format, addDays, startOfWeek, isAfter, isSameDay, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Trash2, Edit, Repeat, Clock, Calendar, Info, Users, Loader2 } from 'lucide-react';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { TherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Appointment } from '@/app/types';
import { useAppointments } from '@/app/hooks/use-appointments';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Import from the new modular structure
import { formatTime } from '../utils/time/format';
import { timeToMinutes } from '../utils/time/calculations';
import { shouldShowRecurringForDate, isDateInMultiDayEvent } from '../utils/time/dates';
import { createUnifiedTimeBlocks } from '../utils/time/conflicts';
import { useCalendarNavigation } from '../utils/hooks/useCalendarNavigation';
import { CalendarNavigationControls } from '../utils/components/CalendarNavigationControls';
import { TimeBlockRenderer } from '../utils/components/TimeBlockRenderer';
import { getAvailabilityForDate, separateAllDayEvents } from '../utils/time/availability';
import type { TimeBlock } from '../utils/time/types';

export interface WeeklyViewProps {
  availability: TherapistAvailability[];
  exceptions: UnifiedAvailabilityException[];
  appointments?: Appointment[];
  onAddException: (date: Date) => void;
  onDeleteException: (id: string) => void;
  onDeleteAvailability: (id: string) => void;
  formatDate: (date: string) => string;
  onEditException: (exception: UnifiedAvailabilityException) => void;
  onEditAvailability: (availability: TherapistAvailability) => void;
  showAppointments?: boolean;
  loading?: boolean;
}

export default function WeeklyView({
  availability,
  exceptions,
  appointments: propAppointments,
  onAddException,
  onDeleteException,
  onDeleteAvailability,
  formatDate,
  onEditException,
  onEditAvailability,
  showAppointments = true,
  loading = false
}: WeeklyViewProps) {
  // Use the shared calendar navigation hook
  const { 
    currentDate, 
    setCurrentDate, 
    goToPreviousPeriod: goToPreviousWeek, 
    goToNextPeriod: goToNextWeek, 
    goToCurrentPeriod: goToCurrentWeek 
  } = useCalendarNavigation({ periodType: 'week' });
  
  const { appointments: hookAppointments, loading: appointmentsLoading } = useAppointments();
  
  // Determine if we're in a loading state
  const isLoading = loading || appointmentsLoading;
  
  // Get the start of the week (Sunday)
  const weekStart = startOfWeek(currentDate);
  
  // Generate the days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Use either provided appointments or appointments from the hook
  const appointments = propAppointments || hookAppointments;

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Get the date range for the title
  const weekStartFormatted = format(weekStart, "MMMM do");
  const weekEndFormatted = format(addDays(weekStart, 6), "MMMM do, yyyy");
  const weekRangeTitle = `Weekly Schedule: ${weekStartFormatted} - ${weekEndFormatted}`;

  return (
    <div className="space-y-6">
      {/* Use the shared calendar navigation component */}
      <CalendarNavigationControls
        periodLabel={weekRangeTitle}
        onPreviousPeriod={goToPreviousWeek}
        onNextPeriod={goToNextWeek}
        onCurrentPeriod={goToCurrentWeek}
        className="mb-4"
      />
      
      {DAYS.map((day, index) => {
        const currentDay = weekDays[index];
        const formattedDay = format(currentDay, "EEEE, MMMM do");
        
        // Check if this date is in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPastDate = currentDay < today;
        
        // Use the shared utility function to get availability data for this date
        const { finalTimelineBlocks } = getAvailabilityForDate(
          currentDay,
          availability,
          exceptions,
          appointments as any // Use type assertion to fix type mismatch
        );
        
        // Separate all-day events and regular time blocks
        const { allDayEvents, regularTimeBlocks } = separateAllDayEvents(finalTimelineBlocks);
        
        // Sort time blocks by start time
        const sortedTimeBlocks = regularTimeBlocks.sort(
          (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
        );

        return (
          <div key={day} className="border rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">{formattedDay}</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => onAddException(currentDay)}
                      disabled={isPastDate}
                      className="text-xs"
                    >
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      Block Time
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isPastDate ? "Cannot block time in the past" : `Block time off for ${format(currentDay, 'MMMM do')}`}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {[...allDayEvents, ...sortedTimeBlocks].length > 0 ? (
              <div className="space-y-1">
                {allDayEvents.map((block) => (
                  <TimeBlockRenderer
                    key={block.id}
                    block={block}
                    onEditException={onEditException}
                    onDeleteException={onDeleteException}
                    isPastDate={isPastDate}
                    enableTooltips={true}
                  />
                ))}
                
                {allDayEvents.length > 0 && sortedTimeBlocks.length > 0 && (
                  <div className="h-px bg-gray-300 my-2" />
                )}
                
                {sortedTimeBlocks.map((block) => (
                  <TimeBlockRenderer
                    key={block.id}
                    block={block}
                    onEditException={onEditException}
                    onEditAvailability={onEditAvailability}
                    onDeleteException={onDeleteException}
                    onDeleteAvailability={onDeleteAvailability}
                    isPastDate={isPastDate}
                    enableTooltips={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">No scheduled events for this day</div>
            )}
          </div>
        );
      })}
    </div>
  );
} 