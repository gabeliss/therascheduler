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
import { formatTime, DAYS_OF_WEEK, TIME_OPTIONS } from '../utils/time-utils';
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
  
  const { checkForOverlaps } = useUnifiedAvailability();
  
  // Reset form when tab changes
  useEffect(() => {
    setStartTime('09:00');
    setEndTime('17:00');
    setReason('');
    setError(null);
    
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
    if (!a.specific_date || !b.specific_date) return 0;
    return new Date(a.specific_date).getTime() - new Date(b.specific_date).getTime();
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
            specificDate: undefined
          });
        }
      } else {
        // Add time off for each date in the range
        if (!startDate || !endDate) {
          setError('Please select both start and end dates');
          setIsSubmitting(false);
          return;
        }
        
        // Create an array of dates from startDate to endDate
        const dates: Date[] = [];
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          dates.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Add time off for each date
        for (const date of dates) {
          const formattedDate = format(date, 'yyyy-MM-dd');
          
          // Check for overlaps for this date
          const hasOverlap = checkForOverlaps(
            startTime,
            endTime,
            false,
            undefined,
            formattedDate
          );
          
          if (hasOverlap) {
            setError(`This time range overlaps with existing time off on ${format(date, 'EEEE, MMMM do')}. Please choose a different time range.`);
            setIsSubmitting(false);
            return;
          }
          
          // Add time off for this date
          await onAddException({
            startTime,
            endTime,
            reason,
            isRecurring: false,
            dayOfWeek: undefined,
            specificDate: formattedDate
          });
        }
      }
      
      // Reset form
      setStartTime('09:00');
      setEndTime('17:00');
      setReason('');
      setSelectedDays([]);
      setStartDate(undefined);
      setEndDate(undefined);
      
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
              
              {/* Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <Select
                    value={startTime}
                    onValueChange={setStartTime}
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Start Date</label>
                    <div className="border rounded-md p-1 w-full">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        className="rounded-md border w-full"
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">End Date</label>
                    <div className="border rounded-md p-1 w-full">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        className="rounded-md border w-full"
                        disabled={(date) => {
                          const today = new Date(new Date().setHours(0, 0, 0, 0));
                          if (date < today) return true;
                          if (startDate && date < startDate) return true;
                          return false;
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <Select
                    value={startTime}
                    onValueChange={setStartTime}
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
          <div className="text-red-500 text-sm mt-2">{error}</div>
        )}
        
        <DialogFooter className="flex justify-center gap-4 mt-6 sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-w-[100px]"
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 