'use client';

import { useState, useEffect } from 'react';
import { format, parse, isAfter, isSameDay } from 'date-fns';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Clock, Calendar as CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
import { TimeOff } from '@/app/types/index';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import TimeInput from '@/components/ui/time-input';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useTherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { formatTime } from '@/app/utils/format-time';
import { DAYS_OF_WEEK } from '@/app/constants';
import { useAppointments } from '@/app/hooks/use-appointments';
import { checkTimeOffAppointmentClash } from '../utils/appointment-utils';

interface TimeOffManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddException: (data: {
    startTime: string;
    endTime: string;
    reason: string;
    recurrence: string | null;
    start_time: string;
    end_time: string;
    isBatchOperation?: boolean;
    skipToast?: boolean;
  }) => Promise<void>;
  onDeleteException?: (id: string) => Promise<void>;
  onEditException?: (id: string) => void;
}

export default function TimeOffManager({
  isOpen,
  onOpenChange,
  onAddException,
}: TimeOffManagerProps) {
  const [activeTab, setActiveTab] = useState('recurring');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appointmentClashError, setAppointmentClashError] = useState<string | null>(null);
  
  const { therapistAvailability, timeOffPeriods } = useTherapistAvailability();
  const { appointments, loading: appointmentsLoading } = useAppointments();
  
  // Check for appointment clashes when time selection changes
  useEffect(() => {
    checkForAppointmentClashes();
  }, [startTime, endTime, selectedDays, activeTab, startDate, endDate, isAllDay]);
  
  // Reset error when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Reset form when dialog closes
      setError('');
      setAppointmentClashError(null);
      setReason('');
      setSelectedDays([]);
      setStartTime('09:00');
      setEndTime('17:00');
      setIsAllDay(false);
      setStartDate(new Date());
      setEndDate(new Date());
      setActiveTab('recurring');
    }
  }, [isOpen]);
  
  // Function to check for time conflicts with existing appointments
  const checkForAppointmentClashes = async () => {
    try {
      setAppointmentClashError(null);
      
      // We'll implement this later if needed
      
    } catch (error) {
      console.error('Error checking for appointment clashes:', error);
    }
  };
  
  // Handler for checking overlaps with existing time off
  const checkTimeOffOverlaps = (startTime: string, endTime: string, recurrence: string | null) => {
    try {
      if (!timeOffPeriods || !timeOffPeriods.length) return false;
      
      // Convert input times to minutes since start of day
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);
      
      // Check each existing time off period for overlaps
      for (const timeOff of timeOffPeriods) {
        // Skip the time off period we're editing
        // if (timeOff.id === id) continue;
        
        // Get the existing time off start and end
        const timeOffStartTime = new Date(timeOff.start_time);
        const timeOffEndTime = new Date(timeOff.end_time);
        
        // Convert existing time off times to minutes since start of day
        const timeOffStartMinutes = timeOffStartTime.getHours() * 60 + timeOffStartTime.getMinutes();
        const timeOffEndMinutes = timeOffEndTime.getHours() * 60 + timeOffEndTime.getMinutes();
        
        // If the time ranges overlap
        const timeRangeOverlaps = (
          (startMinutes < timeOffEndMinutes && endMinutes > timeOffStartMinutes) ||
          (startMinutes === timeOffStartMinutes && endMinutes === timeOffEndMinutes)
        );
        
        if (!timeRangeOverlaps) continue;
        
        // Time ranges overlap, now check days
        // If both are non-recurring or both are recurring, check day overlap
        if (recurrence === null && timeOff.recurrence === null) {
          // If time ranges overlap and both are non-recurring, it's an overlap
          return true;
        } else if (recurrence !== null && timeOff.recurrence !== null) {
          // If both are recurring, check if they share any days
          
          const recurrenceDays = recurrence.split(':')[1].split(',').map(Number);
          const timeOffRecurrenceDays = timeOff.recurrence.split(':')[1].split(',').map(Number);
          
          // Check if any day overlaps
          for (const day of recurrenceDays) {
            if (timeOffRecurrenceDays.includes(day)) {
              return true;
            }
          }
        }
      }
      
      return false;
    } catch (err) {
      console.error('Error checking for overlaps:', err);
      return false;
    }
  };
  
  // Helper function to convert time string to minutes
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  // Helper to apply a time preset (morning, afternoon, evening)
  const applyTimePreset = (preset: string) => {
    switch (preset) {
      case 'morning':
        setStartTime('08:00');
        setEndTime('12:00');
        break;
      case 'afternoon':
        setStartTime('12:00');
        setEndTime('17:00');
        break;
      case 'evening':
        setStartTime('17:00');
        setEndTime('21:00');
        break;
    }
  };
  
  // Handle all day checkbox change
  const handleAllDayChange = (checked: boolean) => {
    setIsAllDay(checked);
    if (checked) {
      setStartTime('00:00');
      setEndTime('23:59');
    } else {
      setStartTime('09:00');
      setEndTime('17:00');
    }
  };
  
  // Sort time off by day of week for display
  const sortedExceptions = () => {
    if (!timeOffPeriods) return [];
    
    return timeOffPeriods
      .filter(ex => ex.recurrence !== null)
      .sort((a, b) => {
        const dayA = parseInt(a.recurrence!.split(':')[1]);
        const dayB = parseInt(b.recurrence!.split(':')[1]);
        return dayA - dayB;
      });
  };
  
  // Sort specific date exceptions for display
  const sortedSpecificExceptions = () => {
    if (!timeOffPeriods) return [];
    
    return timeOffPeriods
      .filter(ex => ex.recurrence === null)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };
  
  // Helper function to get day name
  function getDayName(dayOfWeek?: number): string {
    if (dayOfWeek === undefined) return 'Unknown';
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      // Validate times
      const startHour = parseInt(startTime.split(':')[0]);
      const startMinute = parseInt(startTime.split(':')[1]);
      const endHour = parseInt(endTime.split(':')[0]);
      const endMinute = parseInt(endTime.split(':')[1]);
      
      // Basic validation
      if (startHour > endHour || (startHour === endHour && startMinute >= endMinute)) {
        setError('End time must be after start time');
        setIsSubmitting(false);
        return;
      }
      
      // Check if recurring or specific date
      if (activeTab === 'recurring') {
        // Add recurring time off for selected days
        if (selectedDays.length === 0) {
          setError('Please select at least one day');
          setIsSubmitting(false);
          return;
        }
        
        // Check for overlaps with existing time off
        let hasOverlap = false;
        let overlapDay = '';
        
        for (const dayIndex of selectedDays) {
          const adjustedDayIndex = dayIndex - 1; // Adjust index to match day of week (0-6)
          
          // Create recurrence string for this day
          const recurrence = `weekly:${adjustedDayIndex}`;
          
          // Create full ISO timestamps with today's date
          const today = new Date().toISOString().split('T')[0];
          const start_time = `${today}T${isAllDay ? '00:00' : startTime}:00`;
          const end_time = `${today}T${isAllDay ? '23:59' : endTime}:00`;
          
          const hasOverlapForDay = checkTimeOffOverlaps(
            startTime,
            endTime,
            recurrence
          );
          
          if (hasOverlapForDay) {
            hasOverlap = true;
            overlapDay = DAYS_OF_WEEK[adjustedDayIndex];
            break;
          }
        }
        
        if (hasOverlap) {
          setError(`This time range overlaps with existing time off on ${overlapDay}. Please choose a different time range.`);
          setIsSubmitting(false);
          return;
        }
        
        // For recurring time off, create a single batch operation
        if (selectedDays.length > 0) {
          // Create a batch of promises for all days
          const promises = [];
          const totalDays = selectedDays.length;
          
          // Process all days at once to avoid multiple toasts
          for (let i = 0; i < totalDays; i++) {
            const dayIndex = selectedDays[i];
            const adjustedDayIndex = dayIndex - 1; // Adjust index to match day of week (0-6)
            const isLastDay = i === totalDays - 1;
            
            // Create recurrence string for this day
            const recurrence = `weekly:${adjustedDayIndex}`;
            
            // Create full ISO timestamps with today's date
            const today = new Date().toISOString().split('T')[0];
            const start_time = isAllDay 
              ? `${today}T00:00:00` 
              : `${today}T${startTime}:00`;
            const end_time = isAllDay 
              ? `${today}T23:59:00` 
              : `${today}T${endTime}:00`;
            
            // Add each day's time off to our batch
            promises.push(
              onAddException({
                startTime,
                endTime,
                reason,
                recurrence,
                start_time,
                end_time,
                isBatchOperation: !isLastDay, // Mark all but the last one as batch operations
                skipToast: !isLastDay // Skip toast for all but the last one
              })
            );
          }
          
          // Wait for all promises to complete
          await Promise.all(promises);
        }
      } else {
        // Add multi-day time off
        if (!startDate || !endDate) {
          setError('Please select both start and end dates');
          setIsSubmitting(false);
          return;
        }
        
        // Format dates as YYYY-MM-DD
        const formattedStartDate = format(startDate, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');
        
        // Create full ISO timestamps
        const start_time = isAllDay 
          ? `${formattedStartDate}T00:00:00`
          : `${formattedStartDate}T${startTime}:00`;
        const end_time = isAllDay 
          ? `${formattedEndDate}T23:59:00`
          : `${formattedEndDate}T${endTime}:00`;
        
        // Check for overlaps
        const hasOverlap = checkTimeOffOverlaps(
          startTime,
          endTime,
          null
        );
        
        if (hasOverlap) {
          setError('This time range overlaps with existing time off. Please choose a different time range.');
          setIsSubmitting(false);
          return;
        }
        
        // Add the time off
        await onAddException({
          startTime,
          endTime,
          reason,
          recurrence: null,
          start_time,
          end_time
        });
      }
      
      // Reset form and close dialog
      onOpenChange(false);
    } catch (err) {
      console.error('Error adding time off:', err);
      setError('Failed to add time off. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Time Off</DialogTitle>
          <DialogDescription>
            Block time in your schedule for breaks, appointments, or personal time.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="recurring" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recurring">Regular Breaks</TabsTrigger>
            <TabsTrigger value="specific">Time Away</TabsTrigger>
          </TabsList>
          
          {/* Display error message if there is one */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Display appointment clash warning */}
          {appointmentClashError && !error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {appointmentClashError}
              </AlertDescription>
            </Alert>
          )}
          
          <TabsContent value="recurring" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* Day Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Days of Week</label>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <div key={index} className="flex flex-col items-center space-y-2">
                      <div 
                        className={`
                          w-10 h-10 rounded-full flex items-center justify-center cursor-pointer
                          ${selectedDays.includes(index + 1) 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } 
                          transition-colors
                        `}
                        onClick={() => {
                          if (selectedDays.includes(index + 1)) {
                            setSelectedDays(selectedDays.filter(d => d !== index + 1));
                          } else {
                            setSelectedDays([...selectedDays, index + 1]);
                          }
                        }}
                      >
                        {day.charAt(0)}
                      </div>
                      <span className="text-xs font-normal">
                        {day.substring(0, 3)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* All Day Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="recurring-all-day" 
                  checked={isAllDay}
                  onCheckedChange={handleAllDayChange}
                />
                <label
                  htmlFor="recurring-all-day"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  All Day
                </label>
              </div>
              
              {/* Time Selection */}
              {!isAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Start Time</Label>
                    <TimeInput
                      id="start-time"
                      value={startTime}
                      onChange={value => setStartTime(value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">End Time</Label>
                    <TimeInput
                      id="end-time"
                      value={endTime}
                      onChange={value => setEndTime(value)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
              
              {/* Reason Input */}
              <div className="space-y-2">
                <Label htmlFor="recurring-reason">Reason (Optional)</Label>
                <Input
                  id="recurring-reason"
                  placeholder="e.g., Lunch Break"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>
              
              {/* Time Presets */}
              <div className="space-y-2">
                <Label className="text-sm">Quick Select</Label>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => applyTimePreset('morning')}
                    className="flex-grow"
                  >
                    Morning
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => applyTimePreset('afternoon')}
                    className="flex-grow"
                  >
                    Afternoon
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => applyTimePreset('evening')}
                    className="flex-grow"
                  >
                    Evening
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleAllDayChange(true)}
                    className="flex-grow"
                  >
                    All Day
                  </Button>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleSubmit} 
              className="w-full"
              disabled={isSubmitting || selectedDays.length === 0 || !!appointmentClashError}
            >
              {isSubmitting ? 'Adding...' : 'Add Time Off'} 
            </Button>
          </TabsContent>
          
          <TabsContent value="specific" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* Date Range Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <div className="grid gap-2">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      className="border rounded-md p-3"
                      disabled={(date) => {
                        // Disable dates in the past
                        return date < new Date(new Date().setHours(0, 0, 0, 0));
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <div className="grid gap-2">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      className="border rounded-md p-3"
                      disabled={(date) => {
                        // Disable dates before the start date or in the past
                        return date < new Date(new Date().setHours(0, 0, 0, 0)) || 
                               (startDate && date < startDate);
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* All Day Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="specific-all-day" 
                  checked={isAllDay}
                  onCheckedChange={handleAllDayChange}
                />
                <label
                  htmlFor="specific-all-day"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  All Day
                </label>
              </div>
              
              {/* Time Selection */}
              {!isAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time-specific">Start Time</Label>
                    <TimeInput
                      id="start-time-specific"
                      value={startTime}
                      onChange={value => setStartTime(value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time-specific">End Time</Label>
                    <TimeInput
                      id="end-time-specific"
                      value={endTime}
                      onChange={value => setEndTime(value)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
              
              {/* Reason Input */}
              <div className="space-y-2">
                <Label htmlFor="specific-reason">Reason (Optional)</Label>
                <Input
                  id="specific-reason"
                  placeholder="e.g., Vacation, Doctor's appointment"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>
            </div>
            
            <Button 
              onClick={handleSubmit} 
              className="w-full"
              disabled={isSubmitting || !startDate || !endDate || !!appointmentClashError}
            >
              {isSubmitting ? 'Adding...' : 'Add Time Off'} 
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 