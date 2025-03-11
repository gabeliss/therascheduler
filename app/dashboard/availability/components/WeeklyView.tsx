'use client';

import { useState } from 'react';
import { format, addDays, startOfWeek, isAfter, isSameDay, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Trash2, Edit, Repeat, Clock, Calendar, Info } from 'lucide-react';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { formatTime, timeToMinutes } from '../utils/time-utils';
import { TherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface WeeklyViewProps {
  availability: TherapistAvailability[];
  exceptions: UnifiedAvailabilityException[];
  onAddException: (date: Date) => void;
  onDeleteException: (id: string) => Promise<void>;
  onDeleteAvailability: (id: string) => Promise<void>;
  formatDate: (dateString: string | undefined) => string;
  onEditException?: (exception: UnifiedAvailabilityException) => void;
  onEditAvailability?: (availability: TherapistAvailability) => void;
}

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
}

export default function WeeklyView({
  availability,
  exceptions,
  onAddException,
  onDeleteException,
  onDeleteAvailability,
  formatDate,
  onEditException,
  onEditAvailability
}: WeeklyViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
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
      
      // Check if this date falls within the date range
      return ex.start_date && ex.end_date && 
             formattedDate >= ex.start_date && 
             formattedDate <= ex.end_date;
    });
    
    // Get recurring exceptions
    // Only show recurring exceptions for dates after they were created
    const recurringExceptions = exceptions.filter(ex => {
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
    });
    
    // Combine both types of exceptions and sort by start time
    return [...specificDateExceptions, ...recurringExceptions].sort((a, b) => {
      // Sort by start time
      return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
    });
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
          is_all_day: ex.is_all_day
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
            is_all_day: ex.is_all_day
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
          is_all_day: ex.is_all_day
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
  
  // Helper function to convert minutes to time string (HH:MM:SS)
  const minutesToTimeString = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
  };
  
  // Function to format time for display (e.g., "08:00:00" -> "8:00 AM")
  const formatDisplayTime = (timeString: string): string => {
    return format(new Date(`2000-01-01T${timeString}`), 'h:mm a');
  };
  
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Weekly Schedule</h2>
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
        const specificDateExceptions = exceptions.filter(
          ex => !ex.is_recurring && 
               ex.start_date && ex.end_date && 
               formattedDate >= ex.start_date && 
               formattedDate <= ex.end_date
        );
        
        // If there are specific date availability entries, use only those
        // Otherwise, use recurring availability
        let dayAvailability = specificDateAvailability;
        
        if (specificDateAvailability.length === 0) {
          // Show recurring availability
          // Only show recurring availability for dates after it was created
          dayAvailability = availability.filter(slot => {
            if (!slot.is_recurring || slot.day_of_week !== index) return false;
            
            // If this is a past date, check if the availability was created before this date
            if (isPastDate) {
              const createdAt = new Date(slot.created_at);
              const dateToCheck = new Date(currentDay);
              // Only show recurring availability if it was created before this date
              return createdAt < dateToCheck;
            }
            
            // For current and future dates, show all recurring availability
            return true;
          });
        }
        
        // For exceptions, we'll show both specific date and recurring exceptions
        // Get recurring exceptions
        const recurringExceptions = exceptions.filter(ex => {
          if (!ex.is_recurring || ex.day_of_week !== index) return false;
          
          // If this is a past date, check if the exception was created before this date
          if (isPastDate) {
            const createdAt = new Date(ex.created_at);
            const dateToCheck = new Date(currentDay);
            // Only show recurring exceptions if they were created before this date
            return createdAt < dateToCheck;
          }
          
          // For current and future dates, show all recurring exceptions
          return true;
        });
        
        // Combine specific date exceptions with recurring exceptions
        const dayExceptions = [...specificDateExceptions, ...recurringExceptions];

        // Create a unified timeline of availability and time off blocks
        const timelineBlocks = createUnifiedTimeline(dayAvailability, dayExceptions);

        return (
          <div key={day} className="border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-3">{formattedDay}</h3>
            
            {timelineBlocks.length > 0 ? (
              <div className="space-y-1">
                {timelineBlocks.map((block, blockIndex) => {
                  // Check if this block is a different type than the previous one
                  const prevBlock = blockIndex > 0 ? timelineBlocks[blockIndex - 1] : null;
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
                            : "bg-red-50 border-red-300"
                        )}
                      >
                        <div>
                          <div className="flex items-center">
                            <span className={cn(
                              "font-medium flex items-center",
                              block.type === 'availability' ? "text-green-700" : "text-red-700"
                            )}>
                              {block.type === 'availability' ? (
                                <Calendar className="h-4 w-4 mr-1 inline" />
                              ) : (
                                <Clock className="h-4 w-4 mr-1 inline" />
                              )}
                              {block.is_all_day ? (
                                "All Day"
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
                            {block.reason && (
                              <span className="text-gray-600 text-xs">{block.reason}</span>
                            )}
                            {block.type === 'availability' && (
                              <span className="text-green-600 text-xs">Available</span>
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
                                        `${formatDisplayTime(block.original_time.split(' - ')[0])} - ${formatDisplayTime(block.original_time.split(' - ')[1])}` : 
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
            ) : (
              <p className="text-gray-500 text-sm">No availability or time off set for this day.</p>
            )}
          </div>
        );
      })}
    </div>
  );
} 