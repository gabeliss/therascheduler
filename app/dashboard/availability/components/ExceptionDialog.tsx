import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
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
import { ExceptionFormValues, refinedExceptionSchema } from '../utils/schemas';
import { TIME_OPTIONS } from '../utils/time-utils';
import { format } from 'date-fns';

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

  const form = useForm<ExceptionFormValues>({
    resolver: zodResolver(refinedExceptionSchema),
    defaultValues: {
      startTime: '12:00', // Default to 12:00 PM (noon)
      endTime: '12:00',   // Default to 12:00 PM (noon)
      reason: '',
    },
  });

  const handleSubmit = async (data: ExceptionFormValues) => {
    if (!baseId) {
      setError('No time slot selected. Please try again.');
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
              This will only block time for this specific date.
            </DialogDescription>
          )}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <DialogFooter className="w-full">
              <Button type="submit" disabled={isSubmitting} className="w-full">
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