import React, { useState, useEffect } from 'react';
import { format, parseISO, isAfter } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TIME_OPTIONS, formatTime, validateTimeRange } from '../utils/time-utils';
import { UnifiedAvailabilityException } from '@/app/types/index';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import DateRangeSelector from './DateRangeSelector';

interface EditTimeOffDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  exception: UnifiedAvailabilityException | null;
  onSave: (id: string, startTime: string, endTime: string, reason: string, startDate?: string, endDate?: string, isAllDay?: boolean) => Promise<void>;
}

const EditTimeOffDialog = ({
  isOpen,
  onOpenChange,
  exception,
  onSave,
}: EditTimeOffDialogProps) => {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isAllDay, setIsAllDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when exception changes
  useEffect(() => {
    if (exception) {
      console.log('EditTimeOffDialog - exception changed:', exception);
      console.log('Setting start time to:', exception.start_time);
      console.log('Setting end time to:', exception.end_time);
      setStartTime(exception.start_time);
      setEndTime(exception.end_time);
      setReason(exception.reason || '');
      setIsAllDay(exception.is_all_day || false);
      
      // Set dates for non-recurring exceptions
      if (!exception.is_recurring && exception.start_date && exception.end_date) {
        setStartDate(parseISO(exception.start_date));
        setEndDate(parseISO(exception.end_date));
      } else {
        setStartDate(undefined);
        setEndDate(undefined);
      }
    }
  }, [exception]);

  const handleSubmit = async () => {
    if (!exception) return;
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      // Validate that end time is not before start time
      const validation = validateTimeRange(startTime, endTime);
      if (!validation.isValid) {
        setError(validation.errorMessage || 'Invalid time range');
        setIsSubmitting(false);
        return;
      }
      
      // For non-recurring exceptions, validate dates
      if (!exception.is_recurring) {
        if (!startDate || !endDate) {
          setError('Please select both start and end dates');
          setIsSubmitting(false);
          return;
        }
        
        // Format dates as YYYY-MM-DD
        const formattedStartDate = format(startDate, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');
        
        await onSave(
          exception.id, 
          startTime, 
          endTime, 
          reason, 
          formattedStartDate, 
          formattedEndDate,
          isAllDay
        );
      } else {
        // For recurring exceptions, just pass the time and reason
        await onSave(exception.id, startTime, endTime, reason);
      }
      
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to convert time string to minutes for comparison
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  if (!exception) return null;

  // Generate title based on exception type
  let title = '';
  if (exception.is_recurring) {
    // For recurring exceptions, show the day of week
    const dayName = exception.day_of_week !== undefined 
      ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][exception.day_of_week] 
      : 'Unknown';
    title = `Edit Time Off for ${dayName}s`;
  } else {
    // For non-recurring exceptions, show the date range
    if (exception.start_date && exception.end_date) {
      // Fix timezone issues by parsing the date correctly
      const [startYear, startMonth, startDay] = exception.start_date.split('-').map(Number);
      const [endYear, endMonth, endDay] = exception.end_date.split('-').map(Number);
      
      const startDate = new Date(startYear, startMonth - 1, startDay);
      const endDate = new Date(endYear, endMonth - 1, endDay);
      
      // If it's a single day
      if (exception.start_date === exception.end_date) {
        title = `Edit Time Off for ${format(startDate, 'EEEE, MMMM do')}`;
      } else {
        // For multi-day time-offs
        title = `Edit Time Off for ${format(startDate, 'MMM do')} - ${format(endDate, 'MMM do, yyyy')}`;
      }
    } else {
      title = 'Edit Time Off for Unknown Date';
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Date Selection for non-recurring exceptions */}
          {!exception.is_recurring && (
            <div className="space-y-4">
              <DateRangeSelector
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                disablePastDates={false}
              />
              
              {/* All Day Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="isAllDay" 
                  checked={isAllDay} 
                  onCheckedChange={(checked) => {
                    setIsAllDay(checked === true);
                    if (checked) {
                      setStartTime('00:00');
                      setEndTime('23:59');
                    } else {
                      setStartTime('09:00');
                      setEndTime('17:00');
                    }
                  }}
                />
                <label 
                  htmlFor="isAllDay" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  All Day
                </label>
              </div>
            </div>
          )}
          
          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Time</label>
              <Select
                value={startTime}
                onValueChange={setStartTime}
                defaultValue={exception?.start_time || '09:00'}
                disabled={isAllDay}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select start time">
                    {formatTime(startTime)}
                  </SelectValue>
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
                defaultValue={exception?.end_time || '17:00'}
                disabled={isAllDay}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select end time">
                    {formatTime(endTime)}
                  </SelectValue>
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
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (Optional)</label>
            <Input 
              placeholder="e.g., Vacation, Doctor's appointment" 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        
        {error && (
          <div className="text-red-500 text-sm">{error}</div>
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTimeOffDialog; 