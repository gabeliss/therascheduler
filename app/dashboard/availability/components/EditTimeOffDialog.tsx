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
import { TimeOff } from '@/app/types/index';
import { getDaysOfWeekFromRecurrence, DayOfWeek } from '@/app/utils/schema-converters';

// Import from the new modular structure
import { TIME_OPTIONS, formatTime } from '../utils/time/format';
import { validateTimeRange, timeToMinutes } from '../utils/time/calculations';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import DateRangeSelector from './DateRangeSelector';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAppointments } from '@/app/hooks/use-appointments';
import { checkTimeOffAppointmentClash } from '../utils/appointment-utils';

interface EditTimeOffDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  exception: TimeOff | null;
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
  const [appointmentClashError, setAppointmentClashError] = useState<string | null>(null);
  
  const { appointments, loading: appointmentsLoading } = useAppointments();

  // Helper to determine if a time-off is all-day based on timestamps
  const isAllDayTimeOff = (start_time: string, end_time: string): boolean => {
    try {
      const startDate = new Date(start_time);
      const endDate = new Date(end_time);
      
      const startHours = startDate.getHours();
      const startMinutes = startDate.getMinutes();
      const endHours = endDate.getHours();
      const endMinutes = endDate.getMinutes();
      
      // Consider it all-day if it starts at/before 00:10 and ends at/after 23:50
      return (startHours === 0 && startMinutes <= 10) && 
             (endHours === 23 && endMinutes >= 50);
    } catch (error) {
      return false;
    }
  };

  // Extract time part from ISO timestamp
  const extractTimeFromTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch (error) {
      return '00:00';
    }
  };

  // Extract date part from ISO timestamp
  const extractDateFromTimestamp = (timestamp: string): Date | undefined => {
    try {
      return new Date(timestamp);
    } catch (error) {
      return undefined;
    }
  };

  // Reset form when exception changes
  useEffect(() => {
    if (exception) {
      console.log('EditTimeOffDialog - exception changed:', exception);
      console.log('Setting start time to:', exception.start_time);
      console.log('Setting end time to:', exception.end_time);
      
      // Extract time parts from timestamps
      setStartTime(extractTimeFromTimestamp(exception.start_time));
      setEndTime(extractTimeFromTimestamp(exception.end_time));
      setReason(exception.reason || '');
      
      // Determine if all-day from timestamps
      setIsAllDay(isAllDayTimeOff(exception.start_time, exception.end_time));
      
      // Set dates for non-recurring exceptions
      if (!exception.recurrence) {
        const startDateObj = extractDateFromTimestamp(exception.start_time);
        const endDateObj = extractDateFromTimestamp(exception.end_time);
        setStartDate(startDateObj);
        setEndDate(endDateObj);
      } else {
        setStartDate(undefined);
        setEndDate(undefined);
      }
    }
  }, [exception]);

  // Check for appointment clashes when form values change
  useEffect(() => {
    // Only check if we have appointments, the dialog is open, and we have an exception
    if (!appointmentsLoading && appointments.length > 0 && isOpen && exception) {
      checkForAppointmentClashes();
    }
  }, [startTime, endTime, isAllDay, startDate, endDate, appointments, appointmentsLoading, isOpen, exception]);

  // Function to check for appointment clashes
  const checkForAppointmentClashes = () => {
    // Clear previous error
    setAppointmentClashError(null);
    
    // Skip if appointments are still loading or no exception
    if (appointmentsLoading || !exception) return;
    
    // Prepare data for clash check
    let formattedStartDate, formattedEndDate;
    
    if (!exception.recurrence && startDate && endDate) {
      formattedStartDate = format(startDate, 'yyyy-MM-dd');
      formattedEndDate = format(endDate, 'yyyy-MM-dd');
    } else if (!exception.recurrence) {
      const startDateObj = new Date(exception.start_time);
      const endDateObj = new Date(exception.end_time);
      formattedStartDate = format(startDateObj, 'yyyy-MM-dd');
      formattedEndDate = format(endDateObj, 'yyyy-MM-dd');
    }
    
    // Get day of week for recurring time-off
    let dayOfWeek: number | undefined;
    if (exception.recurrence) {
      const daysOfWeek = getDaysOfWeekFromRecurrence(exception.recurrence);
      dayOfWeek = daysOfWeek.length > 0 ? daysOfWeek[0] : undefined;
    }
    
    // Check for clashes
    const clash = checkTimeOffAppointmentClash({
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      startTime: `${startTime}`,
      endTime: `${endTime}`,
      isRecurring: !!exception.recurrence,
      dayOfWeek,
      isAllDay,
      appointments
    });
    
    // Set error message if there's a clash
    if (clash) {
      setAppointmentClashError(clash.message);
    }
  };

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
      if (!exception.recurrence) {
        if (!startDate || !endDate) {
          setError('Please select both start and end dates');
          setIsSubmitting(false);
          return;
        }
        
        // Format dates as YYYY-MM-DD
        const formattedStartDate = format(startDate, 'yyyy-MM-dd');
        const formattedEndDate = format(endDate, 'yyyy-MM-dd');
        
        // Check for appointment clashes
        const clash = checkTimeOffAppointmentClash({
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          startTime,
          endTime,
          isRecurring: false,
          isAllDay,
          appointments
        });
        
        if (clash) {
          setError(clash.message);
          setIsSubmitting(false);
          return;
        }
        
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
        // Get day of week for recurring time-off
        let dayOfWeek: number | undefined;
        if (exception.recurrence) {
          const daysOfWeek = getDaysOfWeekFromRecurrence(exception.recurrence);
          dayOfWeek = daysOfWeek.length > 0 ? daysOfWeek[0] : undefined;
        }
        
        // For recurring exceptions, check for appointment clashes
        const clash = checkTimeOffAppointmentClash({
          startTime,
          endTime,
          isRecurring: true,
          dayOfWeek,
          isAllDay,
          appointments
        });
        
        if (clash) {
          setError(clash.message);
          setIsSubmitting(false);
          return;
        }
        
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

  if (!exception) return null;

  // Generate title based on exception type
  let title = '';
  if (exception.recurrence) {
    // For recurring exceptions, show the day of week
    const daysOfWeek = getDaysOfWeekFromRecurrence(exception.recurrence);
    if (daysOfWeek.length === 1) {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][daysOfWeek[0]];
      title = `Edit Time Off for ${dayName}s`;
    } else if (daysOfWeek.length > 0) {
      const dayNames = daysOfWeek.map(day => 
        ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]
      );
      title = `Edit Time Off for ${dayNames.join(', ')}`;
    } else {
      title = 'Edit Recurring Time Off';
    }
  } else {
    // For non-recurring exceptions, show the date range
    const startDateObj = new Date(exception.start_time);
    const endDateObj = new Date(exception.end_time);
    
    const startDateStr = format(startDateObj, 'yyyy-MM-dd');
    const endDateStr = format(endDateObj, 'yyyy-MM-dd');
    
    // If it's a single day
    if (startDateStr === endDateStr) {
      title = `Edit Time Off for ${format(startDateObj, 'EEEE, MMMM do')}`;
    } else {
      // For multi-day time-offs
      title = `Edit Time Off for ${format(startDateObj, 'MMM do')} - ${format(endDateObj, 'MMM do, yyyy')}`;
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Display error message if there is one */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Display appointment clash warning */}
          {appointmentClashError && !error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {appointmentClashError}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Date Selection for non-recurring exceptions */}
          {!exception.recurrence && (
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
            disabled={isSubmitting || !!appointmentClashError}
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