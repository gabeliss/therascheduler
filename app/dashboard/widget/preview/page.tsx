'use client';

// Add this line to disable layout inheritance
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Calendar as CalendarIcon, Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, addMinutes, parse, isSameMonth, isSameDay, isToday, startOfMonth, startOfWeek, endOfMonth, endOfWeek, eachDayOfInterval, addDays } from 'date-fns';
import { supabase } from '@/app/utils/supabase';
import { cn } from '@/lib/utils';
import { getDaysOfWeekFromRecurrence, DayOfWeek } from '@/app/utils/schema-converters';

// Add global interface for window object
declare global {
  interface Window {
    openTheraScheduler?: () => void;
    closeTheraScheduler?: () => void;
  }
}

interface AvailableSlot {
  id: string;
  therapist_id: string;
  start_time: string;
  end_time: string;
  recurrence: string | null;
}

interface TherapistInfo {
  id: string;
  name: string;
  email: string;
}

export default function WidgetPreviewPage() {
  const searchParams = useSearchParams();
  const [therapistId, setTherapistId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [therapist, setTherapist] = useState<TherapistInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [timeSlots, setTimeSlots] = useState<{time: string, formatted: string}[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const isEmbedded = searchParams.get('embedded') === 'true';
  const primaryColor = searchParams.get('primaryColor') || '#0f766e';

  // Initialize parameters from URL on first render
  useEffect(() => {
    // Get therapist ID from URL using multiple methods to ensure we get it
    let urlTherapistId = searchParams.get('therapistId');
    
    // If not found in searchParams, try to get it directly from window.location
    if (!urlTherapistId && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      urlTherapistId = urlParams.get('therapistId');
      
      // If still not found, try to parse the hash fragment
      if (!urlTherapistId && window.location.hash) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          urlTherapistId = hashParams.get('therapistId');
          
          if (urlTherapistId) {
            // If we found parameters in the hash, restore them to the URL query string
            const allHashParams = [...hashParams.entries()].reduce((obj, [key, value]) => {
              obj[key] = value;
              return obj;
            }, {} as Record<string, string>);
            
            // Create a new URL with the current pathname but with parameters from the hash
            const newUrl = new URL(window.location.origin + window.location.pathname);
            Object.entries(allHashParams).forEach(([key, value]) => {
              newUrl.searchParams.set(key, value);
            });
            
            // Replace the current URL with the new one that has the parameters
            window.history.replaceState({}, '', newUrl.toString());
          }
        } catch (err) {
          console.error('Error parsing URL hash:', err);
        }
      }
    }
    
    // Set therapist ID from URL
    setTherapistId(urlTherapistId);
    setIsInitialized(true);
    
    // Configure button style based on URL parameters
    const getParam = (name: string, defaultValue: string): string => {
      let value = searchParams.get(name);
      
      if (!value && typeof window !== 'undefined' && window.location.hash) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          value = hashParams.get(name);
        } catch (err) {
          console.error(`Error parsing hash for ${name}:`, err);
        }
      }
      
      return value || defaultValue;
    };
    
    // Fetch therapist info
    if (urlTherapistId) {
      fetchTherapistInfo(urlTherapistId);
    }
  }, [searchParams]);

  // Apply custom styling from parameters
  useEffect(() => {
    if (isEmbedded && primaryColor) {
      document.documentElement.style.setProperty('--primary', primaryColor);
      document.documentElement.style.setProperty('--primary-foreground', '#ffffff');
    }
    
    return () => {
      if (isEmbedded) {
        document.documentElement.style.removeProperty('--primary');
        document.documentElement.style.removeProperty('--primary-foreground');
      }
    };
  }, [isEmbedded, primaryColor]);

  // Fetch therapist info
  async function fetchTherapistInfo(id: string) {
    try {
      const { data, error } = await supabase
        .from('therapists')
        .select('id, name, email')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        setError('Therapist not found. Please check your widget configuration.');
      } else {
        setTherapist(data);
        fetchAvailableSlots(data.id, date);
      }
    } catch (err) {
      console.error('Error fetching therapist:', err);
      setError('Unable to load therapist information. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  // Fetch available slots
  async function fetchAvailableSlots(therapistId: string, selectedDate: Date) {
    setLoadingTimeSlots(true);
    
    try {
      const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // Fetch all availability for this therapist
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('availability')
        .select('id, therapist_id, start_time, end_time, recurrence')
        .eq('therapist_id', therapistId);
      
      if (availabilityError) throw availabilityError;
      
      // Filter slots based on date
      const filteredSlots = (availabilityData || []).filter(slot => {
        if (slot.recurrence) {
          // For recurring slots, check if this day of week is included in the recurrence pattern
          const daysOfWeek = getDaysOfWeekFromRecurrence(slot.recurrence);
          return daysOfWeek.includes(dayOfWeek as DayOfWeek);
        } else {
          // For one-time slots, check if the date matches
          const slotDate = new Date(slot.start_time);
          const slotDateStr = format(slotDate, 'yyyy-MM-dd');
          return slotDateStr === formattedDate;
        }
      });
      
      // Generate time slots from availability
      if (filteredSlots.length > 0) {
        const slots = generateTimeSlots(filteredSlots, formattedDate);
        setTimeSlots(slots);
      } else {
        setTimeSlots([]);
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
      setError('Failed to load available time slots. Please try again.');
    } finally {
      setLoadingTimeSlots(false);
    }
  }

  // Generate 30-minute time slots from availability ranges
  function generateTimeSlots(slots: any[], dateStr: string) {
    const timeSlots: {time: string, formatted: string}[] = [];
    
    slots.forEach(slot => {
      // Extract time parts from ISO timestamps
      const startTime = new Date(slot.start_time);
      const endTime = new Date(slot.end_time);
      
      // If the slot is a one-time slot for a specific date, make sure it's for today
      if (!slot.recurrence) {
        const slotDateStr = format(startTime, 'yyyy-MM-dd');
        if (slotDateStr !== dateStr) return;
      }
      
      let currentTime = new Date(startTime);
      const adjustedEndTime = new Date(endTime);
      
      // For recurring slots, set the date part to today's date
      if (slot.recurrence) {
        currentTime = new Date(`${dateStr}T${format(currentTime, 'HH:mm:ss')}`);
        adjustedEndTime.setFullYear(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
      }
      
      // Generate 30-minute slots from start to end time
      while (currentTime < adjustedEndTime) {
        const timeStr = format(currentTime, 'HH:mm');
        timeSlots.push({
          time: timeStr,
          formatted: format(currentTime, 'h:mm a')
        });
        currentTime = addMinutes(currentTime, 30); // 30-minute slots
      }
    });
    
    // Sort by time
    return timeSlots.sort((a, b) => a.time.localeCompare(b.time));
  }

  function handleDateSelect(selectedDate: Date) {
    setDate(selectedDate);
    if (therapist) {
      fetchAvailableSlots(therapist.id, selectedDate);
    }
    setSelectedTime(null);
  }

  function handleTimeSelect(time: string) {
    setSelectedTime(time);
  }

  function previousMonth() {
    setCurrentMonth(subMonths(currentMonth, 1));
  }

  function nextMonth() {
    setCurrentMonth(addMonths(currentMonth, 1));
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const dateFormat = "MMMM yyyy";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";
  
  // Generate calendar days
  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, "d");
      const cloneDay = day;
      days.push(
        <div
          key={day.toString()}
          className={cn(
            "h-8 w-8 p-0 font-normal text-center text-sm rounded-full",
            "flex items-center justify-center",
            !isSameMonth(day, monthStart) && "text-gray-300",
            isSameDay(day, date) && "bg-primary text-primary-foreground",
            isToday(day) && !isSameDay(day, date) && "border border-primary text-primary",
            "hover:bg-muted cursor-pointer"
          )}
          onClick={() => handleDateSelect(cloneDay)}
        >
          {formattedDate}
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="flex justify-between mt-1" key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  if (error) {
    return (
      <div className="container py-10">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <h1 className="text-xl font-bold mb-4">Preview Error</h1>
            <p className="mb-6 text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Show only the booking component that customers would see
  return (
    <div className={cn("py-6", isEmbedded ? "container-fluid px-0" : "container")}>
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading booking widget...</span>
        </div>
      ) : (
        <div className={cn("mx-auto", isEmbedded ? "max-w-full" : "max-w-3xl")}>
          {therapist && (
            <div>
              <h1 className="text-2xl font-bold mb-4">Book with {therapist.name}</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <div className="md:col-span-2">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="mb-2 flex items-center text-sm font-medium">
                        <CalendarIcon className="h-4 w-4 mr-2" /> 
                        Select a Date
                      </div>
                      <div className="calendar-container border rounded-md p-4">
                        <div className="flex items-center justify-between mb-4">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={previousMonth}
                            className="h-7 w-7"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="text-sm font-medium">
                            {format(currentMonth, dateFormat)}
                          </div>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={nextMonth}
                            className="h-7 w-7"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          <div className="text-xs text-center font-medium text-gray-500">Su</div>
                          <div className="text-xs text-center font-medium text-gray-500">Mo</div>
                          <div className="text-xs text-center font-medium text-gray-500">Tu</div>
                          <div className="text-xs text-center font-medium text-gray-500">We</div>
                          <div className="text-xs text-center font-medium text-gray-500">Th</div>
                          <div className="text-xs text-center font-medium text-gray-500">Fr</div>
                          <div className="text-xs text-center font-medium text-gray-500">Sa</div>
                        </div>
                        <div className="mt-1">{rows}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="md:col-span-3">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="mb-2 flex items-center text-sm font-medium">
                        <Clock className="h-4 w-4 mr-2" /> 
                        Available Times
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">
                        {format(date, 'EEEE, MMMM do, yyyy')}
                      </div>
                      
                      {loadingTimeSlots ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : timeSlots.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {timeSlots.map((slot, index) => (
                            <Button
                              key={index}
                              variant={selectedTime === slot.time ? "default" : "outline"}
                              className="w-full text-sm"
                              onClick={() => handleTimeSelect(slot.time)}
                              style={selectedTime === slot.time ? {backgroundColor: primaryColor, color: 'white'} : {}}
                            >
                              {slot.formatted}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No available slots for this date.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {selectedTime && (
                <Card className="mb-4">
                  <CardContent className="pt-6">
                    <h2 className="text-lg font-medium mb-4">Your Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Full Name</label>
                        <input type="text" className="w-full p-2 border rounded-md" placeholder="Your full name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input type="email" className="w-full p-2 border rounded-md" placeholder="your@email.com" />
                      </div>
                    </div>
                    <Button 
                      className="w-full" 
                      style={{backgroundColor: primaryColor}}
                    >
                      Request Appointment
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      This is a preview. No actual appointment will be booked.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 