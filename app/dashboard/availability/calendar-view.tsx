'use client';

import React, { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay, isAfter, isBefore, addWeeks, subWeeks } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { TIME_SLOTS } from './utils/time-utils';

interface UnifiedCalendarViewProps {
  unifiedExceptions: UnifiedAvailabilityException[];
  onTimeSlotClick: (date: Date, timeSlot: string) => void;
}

export default function UnifiedCalendarView({ unifiedExceptions, onTimeSlotClick }: UnifiedCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get the start of the week (Sunday)
  const weekStart = startOfWeek(currentDate);
  
  // Generate the days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Navigate to previous week
  const goToPreviousWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };
  
  // Navigate to next week
  const goToNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };
  
  // Navigate to current week
  const goToCurrentWeek = () => {
    setCurrentDate(new Date());
  };
  
  // Check if a time slot is blocked by an exception
  const isTimeBlocked = (date: Date, timeSlot: string): UnifiedAvailabilityException | null => {
    const dayOfWeek = date.getDay();
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    // Check for specific date exceptions first (they take precedence)
    const specificDateException = unifiedExceptions.find(ex => 
      !ex.is_recurring && 
      ex.specific_date === formattedDate &&
      timeSlot >= ex.start_time && 
      timeSlot < ex.end_time
    );
    
    if (specificDateException) {
      return specificDateException;
    }
    
    // Then check for recurring exceptions
    const recurringException = unifiedExceptions.find(ex => 
      ex.is_recurring && 
      ex.day_of_week === dayOfWeek &&
      timeSlot >= ex.start_time && 
      timeSlot < ex.end_time
    );
    
    // For recurring exceptions, only apply to current or future dates
    if (recurringException) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isAfter(date, today) || isSameDay(date, today)) {
        return recurringException;
      }
    }
    
    return null;
  };
  
  return (
    <div className="space-y-4">
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
      
      <div className="grid grid-cols-8 gap-2">
        {/* Time slots column */}
        <div className="space-y-2 pt-10">
          {TIME_SLOTS.map((slot: { value: string; label: string }) => (
            <div key={slot.value} className="h-12 flex items-center justify-end pr-2 text-sm text-gray-500">
              {slot.label}
            </div>
          ))}
        </div>
        
        {/* Days of the week */}
        {weekDays.map((day) => (
          <div key={day.toISOString()} className="space-y-2">
            <div className="text-center py-2 font-medium">
              <div>{format(day, 'EEE')}</div>
              <div className={`text-sm ${isSameDay(day, new Date()) ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center mx-auto' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
            
            {/* Time slots for this day */}
            {TIME_SLOTS.map((slot: { value: string; label: string }) => {
              const exception = isTimeBlocked(day, slot.value);
              const isBlocked = !!exception;
              
              return (
                <div 
                  key={`${day.toISOString()}-${slot.value}`}
                  className={`h-12 rounded-md border ${
                    isBlocked 
                      ? 'bg-red-100 border-red-200 cursor-default' 
                      : 'hover:bg-gray-50 cursor-pointer'
                  }`}
                  onClick={() => !isBlocked && onTimeSlotClick(day, slot.value)}
                >
                  {isBlocked && (
                    <div className="p-2 text-xs text-red-800 truncate">
                      {exception?.reason || 'Blocked'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
} 