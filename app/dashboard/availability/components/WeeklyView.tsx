'use client';

import { useState } from 'react';
import { format, addDays, startOfWeek, isAfter, isSameDay, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Trash2, Edit, Repeat, Clock, Calendar, Info, Users, Loader2 } from 'lucide-react';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { formatTime, timeToMinutes, shouldShowRecurringForDate, createUnifiedTimeBlocks, isDateInMultiDayEvent } from '../utils/time-utils';
import { TherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Appointment } from '@/app/types';
import { useAppointments } from '@/app/hooks/use-appointments';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TimeBlock } from '../utils/time-utils';

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const { appointments: hookAppointments, loading: appointmentsLoading } = useAppointments();
  
  // Determine if we're in a loading state
  const isLoading = loading || appointmentsLoading;
  
  // Get the start of the week (Sunday)
  const weekStart = startOfWeek(currentDate);
  
  // Generate the days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Navigate to previous week
  const goToPreviousWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };
  
  // Navigate to next week
  const goToNextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };
  
  // Navigate to current week
  const goToCurrentWeek = () => {
    setCurrentDate(new Date());
  };
  
  // Get exceptions for a specific date
  const getExceptionsForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    // Check if this date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastDate = date < today;
    
    // Get specific date exceptions (including multi-day exceptions)
    const specificDateExceptions = exceptions.filter(ex => {
      if (ex.is_recurring) return false;
      
      // Use the utility function to check if this date falls within the date range
      return isDateInMultiDayEvent(date, ex.start_date, ex.end_date);
    });
    
    // Get recurring exceptions
    // Only show recurring exceptions for dates on or after they were created
    const recurringExceptions = exceptions.filter(ex => {
      if (!ex.is_recurring || ex.day_of_week !== dayOfWeek) return false;
      
      // Use the utility function to determine if we should show this recurring exception
      return shouldShowRecurringForDate(date, ex.created_at);
    });
    
    // Combine both types of exceptions and sort by start time
    return [...specificDateExceptions, ...recurringExceptions].sort((a, b) => {
      // Sort by start time
      return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
    });
  };

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Get the date range for the title
  const weekStartFormatted = format(weekStart, "MMMM do");
  const weekEndFormatted = format(addDays(weekStart, 6), "MMMM do, yyyy");
  const weekRangeTitle = `Weekly Schedule: ${weekStartFormatted} - ${weekEndFormatted}`;
  
  // Use either provided appointments or appointments from the hook
  const appointments = propAppointments || hookAppointments;

  // Get recurring availability for a specific day
  const getRecurringAvailabilityForDay = (dayIndex: number) => {
    return availability.filter(slot => slot.is_recurring && slot.day_of_week === dayIndex);
  };

  // Get recurring exceptions for a specific day
  const getRecurringExceptionsForDay = (dayIndex: number) => {
    return exceptions.filter(ex => ex.is_recurring && ex.day_of_week === dayIndex);
  };
  
  // Get appointments for a specific day of the week
  const getAppointmentsForDay = (dayIndex: number) => {
    if (!appointments.length) return [];
    
    // Get the date for this day in the current week
    const currentDayDate = weekDays[dayIndex];
    const formattedDate = format(currentDayDate, 'yyyy-MM-dd');
    
    return appointments.filter(appointment => {
      // First filter by status - only show confirmed/scheduled or completed appointments
      const status = appointment.status as string;
      if (status !== 'confirmed' && status !== 'scheduled' && status !== 'completed') {
        return false;
      }
      
      // Then filter by date
      // Use the date_string property if available
      if ('date_string' in appointment && appointment.date_string) {
        return appointment.date_string === formattedDate;
      }
      
      // Fallback to calculating from start_time
      const appointmentDate = new Date(appointment.start_time);
      const appointmentDateString = format(appointmentDate, 'yyyy-MM-dd');
      return appointmentDateString === formattedDate;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{weekRangeTitle}</h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {DAYS.map((day, index) => {
        const currentDay = weekDays[index];
        const formattedDay = format(currentDay, "EEEE, MMMM do");
        
        // Check if this day is in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPastDate = currentDay < today;
        
        // Format the date for checking specific date entries
        const formattedDate = format(currentDay, 'yyyy-MM-dd');
        
        // Check for specific date availability first
        const specificDateAvailability = availability.filter(
          slot => !slot.is_recurring && 
                 slot.specific_date === formattedDate
        );
        
        // Check for specific date exceptions
        const specificDateExceptions = exceptions.filter(ex => {
          if (ex.is_recurring) return false;
          
          // For all-day multi-day events, check if this date is within the range
          if (ex.is_all_day && ex.start_date && ex.end_date) {
            return isDateInMultiDayEvent(currentDay, ex.start_date, ex.end_date);
          }
          
          // For regular exceptions, check if it's for this specific date
          // Use type assertion to handle the case where specific_date might not exist
          return (ex as any).specific_date === formattedDate;
        });
        
        // If there are specific date availability entries, use only those
        // Otherwise, use recurring availability
        let dayAvailability = specificDateAvailability;
        
        if (specificDateAvailability.length === 0) {
          // Show recurring availability
          // Only show recurring availability for dates on or after it was created
          dayAvailability = availability.filter(slot => {
            if (!slot.is_recurring || slot.day_of_week !== index) return false;
            
            // Use the utility function to determine if we should show this recurring availability
            return shouldShowRecurringForDate(currentDay, slot.created_at);
          });
        }
        
        // For exceptions, we'll show both specific date and recurring exceptions
        // Get recurring exceptions
        const recurringExceptions = exceptions.filter(ex => {
          if (!ex.is_recurring || ex.day_of_week !== index) return false;
          
          // Use the utility function to determine if we should show this recurring exception
          return shouldShowRecurringForDate(currentDay, ex.created_at);
        });
        
        // Combine specific date exceptions with recurring exceptions
        const dayExceptions = [...specificDateExceptions, ...recurringExceptions];
        
        // Get appointments for this day
        const dayAppointments = getAppointmentsForDay(index);
        
        // Create a unified timeline with all blocks and conflicts resolved
        const finalTimelineBlocks = createUnifiedTimeBlocks(
          dayAvailability, 
          dayExceptions, 
          dayAppointments,
          currentDay
        );

        // Make sure all-day events are at the top
        const allDayEvents = finalTimelineBlocks.filter(block => 
          block.type === 'time-off' && block.is_all_day
        );
        const regularTimeBlocks = finalTimelineBlocks.filter(block => 
          !(block.type === 'time-off' && block.is_all_day)
        );

        // Sort the blocks by type and time
        const sortedTimeBlocks = [
          ...allDayEvents,
          ...regularTimeBlocks.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
        ];

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
            
            {sortedTimeBlocks.length > 0 ? (
              <div className="space-y-1">
                {sortedTimeBlocks.map((block, blockIndex) => {
                  // Check if this block is a different type than the previous one
                  const prevBlock = blockIndex > 0 ? sortedTimeBlocks[blockIndex - 1] : null;
                  const showDivider = prevBlock && prevBlock.type !== block.type;
                  
                  return (
                    <div key={block.id}>
                      {showDivider && (
                        <div className="h-px bg-gray-300 my-2" />
                      )}
                      <div 
                        className={cn(
                          "flex items-center justify-between py-2 px-3 rounded-md border-l-4",
                          block.type === 'availability' 
                            ? "bg-green-50 border-green-300" 
                            : block.type === 'time-off'
                              ? "bg-red-50 border-red-300"
                              : "bg-blue-50 border-blue-300"
                        )}
                      >
                        <div>
                          <div className="flex items-center">
                            <span className={cn(
                              "font-medium flex items-center",
                              block.type === 'availability' ? "text-green-700" : 
                              block.type === 'time-off' ? "text-red-700" : "text-blue-700"
                            )}>
                              {block.type === 'availability' ? (
                                <Calendar className="h-4 w-4 mr-1 inline" />
                              ) : block.type === 'time-off' ? (
                                <Clock className="h-4 w-4 mr-1 inline" />
                              ) : (
                                <Users className="h-4 w-4 mr-1 inline" />
                              )}
                              {block.type === 'time-off' && block.is_all_day ? (
                                <span className="font-medium">
                                  All Day
                                  {block.start_date && block.end_date && block.start_date !== block.end_date && (
                                    <span className="ml-1 text-xs text-red-600">
                                      ({format(parseISO(block.start_date), 'MMM d')} - {format(parseISO(block.end_date), 'MMM d')})
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <>
                                  {format(new Date(`2000-01-01T${block.start_time}`), 'h:mm a')} - 
                                  {format(new Date(`2000-01-01T${block.end_time}`), 'h:mm a')}
                                </>
                              )}
                              
                              {block.is_recurring && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Repeat className="h-3 w-3 ml-1.5 text-gray-400 inline cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                      <p>Recurring weekly</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center mt-0.5">
                            {block.type === 'time-off' && block.reason && (
                              <span className="text-gray-600 text-xs">{block.reason}</span>
                            )}
                            {block.type === 'availability' && (
                              <span className="text-green-600 text-xs">Available</span>
                            )}
                            {block.type === 'appointment' && block.client_name && (
                              <span className="text-blue-600 text-xs">Appointment with {block.client_name}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          {/* Availability actions */}
                          {block.type === 'availability' && onEditAvailability && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (!block.id.includes('-split-')) {
                                        onEditAvailability(block.original as TherapistAvailability);
                                      } else {
                                        // For split blocks, find the original block in the availability array
                                        const originalId = block.id.split('-split-')[0];
                                        const originalBlock = availability.find(a => a.id === originalId);
                                        if (originalBlock) {
                                          onEditAvailability(originalBlock);
                                        }
                                      }
                                    }}
                                    disabled={isPastDate}
                                    className="hover:bg-green-100 h-8 w-8 p-0"
                                  >
                                    {block.id.includes('-split-') ? (
                                      <Info className="h-4 w-4 text-blue-500" />
                                    ) : (
                                      <Edit className="h-4 w-4 text-green-600" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  {block.id.includes('-split-') ? (
                                    <p>
                                      This is part of a larger availability block 
                                      ({block.original_time ? 
                                        `${format(new Date(`2000-01-01T${block.original_time.split(' - ')[0]}`), 'h:mm a')} - ${format(new Date(`2000-01-01T${block.original_time.split(' - ')[1]}`), 'h:mm a')}` : 
                                        'full day'
                                      }). 
                                      Click to edit the original block.
                                    </p>
                                  ) : (
                                    <p>
                                      {isPastDate 
                                        ? "Cannot edit past availability" 
                                        : "Edit availability"
                                      }
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          
                          {block.type === 'availability' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      // For split blocks, delete the original
                                      const originalId = block.id.includes('-split-') 
                                        ? block.id.split('-split-')[0] 
                                        : block.id;
                                      onDeleteAvailability(originalId);
                                    }}
                                    disabled={isPastDate}
                                    className="hover:bg-red-100 h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{isPastDate ? "Cannot delete past availability" : "Delete availability"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          
                          {/* Time-off actions */}
                          {block.type === 'time-off' && onEditException && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEditException(block.original as UnifiedAvailabilityException)}
                                    disabled={isPastDate}
                                    className="hover:bg-red-100 h-8 w-8 p-0"
                                  >
                                    <Edit className="h-4 w-4 text-blue-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{isPastDate ? "Cannot edit past time off" : "Edit time off"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          
                          {block.type === 'time-off' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDeleteException(block.id)}
                                    disabled={isPastDate}
                                    className="hover:bg-red-100 h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{isPastDate ? "Cannot delete past time off" : "Delete time off"}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : isLoading ? (
              <div className="flex justify-center items-center py-6">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <span className="ml-2 text-sm text-gray-500">Loading schedule...</span>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No availability or time off set for this day.</p>
            )}
          </div>
        );
      })}
    </div>
  );
} 