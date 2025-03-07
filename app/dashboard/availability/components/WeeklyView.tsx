'use client';

import { useState } from 'react';
import { format, addDays, startOfWeek, isAfter, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { formatTime } from '../utils/time-utils';

interface WeeklyViewProps {
  exceptions: UnifiedAvailabilityException[];
  onAddException: (date: Date) => void;
  onDeleteException: (id: string) => void;
  formatDate: (dateString?: string) => string;
}

export default function WeeklyView({ 
  exceptions, 
  onAddException, 
  onDeleteException,
  formatDate 
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
    
    // Get specific date exceptions
    const specificDateExceptions = exceptions.filter(ex => 
      !ex.is_recurring && 
      ex.specific_date === formattedDate
    );
    
    // Get recurring exceptions
    const recurringExceptions = exceptions.filter(ex => 
      ex.is_recurring && 
      ex.day_of_week === dayOfWeek
    );
    
    // For recurring exceptions, only include them for current or future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const filteredRecurringExceptions = recurringExceptions.filter(() => 
      isAfter(date, today) || isSameDay(date, today)
    );
    
    // Combine both types of exceptions
    return [...specificDateExceptions, ...filteredRecurringExceptions];
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayExceptions = getExceptionsForDate(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <Card key={day.toISOString()} className={`${isToday ? 'border-primary' : ''}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-center">
                  <div>{format(day, 'EEEE')}</div>
                  <div className="text-sm text-muted-foreground">{format(day, 'MMM d')}</div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayExceptions.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No time off
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayExceptions.map((exception) => (
                      <div 
                        key={exception.id} 
                        className="bg-red-50 p-2 rounded-md border border-red-100 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {formatTime(exception.start_time)} - {formatTime(exception.end_time)}
                          </div>
                          {exception.reason && (
                            <div className="text-xs text-gray-500">{exception.reason}</div>
                          )}
                          {exception.is_recurring && (
                            <div className="text-xs text-blue-500">Repeats weekly</div>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onDeleteException(exception.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => onAddException(day)}
                >
                  Add Time Off
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 