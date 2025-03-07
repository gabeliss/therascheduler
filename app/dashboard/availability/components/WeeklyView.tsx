'use client';

import { useState } from 'react';
import { format, addDays, startOfWeek, isAfter, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Trash2, Edit } from 'lucide-react';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { formatTime, timeToMinutes } from '../utils/time-utils';
import { TherapistAvailability } from '@/app/hooks/use-therapist-availability';

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
    
    // Get specific date exceptions
    const specificDateExceptions = exceptions.filter(ex => 
      !ex.is_recurring && 
      ex.specific_date === formattedDate
    );
    
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
          slot => !slot.is_recurring && slot.specific_date === formattedDate
        );
        
        // Check for specific date exceptions
        const specificDateExceptions = exceptions.filter(
          ex => !ex.is_recurring && ex.specific_date === formattedDate
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
        
        // Combine specific date exceptions with recurring exceptions and sort by start time
        const dayExceptions = [...specificDateExceptions, ...recurringExceptions].sort((a, b) => {
          // Sort by start time
          return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
        });

        return (
          <div key={day} className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">{formattedDay}</h3>
            
            {/* Base Availability */}
            {dayAvailability.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Available Hours</h4>
                {dayAvailability.map(slot => (
                  <div key={slot.id} className="flex items-center justify-between bg-blue-50 p-2 rounded mb-2">
                    <span>
                      {format(new Date(`2000-01-01T${slot.start_time}`), 'h:mm a')} - 
                      {format(new Date(`2000-01-01T${slot.end_time}`), 'h:mm a')}
                    </span>
                    <div className="flex space-x-1">
                      {onEditAvailability && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditAvailability(slot)}
                          disabled={isPastDate}
                          title={isPastDate ? "Cannot edit past availability" : "Edit availability"}
                        >
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteAvailability(slot.id)}
                        disabled={isPastDate}
                        title={isPastDate ? "Cannot delete past availability" : "Delete availability"}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Recurring Exceptions */}
            {dayExceptions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Time Off</h4>
                {dayExceptions.map(ex => (
                  <div key={ex.id} className="flex items-center justify-between bg-gray-50 p-2 rounded mb-2">
                    <div>
                      <span>
                        {format(new Date(`2000-01-01T${ex.start_time}`), 'h:mm a')} - 
                        {format(new Date(`2000-01-01T${ex.end_time}`), 'h:mm a')}
                      </span>
                      {ex.reason && (
                        <span className="ml-2 text-gray-500">({ex.reason})</span>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      {onEditException && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditException(ex)}
                          disabled={isPastDate}
                          title={isPastDate ? "Cannot edit past time off" : "Edit time off"}
                        >
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteException(ex.id)}
                        disabled={isPastDate}
                        title={isPastDate ? "Cannot delete past time off" : "Delete time off"}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {dayAvailability.length === 0 && dayExceptions.length === 0 && (
              <p className="text-gray-500 text-sm">No availability or time off set for this day.</p>
            )}
          </div>
        );
      })}
    </div>
  );
} 