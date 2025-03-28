import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TherapistAvailability } from '@/app/hooks/use-therapist-availability';
import { getDaysOfWeekFromRecurrence, DayOfWeek } from '@/app/utils/schema-converters';

// Import from the new modular structure
import { TIME_OPTIONS, formatTime } from '../utils/time/format';
import { validateTimeRange } from '../utils/time/calculations';

interface EditAvailabilityDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  availability: TherapistAvailability | null;
  onSave: (id: string, startTime: string, endTime: string) => Promise<void>;
}

const EditAvailabilityDialog = ({
  isOpen,
  onOpenChange,
  availability,
  onSave,
}: EditAvailabilityDialogProps) => {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when availability changes
  useEffect(() => {
    if (availability) {
      console.log('EditAvailabilityDialog - availability changed:', availability);
      
      // Extract the time portions from ISO timestamps
      let startTimeValue = '';
      let endTimeValue = '';
      
      if (typeof availability.start_time === 'string') {
        if (availability.start_time.includes('T')) {
          // Extract HH:MM from ISO timestamp
          const match = availability.start_time.match(/T(\d{2}:\d{2})/);
          if (match && match[1]) {
            startTimeValue = match[1];
          } else {
            // Fallback: just use the first 5 chars after T
            startTimeValue = availability.start_time.split('T')[1]?.substring(0, 5) || '09:00';
          }
        } else {
          // If it's already just a time string
          startTimeValue = availability.start_time.substring(0, 5);
        }
      }
      
      if (typeof availability.end_time === 'string') {
        if (availability.end_time.includes('T')) {
          // Extract HH:MM from ISO timestamp
          const match = availability.end_time.match(/T(\d{2}:\d{2})/);
          if (match && match[1]) {
            endTimeValue = match[1];
          } else {
            // Fallback: just use the first 5 chars after T
            endTimeValue = availability.end_time.split('T')[1]?.substring(0, 5) || '17:00';
          }
        } else {
          // If it's already just a time string
          endTimeValue = availability.end_time.substring(0, 5);
        }
      }
      
      console.log('Setting extracted start time to:', startTimeValue);
      console.log('Setting extracted end time to:', endTimeValue);
      
      // Validate and set times
      if (startTimeValue && startTimeValue.match(/^\d{2}:\d{2}$/)) {
        setStartTime(startTimeValue);
      } else {
        console.warn('Invalid start time format, using default:', availability.start_time);
        setStartTime('09:00');
      }
      
      if (endTimeValue && endTimeValue.match(/^\d{2}:\d{2}$/)) {
        setEndTime(endTimeValue);
      } else {
        console.warn('Invalid end time format, using default:', availability.end_time);
        setEndTime('17:00');
      }
    }
  }, [availability]);

  const handleSubmit = async () => {
    if (!availability) return;
    
    setError(null);
    
    // Validate time range
    const validation = validateTimeRange(startTime, endTime);
    if (!validation.isValid) {
      setError(validation.errorMessage || 'Invalid time range');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSave(availability.id, startTime, endTime);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!availability) return null;

  // Generate title based on availability type
  let title = '';
  if (availability.recurrence) {
    // For recurring availability, show the days of week
    const daysOfWeek = getDaysOfWeekFromRecurrence(availability.recurrence);
    // Convert day numbers to names and join them
    const dayNames = daysOfWeek.map(day => 
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]
    );
    
    if (dayNames.length === 1) {
      title = `Edit Availability for ${dayNames[0]}s`;
    } else if (dayNames.length > 0) {
      const lastDay = dayNames.pop();
      title = `Edit Availability for ${dayNames.join(', ')} and ${lastDay}s`;
    } else {
      title = 'Edit Recurring Availability';
    }
  } else {
    // For non-recurring availability, show the date
    const date = new Date(availability.start_time);
    title = `Edit Availability for ${format(date, 'EEEE, MMMM do')}`;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Time</label>
              <Select
                value={startTime}
                onValueChange={setStartTime}
                defaultValue={availability?.start_time || '09:00'}
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
                defaultValue={availability?.end_time || '17:00'}
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

export default EditAvailabilityDialog; 