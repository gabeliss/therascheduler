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
import { TIME_OPTIONS, DAYS_OF_WEEK, BUSINESS_HOURS, validateTimeRange } from '../utils/time-utils';
import { format } from 'date-fns';
import { useUnifiedAvailability } from '@/app/hooks/use-unified-availability';

interface UnifiedExceptionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ExceptionFormValues) => Promise<void>;
  specificDate?: Date;
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
  const [isRecurringBlock, setIsRecurringBlock] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(specificDate || externalSelectedDate || undefined);
  const [selectedDay, setSelectedDay] = useState<number | undefined>(
    specificDate ? specificDate.getDay() : undefined
  );
  
  // For now, we're always creating new blocks, not editing
  const isEditing = false;
  
  const { checkForOverlaps } = useUnifiedAvailability();

  const form = useForm<ExceptionFormValues>({
    resolver: zodResolver(refinedExceptionSchema),
    defaultValues: {
      startTime: '09:00', // Default to 9:00 AM
      endTime: '17:00',   // Default to 5:00 PM
      reason: '',
      isRecurring: false,
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

  // Update form when recurring checkbox changes
  useEffect(() => {
    form.setValue('isRecurring', isRecurringBlock);
    
    // If we're switching to recurring mode and we have a specific date,
    // make sure the day of week is set from the specific date
    if (isRecurringBlock && specificDate && selectedDay === undefined) {
      setSelectedDay(specificDate.getDay());
    }
  }, [isRecurringBlock, form, specificDate, selectedDay]);

  // Reset form when dialog is closed
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setError(null);
      setIsRecurringBlock(false);
      setSelectedDay(specificDate ? specificDate.getDay() : undefined);
    }
  }, [isOpen, form, specificDate]);

  // Update state when dialog opens/closes or specificDate changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsRecurringBlock(false);
      setSelectedDate(specificDate || externalSelectedDate || undefined);
      setSelectedDay(specificDate ? specificDate.getDay() : undefined);
    }
  }, [isOpen, specificDate, externalSelectedDate]);

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
      if (!isRecurringBlock && !specificDate && !selectedDate) {
        setError('Please pick a specific date');
        setIsSubmitting(false);
        return;
      }
      
      if (isRecurringBlock && selectedDay === undefined) {
        setError('Please select a day of the week');
        setIsSubmitting(false);
        return;
      }
      
      // Prepare the form data
      const formData: ExceptionFormValues = {
        ...data,
        isRecurring: isRecurringBlock,
      };
      
      // Set the appropriate date or day of week
      if (isRecurringBlock) {
        formData.dayOfWeek = selectedDay;
      } else {
        // Use specificDate if provided, otherwise use selectedDate
        const dateToUse = specificDate || selectedDate;
        if (dateToUse) {
          const formattedDate = format(dateToUse, 'yyyy-MM-dd');
          formData.startDate = formattedDate;
          formData.endDate = formattedDate;
        }
      }
      
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
                : isRecurringBlock 
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
            
            {/* Block Weekly Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="blockWeekly" 
                checked={isRecurringBlock}
                onCheckedChange={(checked) => setIsRecurringBlock(checked === true)}
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
            {isRecurringBlock && !specificDate && (
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
            {!isRecurringBlock && !specificDate && (
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