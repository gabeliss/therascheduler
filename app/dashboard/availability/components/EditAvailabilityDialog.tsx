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
import { TIME_OPTIONS, formatTime, validateTimeRange } from '../utils/time-utils';
import { TherapistAvailability } from '@/app/hooks/use-therapist-availability';

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
      console.log('Setting start time to:', availability.start_time);
      console.log('Setting end time to:', availability.end_time);
      setStartTime(availability.start_time);
      setEndTime(availability.end_time);
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
  if (availability.is_recurring) {
    // For recurring availability, show the day of week
    const dayName = availability.day_of_week !== undefined 
      ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][availability.day_of_week]
      : 'Unknown';
    title = `Edit Availability for ${dayName}s`;
  } else {
    // For non-recurring availability, show the date
    if (availability.specific_date) {
      const date = new Date(availability.specific_date + 'T00:00:00');
      title = `Edit Availability for ${format(date, 'EEEE, MMMM do')}`;
    } else {
      title = 'Edit Availability for Unknown Date';
    }
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