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
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Import from the new modular structure
import { TIME_OPTIONS } from '../utils/time/format';

interface ExceptionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  baseId: string | null;
  baseStartTime: string;
  baseEndTime: string;
  specificDate?: Date;
  onSubmit: (data: ExceptionFormValues) => Promise<void>;
}

const ExceptionDialog = ({ 
  isOpen, 
  onOpenChange, 
  baseId, 
  baseStartTime, 
  baseEndTime,
  specificDate,
  onSubmit 
}: ExceptionDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOverlap, setHasOverlap] = useState(false);
  const supabase = createClientComponentClient();

  const form = useForm<ExceptionFormValues>({
    resolver: zodResolver(refinedExceptionSchema),
    defaultValues: {
      startTime: '12:00', // Default to 12:00 PM (noon)
      endTime: '12:00',   // Default to 12:00 PM (noon)
      reason: '',
      isRecurring: false,
    },
  });

  // Watch for changes to start/end time to check for overlaps
  const startTime = form.watch('startTime');
  const endTime = form.watch('endTime');
  const isRecurring = form.watch('isRecurring');

  // Check for overlapping exceptions when times change
  useEffect(() => {
    const checkForOverlap = async () => {
      if (!baseId || !startTime || !endTime) return;
      
      try {
        // Get existing exceptions for this base availability
        const { data: exceptions, error } = await supabase
          .from('availability_exceptions')
          .select('*')
          .eq('base_availability_id', baseId);
          
        if (error) throw error;
        
        // Check if any existing exceptions overlap with the selected time range
        const overlaps = (exceptions || []).some((ex: any) => {
          return (
            (startTime >= ex.start_time && startTime < ex.end_time) ||
            (endTime > ex.start_time && endTime <= ex.end_time) ||
            (startTime <= ex.start_time && endTime >= ex.end_time)
          );
        });
        
        setHasOverlap(overlaps);
      } catch (err) {
        console.error('Error checking for overlaps:', err);
      }
    };
    
    checkForOverlap();
  }, [baseId, startTime, endTime, supabase]);

  const handleSubmit = async (data: ExceptionFormValues) => {
    if (!baseId) {
      setError('No time slot selected. Please try again.');
      return;
    }

    // Don't allow submission if there's an overlap (unless it's a recurring exception)
    if (hasOverlap && !isRecurring) {
      setError('This time range overlaps with an existing exception. Please choose a different time.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format the date for display
  const formattedDate = specificDate 
    ? format(specificDate, 'EEEE, MMMM d, yyyy')
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {formattedDate ? `Block Time on ${formattedDate}` : 'Add Time Off'}
          </DialogTitle>
          {formattedDate && (
            <DialogDescription>
              Block time for this specific date or set it to repeat weekly.
            </DialogDescription>
          )}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {hasOverlap && !isRecurring && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This time range overlaps with existing time off. Please choose a different time.
                </AlertDescription>
              </Alert>
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
            
            {specificDate && (
              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Repeat weekly</FormLabel>
                      <FormDescription>
                        Block this time every week, not just this specific date
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}
            
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <DialogFooter className="w-full">
              <Button 
                type="submit" 
                disabled={isSubmitting || (hasOverlap && !isRecurring)} 
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  formattedDate ? 'Block Time' : 'Save Time Off'
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