'use client';

import { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { HierarchicalAvailability, AvailabilityException } from '@/app/types';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatTime as formatTimeUtil } from '../utils/time-utils';

// Custom tooltip components
interface TooltipProps {
  children: React.ReactNode;
}

interface TooltipTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

interface TooltipContentProps {
  children: React.ReactNode;
}

const TooltipProvider: React.FC<TooltipProps> = ({ children }) => {
  return <>{children}</>;
};

const Tooltip: React.FC<TooltipProps> = ({ children }) => {
  return <div className="relative group">{children}</div>;
};

const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children, asChild }) => {
  return <div className="cursor-help">{children}</div>;
};

const TooltipContent: React.FC<TooltipContentProps> = ({ children }) => {
  return (
    <div className="absolute z-50 invisible group-hover:visible bg-black text-white p-2 rounded text-sm bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-48">
      {children}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
    </div>
  );
};

interface CalendarViewProps {
  hierarchicalAvailability: HierarchicalAvailability[];
}

export default function CalendarView({ hierarchicalAvailability }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const startDate = startOfWeek(currentDate, { weekStartsOn: 0 }); // 0 = Sunday

  // Navigate to previous week
  const prevWeek = () => {
    setCurrentDate(addDays(currentDate, -7));
  };

  // Navigate to next week
  const nextWeek = () => {
    setCurrentDate(addDays(currentDate, 7));
  };

  // Navigate to current week
  const currentWeek = () => {
    setCurrentDate(new Date());
  };

  // Use the shared formatTime function instead of defining a local one
  const formatTime = (time: string) => {
    return formatTimeUtil(time);
  };

  // Generate time slots for the day (7am to 8pm in 30-minute increments)
  const timeSlots = Array.from({ length: 26 }, (_, i) => {
    const hour = Math.floor(i / 2) + 7; // Start at 7am
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  // Generate days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(startDate, i);
    return {
      date: day,
      dayOfWeek: day.getDay(),
      formattedDate: format(day, 'MMM d'),
      dayName: format(day, 'EEEE'),
    };
  });

  // Check if a time slot is available for a specific day
  const getAvailabilityForTimeSlot = (dayOfWeek: number, date: Date, timeSlot: string) => {
    // Format date as YYYY-MM-DD
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    // Find base availability for this day (either recurring or specific date)
    const availableSlots = hierarchicalAvailability.filter(ha => 
      (ha.base.is_recurring && ha.base.day_of_week === dayOfWeek) || 
      (!ha.base.is_recurring && ha.base.specific_date === formattedDate)
    );
    
    if (availableSlots.length === 0) return null;
    
    // Check each base availability
    for (const slot of availableSlots) {
      const baseStart = slot.base.start_time;
      const baseEnd = slot.base.end_time;
      
      // Check if time slot is within base availability
      if (timeSlot >= baseStart && timeSlot < baseEnd) {
        // Check if time slot is blocked by an exception
        const exception = slot.exceptions.find(ex => 
          timeSlot >= ex.start_time && timeSlot < ex.end_time
        );
        
        if (exception) {
          return { type: 'exception', data: exception as AvailabilityException };
        }
        
        return { type: 'available', data: slot.base };
      }
    }
    
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">Weekly Schedule</h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={currentWeek}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Calendar header */}
          <div className="grid grid-cols-8 border-b">
            <div className="p-2 border-r bg-gray-50"></div>
            {weekDays.map((day) => (
              <div
                key={day.formattedDate}
                className={cn(
                  "p-2 text-center border-r",
                  isSameDay(day.date, new Date()) && "bg-blue-50"
                )}
              >
                <div className="font-medium">{day.dayName}</div>
                <div className="text-sm text-gray-500">{day.formattedDate}</div>
              </div>
            ))}
          </div>
          
          {/* Time slots */}
          <div className="relative">
            {timeSlots.map((time, index) => (
              <div key={time} className="grid grid-cols-8 border-b">
                <div className="p-2 text-xs text-gray-500 border-r bg-gray-50">
                  {formatTime(time)}
                </div>
                
                {weekDays.map((day) => {
                  const availability = getAvailabilityForTimeSlot(day.dayOfWeek, day.date, time);
                  
                  return (
                    <div
                      key={`${day.formattedDate}-${time}`}
                      className={cn(
                        "p-2 border-r h-10",
                        isSameDay(day.date, new Date()) && "bg-blue-50",
                        availability?.type === 'available' && "bg-green-100",
                        availability?.type === 'exception' && "bg-red-100"
                      )}
                    >
                      {availability?.type === 'exception' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-full h-full flex items-center justify-center">
                                <Clock className="h-4 w-4 text-red-500" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">Exception</p>
                              <p className="text-xs">
                                {formatTime(availability.data.start_time)} - {formatTime(availability.data.end_time)}
                              </p>
                              {(availability.data as AvailabilityException).reason && (
                                <p className="text-xs mt-1">{(availability.data as AvailabilityException).reason}</p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 rounded mr-2"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-100 rounded mr-2"></div>
            <span>Exception (Blocked)</span>
          </div>
        </div>
      </div>
    </div>
  );
} 