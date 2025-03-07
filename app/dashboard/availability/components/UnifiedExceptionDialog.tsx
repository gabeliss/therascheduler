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
import { TIME_OPTIONS, DAYS_OF_WEEK, BUSINESS_HOURS } from '../utils/time-utils';
import { format } from 'date-fns';
import { useUnifiedAvailability } from '@/app/hooks/use-unified-availability';

interface UnifiedExceptionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  specificDate?: Date;
  onSubmit: (data: ExceptionFormValues) => Promise<void>;
}

const UnifiedExceptionDialog = ({ 
  isOpen, 
  onOpenChange, 
  specificDate,
  onSubmit 
}: UnifiedExceptionDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOverlap, setHasOverlap] = useState(false);
  const [type, setType] = useState<'recurring' | 'specific'>(specificDate ? 'specific' : 'recurring');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(specificDate);
  const [selectedDay, setSelectedDay] = useState<number | undefined>(specificDate ? specificDate.getDay() : undefined);
  
  const { checkForOverlaps } = useUnifiedAvailability();

  const form = useForm<ExceptionFormValues>({
    resolver: zodResolver(refinedExceptionSchema),
    defaultValues: {
      startTime: '09:00', // Default to 9:00 AM
      endTime: '17:00',   // Default to 5:00 PM
      reason: '',
      isRecurring: type === 'recurring',
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
  const isRecurring = form.watch('isRecurring');

  // Update form when type changes
  useEffect(() => {
    form.setValue('isRecurring', type === 'recurring');
  }, [type, form]);

  // Check for overlapping exceptions when times change
  useEffect(() => {
    if (!startTime || !endTime) return;
    
    let dayOfWeek: number | undefined;
    let formattedDate: string | undefined;
    
    if (type === 'recurring') {
      dayOfWeek = selectedDay;
    } else if (selectedDate) {
      formattedDate = format(selectedDate, 'yyyy-MM-dd');
    }
    
    if ((type === 'recurring' && dayOfWeek === undefined) || 
        (type === 'specific' && !formattedDate)) {
      return;
    }
    
    // Check for overlaps
    const overlaps = checkForOverlaps(
      startTime,
      endTime,
      type === 'recurring',
      type === 'recurring' ? dayOfWeek : undefined,
      type === 'specific' ? formattedDate : undefined
    );
    
    setHasOverlap(overlaps);
  }, [startTime, endTime, type, selectedDay, selectedDate, checkForOverlaps]);

  const handleSubmit = async (data: ExceptionFormValues) => {
    // Don't allow submission if there's an overlap
    if (hasOverlap) {
      setError('This time range overlaps with an existing exception. Please choose a different time.');
      return;
    }

    // Validate that we have the necessary data
    if (type === 'recurring' && selectedDay === undefined) {
      setError('Please select a day of the week');
      return;
    }

    if (type === 'specific' && !selectedDate) {
      setError('Please select a specific date');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Add day of week or specific date to the form data
      const formData = {
        ...data,
        isRecurring: type === 'recurring',
        dayOfWeek: type === 'recurring' ? selectedDay : undefined,
        specificDate: type === 'specific' && selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
      };

      await onSubmit(formData);
      form.reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Add Time Off
          </DialogTitle>
          <DialogDescription>
            Block time off from your schedule
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {hasOverlap && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This time range overlaps with existing time off. Please choose a different time.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Type Selection */}
            <div className="space-y-2">
              <FormLabel>Type</FormLabel>
              <RadioGroup 
                value={type} 
                onValueChange={(value) => setType(value as 'recurring' | 'specific')}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="recurring" id="recurring" />
                  <label htmlFor="recurring" className="cursor-pointer">Recurring (weekly)</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific" id="specific" />
                  <label htmlFor="specific" className="cursor-pointer">Specific Date</label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Day Selection for Recurring */}
            {type === 'recurring' && (
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
            
            {/* Date Selection for Specific */}
            {type === 'specific' && (
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
            
            {error && <div className="text-red-500 text-sm">{error}</div>}
            
            <DialogFooter className="flex justify-center gap-4 mt-6 pt-2 sm:justify-center">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="min-w-[100px]">
                  Cancel
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={isSubmitting || hasOverlap}
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