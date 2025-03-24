import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, AlertCircle, Clock, Calendar as CalendarIcon, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { ExceptionFormValues, refinedExceptionSchema } from '../utils/schemas';
import { format } from 'date-fns';
import { useUnifiedAvailability } from '@/app/hooks/use-unified-availability';
import { useAppointments } from '@/app/hooks/use-appointments';
import { createRecurrenceString, DayOfWeek } from '@/app/utils/schema-converters';

// Import from the new modular structure
import { DAYS_OF_WEEK, BUSINESS_HOURS } from '../utils/time/types';
import { TIME_OPTIONS } from '../utils/time/format';
import { validateTimeRange } from '../utils/time/calculations';
import { checkTimeOffAppointmentClash } from '../utils/appointment-utils';

interface UnifiedExceptionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ExceptionFormValues & { start_time?: string, end_time?: string }) => Promise<void>;
  specificDate?: Date; // Still needed for backward compatibility with calling components
  selectedDate?: Date | null;
}

const UnifiedExceptionDialog = ({ 
  isOpen, 
  onOpenChange, 
  specificDate,
  onSubmit,
  selectedDate: externalSelectedDate
}: UnifiedExceptionDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRecurrence, setUseRecurrence] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(specificDate || externalSelectedDate || undefined);
  const [selectedDay, setSelectedDay] = useState<number | undefined>(
    specificDate ? specificDate.getDay() : undefined
  );
  const [appointmentClashError, setAppointmentClashError] = useState<string | null>(null);
  
  // For now, we're always creating new blocks, not editing
  const isEditing = false;
  
  const { checkForOverlaps } = useUnifiedAvailability();
  const { appointments, loading: appointmentsLoading } = useAppointments();

  const form = useForm<ExceptionFormValues>({
    resolver: zodResolver(refinedExceptionSchema),
    defaultValues: {
      startTime: '09:00', // Default to 9:00 AM
      endTime: '17:00',   // Default to 5:00 PM
      reason: '',
      recurrence: null
    },
  });

  // Apply time presets (similar to BaseAvailabilityForm)
  const applyTimePreset = (preset: 'fullDay' | 'morning' | 'afternoon') => {
    switch (preset) {
      case 'fullDay':
        form.setValue('startTime', '09:00');
        form.setValue('endTime', '17:00');
        break;
      case 'morning':
        form.setValue('startTime', '09:00');
        form.setValue('endTime', '12:00');
        break;
      case 'afternoon':
        form.setValue('startTime', '13:00');
        form.setValue('endTime', '17:00');
        break;
    }
  };

  // Watch for changes to start/end time to check for overlaps
  const startTime = form.watch('startTime');
  const endTime = form.watch('endTime');

  // Reset form when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setError(null);
      setUseRecurrence(false);
      setSelectedDay(specificDate ? specificDate.getDay() : undefined);
    }
  }, [isOpen, form, specificDate]);

  // Update state when dialog opens/closes or specificDate changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setUseRecurrence(false);
      setSelectedDate(specificDate || externalSelectedDate || undefined);
      setSelectedDay(specificDate ? specificDate.getDay() : undefined);
    }
  }, [isOpen, specificDate, externalSelectedDate]);

  // Check for appointment clashes when form values change
  useEffect(() => {
    // Only check if we have appointments and the dialog is open
    if (!appointmentsLoading && appointments.length > 0 && isOpen) {
      checkForAppointmentClashes();
    }
  }, [startTime, endTime, useRecurrence, selectedDay, selectedDate, appointments, appointmentsLoading, isOpen]);

  // Function to check for appointment clashes
  const checkForAppointmentClashes = () => {
    // Clear previous error
    setAppointmentClashError(null);
    
    // Skip if appointments are still loading
    if (appointmentsLoading) return;
    
    // Create recurrence string if it's a recurring block
    const recurrence = useRecurrence && selectedDay !== undefined 
      ? createRecurrenceString([selectedDay as DayOfWeek]) 
      : null;
    
    // Create full ISO timestamps
    let start_time, end_time;
    
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      start_time = `${dateStr}T${startTime}:00`;
      end_time = `${dateStr}T${endTime}:00`;
    } else if (specificDate) {
      const dateStr = format(specificDate, 'yyyy-MM-dd');
      start_time = `${dateStr}T${startTime}:00`;
      end_time = `${dateStr}T${endTime}:00`;
    } else {
      // Use current date for recurring blocks when no specific date is set
      const today = format(new Date(), 'yyyy-MM-dd');
      start_time = `${today}T${startTime}:00`;
      end_time = `${today}T${endTime}:00`;
    }
    
    // Modified clash check to use the new parameters
    const clash = checkTimeOffAppointmentClash({
      start_time,
      end_time,
      recurrence,
      appointments
    });
    
    // Set error message if there's a clash
    if (clash) {
      setAppointmentClashError(clash.message);
    }
  };

  const handleSubmit = async (data: ExceptionFormValues) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Validate that end time is not before start time
      const validation = validateTimeRange(data.startTime, data.endTime);
      if (!validation.isValid) {
        setError(validation.errorMessage || 'Invalid time range');
        setIsSubmitting(false);
        return;
      }
      
      // Validate that we have either a selected date or a day of week
      if (!useRecurrence && !specificDate && !selectedDate) {
        setError('Please pick a specific date');
        setIsSubmitting(false);
        return;
      }
      
      if (useRecurrence && selectedDay === undefined) {
        setError('Please select a day of the week');
        setIsSubmitting(false);
        return;
      }
      
      // Create recurrence string if it's a recurring block
      const recurrence = useRecurrence && selectedDay !== undefined 
        ? createRecurrenceString([selectedDay as DayOfWeek]) 
        : null;
      
      // Create full ISO timestamps
      let start_time, end_time;
      
      if (!useRecurrence && selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        start_time = `${dateStr}T${data.startTime}:00`;
        end_time = `${dateStr}T${data.endTime}:00`;
      } else if (!useRecurrence && specificDate) {
        const dateStr = format(specificDate, 'yyyy-MM-dd');
        start_time = `${dateStr}T${data.startTime}:00`;
        end_time = `${dateStr}T${data.endTime}:00`;
      } else {
        // Use current date for recurring blocks when no specific date is set
        const today = format(new Date(), 'yyyy-MM-dd');
        start_time = `${today}T${data.startTime}:00`;
        end_time = `${today}T${data.endTime}:00`;
      }
      
      // Modified clash check to use the new parameters
      const clash = checkTimeOffAppointmentClash({
        start_time,
        end_time,
        recurrence,
        appointments
      });
      
      if (clash) {
        setError(clash.message);
        setIsSubmitting(false);
        return;
      }
      
      // Prepare the form data with new schema fields
      const formData = {
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
        recurrence,
        skipToast: data.skipToast,
        skipOverlapCheck: data.skipOverlapCheck,
        isBatchOperation: data.isBatchOperation,
        // Add these for API calls but they won't be in the form schema
        start_time,
        end_time
      };
      
      await onSubmit(formData);
      
      // Close the dialog after successful submission
      onOpenChange(false);
      
    } catch (err) {
      console.error('Error submitting exception:', err);
      setError('Failed to save time off. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate title based on the date or recurring setting
  const getDialogTitle = () => {
    if (specificDate) {
      const dayName = format(specificDate, 'EEEE');
      const dateStr = format(specificDate, 'MMMM do');
      return `Block Time for ${dayName}, ${dateStr}`;
    }
    return 'Add Time Off';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Time Off' : 
              specificDate 
                ? `Block Time for ${format(specificDate, 'EEEE, MMMM d')}`
                : useRecurrence 
                  ? 'Block Weekly Time' 
                  : 'Block Time Off'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Make changes to your time off.' : 'Add a new time off block to your schedule.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
            
            {/* Block Weekly Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="blockWeekly" 
                checked={useRecurrence}
                onCheckedChange={(checked) => setUseRecurrence(checked === true)}
              />
              <label 
                htmlFor="blockWeekly" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Block Weekly
                {specificDate && (
                  <span className="text-gray-500 ml-1">
                    (Every {format(specificDate, 'EEEE')})
                  </span>
                )}
              </label>
            </div>
            
            {/* Day Selection for Recurring - Only show if specificDate is not provided */}
            {useRecurrence && !specificDate && (
              <div className="space-y-2">
                <FormLabel>Day of Week</FormLabel>
                <Select
                  value={selectedDay?.toString()}
                  onValueChange={(value) => setSelectedDay(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Date Selection for Specific - Only show if specificDate is not provided */}
            {!useRecurrence && !specificDate && (
              <div className="space-y-2">
                <FormLabel>Date</FormLabel>
                <div className="border rounded-md p-1">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </div>
              </div>
            )}
            
            {/* Time Selection */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select start time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {TIME_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select end time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {TIME_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Reason Field */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Vacation, Lunch break, Meeting" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex justify-center gap-4 mt-6 pt-2 sm:justify-center">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="min-w-[100px]">
                  Cancel
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Time Off'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedExceptionDialog; 