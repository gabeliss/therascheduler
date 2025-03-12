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
import { Trash2, Plus, Clock, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { formatTime, DAYS_OF_WEEK, TIME_OPTIONS, validateTimeRange } from '../utils/time-utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ExceptionFormValues } from '../utils/schemas';
import { useUnifiedAvailability } from '@/app/hooks/use-unified-availability';
import { Checkbox } from '@/components/ui/checkbox';
import DateRangeSelector from './DateRangeSelector';

interface TimeOffManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  exceptions: UnifiedAvailabilityException[];
  onDeleteException: (id: string) => void;
  onAddException: (formData: ExceptionFormValues) => Promise<void>;
}

export default function TimeOffManager({ 
  isOpen, 
  onOpenChange, 
  exceptions,
  onDeleteException,
  onAddException
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
  
  const { checkForOverlaps } = useUnifiedAvailability();
  
  // Reset form when tab changes
  useEffect(() => {
    setStartTime('09:00');
    setEndTime('17:00');
    setReason('');
    setError(null);
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
    
    setIsSubmitting(true);
    
    try {
      if (activeTab === 'recurring') {
        // Add time off for each selected day
        for (const dayIndex of selectedDays) {
          // Check for overlaps for this day
          const hasOverlap = checkForOverlaps(
            startTime,
            endTime,
            true,
            dayIndex - 1, // Adjust index to match day of week (0-6)
            undefined
          );
          
          if (hasOverlap) {
            setError(`This time range overlaps with existing time off on ${DAYS_OF_WEEK[dayIndex - 1]}. Please choose a different time range.`);
            setIsSubmitting(false);
            return;
          }
          
          // Add time off for this day
          await onAddException({
            startTime,
            endTime,
            reason,
            isRecurring: true,
            dayOfWeek: dayIndex - 1, // Adjust index to match day of week (0-6)
            isAllDay
          });
        }
      } else {
        // Add multi-day time off
        if (!startDate || !endDate) {
          setError('Please select both start and end dates');
          setIsSubmitting(false);
          return;
        }
        
        const formattedStartDate = format(startDate, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');
        
        // Check for overlaps for the date range
        const hasOverlap = checkForOverlaps(
          startTime,
          endTime,
          false,
          undefined,
          formattedStartDate,
          formattedEndDate
        );
        
        if (hasOverlap) {
          setError(`This time range overlaps with existing time off. Please choose a different time range.`);
          setIsSubmitting(false);
          return;
        }
        
        // Add time off for the date range
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
      
      // Reset form
      setStartTime('09:00');
      setEndTime('17:00');
      setReason('');
      setSelectedDays([]);
      setStartDate(undefined);
      setEndDate(undefined);
      setIsAllDay(false);
      
      // Close the modal
      onOpenChange(false);
      
      // Show success message
      // This would be better handled in the parent component
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
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
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 