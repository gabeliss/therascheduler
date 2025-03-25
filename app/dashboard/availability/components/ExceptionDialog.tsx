import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { ExceptionFormValues, refinedExceptionSchema } from '../utils/schemas';
import { format } from 'date-fns';

// Import from the new modular structure
import { TIME_OPTIONS } from '../utils/time/format';
import { validateTimeRange } from '../utils/time/calculations';
import { createRecurrenceString, DayOfWeek } from '@/app/utils/schema-converters';
import { Calendar } from '@/components/ui/calendar';

interface ExceptionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  baseId: string | null;
  baseStartTime: string;
  baseEndTime: string;
  selectedDate?: Date;
  onSubmit: (data: ExceptionFormValues & { start_time: string, end_time: string }) => Promise<void>;
}

const ExceptionDialog = ({ 
  isOpen, 
  onOpenChange, 
  baseId, 
  baseStartTime, 
  baseEndTime,
  selectedDate: externalSelectedDate,
  onSubmit 
}: ExceptionDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRecurrence, setUseRecurrence] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(externalSelectedDate || undefined);
  const [selectedDay, setSelectedDay] = useState<number | undefined>(undefined);

  const form = useForm<ExceptionFormValues>({
    resolver: zodResolver(refinedExceptionSchema),
    defaultValues: {
      startTime: baseStartTime || '12:00',
      endTime: baseEndTime || '12:00',
      reason: '',
      recurrence: null
    },
  });

  // Watch for changes to start/end time
  const startTime = form.watch('startTime');
  const endTime = form.watch('endTime');

  // Reset form when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setError(null);
      setUseRecurrence(false);
      setSelectedDay(undefined);
    }
  }, [isOpen, form]);

  // Update state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setUseRecurrence(false);
      setSelectedDate(externalSelectedDate || undefined);
      setSelectedDay(undefined);
    }
  }, [isOpen, externalSelectedDate]);

  const handleSubmit = async (data: ExceptionFormValues) => {
    if (!baseId) {
      setError('No time slot selected. Please try again.');
      return;
    }

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
      if (!useRecurrence && !selectedDate) {
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
      } else {
        // Use current date for recurring blocks when no specific date is set
        const today = format(new Date(), 'yyyy-MM-dd');
        start_time = `${today}T${data.startTime}:00`;
        end_time = `${today}T${data.endTime}:00`;
      }

      await onSubmit({
        ...data,
        recurrence,
        start_time,
        end_time
      });
      
      form.reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format the date for display
  const formattedDate = selectedDate 
    ? format(selectedDate, 'EEEE, MMMM d, yyyy')
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {formattedDate ? `Block Time on ${formattedDate}` : 'Add Time Off'}
          </DialogTitle>
          <DialogDescription>
            Block time for a specific date or set it to repeat weekly.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Block Weekly Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="useRecurrence" 
                checked={useRecurrence}
                onCheckedChange={(checked) => setUseRecurrence(checked === true)}
              />
              <label 
                htmlFor="useRecurrence" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Block Weekly
              </label>
            </div>
            
            {/* Day Selection for Recurring */}
            {useRecurrence && (
              <FormItem>
                <FormLabel>Day of Week</FormLabel>
                <Select
                  value={selectedDay?.toString()}
                  onValueChange={(value) => setSelectedDay(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
            
            {/* Date Selection for Specific */}
            {!useRecurrence && (
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
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Lunch break, Meeting" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="flex justify-center gap-4 mt-6 pt-2 sm:justify-center">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
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

export default ExceptionDialog; 