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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TIME_OPTIONS, formatTime } from '../utils/time-utils';
import { UnifiedAvailabilityException } from '@/app/types/index';

interface EditTimeOffDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  exception: UnifiedAvailabilityException | null;
  onSave: (id: string, startTime: string, endTime: string, reason: string) => Promise<void>;
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
    }
  }, [exception]);

  const handleSubmit = async () => {
    if (!exception) return;
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      await onSave(exception.id, startTime, endTime, reason);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!exception) return null;

  const title = exception.is_recurring
    ? `Edit Time Off for ${exception.day_of_week !== undefined ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][exception.day_of_week] : 'Unknown'}s`
    : `Edit Time Off for ${exception.specific_date ? format(new Date(exception.specific_date + 'T00:00:00'), 'EEEE, MMMM do') : 'Unknown Date'}`;

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
                defaultValue={exception?.start_time || '09:00'}
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