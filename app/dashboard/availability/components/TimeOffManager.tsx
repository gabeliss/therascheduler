'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
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
import { UnifiedAvailabilityException } from '@/app/types/index';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// Import from the new modular structure
import { formatTime } from '../utils/time/format';
import { DAYS_OF_WEEK } from '../utils/time/types';
import { TIME_OPTIONS } from '../utils/time/format';
import { validateTimeRange } from '../utils/time/calculations';
import { ExceptionFormValues } from '../utils/schemas';
import { useUnifiedAvailability } from '@/app/hooks/use-unified-availability';
import { Checkbox } from '@/components/ui/checkbox';
import DateRangeSelector from './DateRangeSelector';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAppointments } from '@/app/hooks/use-appointments';
import { checkTimeOffAppointmentClash } from '../utils/appointment-utils';

interface TimeOffManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  exceptions: UnifiedAvailabilityException[];
  onDeleteException: (id: string) => void;
  onAddException: (formData: ExceptionFormValues) => Promise<void>;
  onEditException?: (exception: UnifiedAvailabilityException) => void;
}

export default function TimeOffManager({ 
  isOpen, 
  onOpenChange, 
  exceptions,
  onDeleteException,
  onAddException,
  onEditException
}: TimeOffManagerProps) {
  const [activeTab, setActiveTab] = useState('recurring');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAllDay, setIsAllDay] = useState(false);
  const [appointmentClashError, setAppointmentClashError] = useState<string | null>(null);
  
  const { checkForOverlaps } = useUnifiedAvailability();
  const { appointments, loading: appointmentsLoading } = useAppointments();
  
  // Reset form when tab changes
  useEffect(() => {
    setStartTime('09:00');
    setEndTime('17:00');
    setReason('');
    setError(null);
    setAppointmentClashError(null);
    setIsAllDay(false);
    
    if (activeTab === 'recurring') {
      setSelectedDays([1]); // Monday by default
      setSelectedDate(undefined);
      setStartDate(undefined);
      setEndDate(undefined);
    } else {
      setSelectedDays([]);
      setSelectedDate(new Date());
      setStartDate(new Date());
      setEndDate(new Date());
    }
  }, [activeTab]);
  
  // Check for appointment clashes when form values change
  useEffect(() => {
    // Only check if we have appointments and the dialog is open
    if (!appointmentsLoading && appointments.length > 0 && isOpen) {
      checkForAppointmentClashes();
    }
  }, [startTime, endTime, isAllDay, selectedDays, startDate, endDate, activeTab, appointments, appointmentsLoading, isOpen]);
  
  // Function to check for appointment clashes
  const checkForAppointmentClashes = () => {
    // Clear previous error
    setAppointmentClashError(null);
    
    // Skip if appointments are still loading
    if (appointmentsLoading) return;
    
    if (activeTab === 'recurring') {
      // Check each selected day for clashes
      for (const dayIndex of selectedDays) {
        const adjustedDayIndex = dayIndex - 1; // Adjust index to match day of week (0-6)
        
        const clash = checkTimeOffAppointmentClash({
          startTime: `${startTime}:00`,
          endTime: `${endTime}:00`,
          isRecurring: true,
          dayOfWeek: adjustedDayIndex,
          isAllDay,
          appointments
        });
        
        if (clash) {
          setAppointmentClashError(clash.message);
          return; // Stop checking after first clash
        }
      }
    } else if (activeTab === 'specific' && startDate && endDate) {
      // Check specific date range for clashes
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      const clash = checkTimeOffAppointmentClash({
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        isRecurring: false,
        isAllDay,
        appointments
      });
      
      if (clash) {
        setAppointmentClashError(clash.message);
      }
    }
  };
  
  // Apply time presets
  const applyTimePreset = (preset: 'fullDay' | 'morning' | 'afternoon') => {
    switch (preset) {
      case 'fullDay':
        setStartTime('09:00');
        setEndTime('17:00');
        break;
      case 'morning':
        setStartTime('09:00');
        setEndTime('12:00');
        break;
      case 'afternoon':
        setStartTime('13:00');
        setEndTime('17:00');
        break;
    }
  };
  
  // Handle all day checkbox change
  const handleAllDayChange = (checked: boolean) => {
    setIsAllDay(checked);
    if (checked) {
      setStartTime('00:00');
      setEndTime('23:45');
    } else {
      setStartTime('09:00');
      setEndTime('17:00');
    }
  };
  
  // Sort exceptions by date
  const sortedExceptions = [...exceptions].sort((a, b) => {
    if (a.is_recurring && !b.is_recurring) return -1;
    if (!a.is_recurring && b.is_recurring) return 1;
    
    if (a.is_recurring && b.is_recurring) {
      // Sort recurring exceptions by day of week
      return (a.day_of_week || 0) - (b.day_of_week || 0);
    } else {
      // Sort non-recurring exceptions by start date
      if (!a.start_date || !b.start_date) return 0;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    }
  });
  
  // Filter exceptions by type
  const recurringExceptions = exceptions.filter(ex => ex.is_recurring);
  const specificExceptions = exceptions.filter(ex => !ex.is_recurring);
  
  // Group recurring exceptions by day of week
  const groupedRecurringExceptions: { [key: string]: UnifiedAvailabilityException[] } = {};
  
  recurringExceptions.forEach(ex => {
    const dayName = getDayName(ex.day_of_week);
    if (!groupedRecurringExceptions[dayName]) {
      groupedRecurringExceptions[dayName] = [];
    }
    groupedRecurringExceptions[dayName].push(ex);
  });
  
  // Sort specific exceptions by date
  const sortedSpecificExceptions = [...specificExceptions].sort((a, b) => {
    if (!a.start_date || !b.start_date) return 0;
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  });
  
  // Helper function to get day name
  function getDayName(dayOfWeek?: number): string {
    if (dayOfWeek === undefined) return 'Unknown';
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  }
  
  // Handle form submission
  const handleSubmit = async () => {
    setError(null);
    
    // Validate time range
    const validation = validateTimeRange(startTime, endTime);
    if (!validation.isValid) {
      setError(validation.errorMessage || 'Invalid time range');
      return;
    }
    
    // Validate form
    if (activeTab === 'recurring' && selectedDays.length === 0) {
      setError('Please select at least one day of the week');
      return;
    }
    
    if (activeTab === 'specific') {
      if (!startDate) {
        setError('Please select a start date');
        return;
      }
      
      if (!endDate) {
        setError('Please select an end date');
        return;
      }
    }
    
    // Check for appointment clashes
    if (activeTab === 'recurring') {
      for (const dayIndex of selectedDays) {
        const adjustedDayIndex = dayIndex - 1; // Adjust index to match day of week (0-6)
        
        const clash = checkTimeOffAppointmentClash({
          startTime: `${startTime}:00`,
          endTime: `${endTime}:00`,
          isRecurring: true,
          dayOfWeek: adjustedDayIndex,
          isAllDay,
          appointments
        });
        
        if (clash) {
          setError(clash.message);
          return;
        }
      }
    } else if (activeTab === 'specific' && startDate && endDate) {
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      const clash = checkTimeOffAppointmentClash({
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
        isRecurring: false,
        isAllDay,
        appointments
      });
      
      if (clash) {
        setError(clash.message);
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      if (activeTab === 'recurring') {
        // Check for overlaps for each selected day
        let hasOverlap = false;
        let overlapDay = '';
        
        for (const dayIndex of selectedDays) {
          const hasOverlapForDay = checkForOverlaps(
            startTime,
            endTime,
            true,
            dayIndex - 1, // Adjust index to match day of week (0-6)
            undefined
          );
          
          if (hasOverlapForDay) {
            hasOverlap = true;
            overlapDay = DAYS_OF_WEEK[dayIndex - 1];
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
            const isLastDay = i === totalDays - 1;
            
            // Add each day's time off to our batch
            promises.push(
              onAddException({
                startTime,
                endTime,
                reason,
                isRecurring: true,
                dayOfWeek: dayIndex - 1, // Adjust index to match day of week (0-6)
                isAllDay,
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
        
        // Check for overlaps
        const hasOverlap = checkForOverlaps(
          startTime,
          endTime,
          false,
          undefined,
          formattedStartDate,
          formattedEndDate
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
          isRecurring: false,
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          isAllDay
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
              <div className={`grid grid-cols-2 gap-4 ${isAllDay ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <Select
                    value={startTime}
                    onValueChange={setStartTime}
                    disabled={isAllDay}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {TIME_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Time</label>
                  <Select
                    value={endTime}
                    onValueChange={setEndTime}
                    disabled={isAllDay}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {TIME_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Reason Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason (Optional)</label>
                <Input 
                  placeholder="e.g., Lunch break, Staff meeting" 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="specific" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* Date Selection */}
              <DateRangeSelector
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                disablePastDates={true}
              />
              
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
              <div className={`grid grid-cols-2 gap-4 ${isAllDay ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <Select
                    value={startTime}
                    onValueChange={setStartTime}
                    disabled={isAllDay}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {TIME_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Time</label>
                  <Select
                    value={endTime}
                    onValueChange={setEndTime}
                    disabled={isAllDay}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {TIME_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Reason Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason (Optional)</label>
                <Input 
                  placeholder="e.g., Vacation, Doctor's appointment" 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !!appointmentClashError}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Add Time Off'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 