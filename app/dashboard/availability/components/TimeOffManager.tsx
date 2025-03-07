import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { TIME_OPTIONS, DAYS_OF_WEEK } from '../utils/time-utils';
import { Checkbox } from '@/components/ui/checkbox';

// Schema for recurring time off
const recurringTimeOffSchema = z.object({
  type: z.literal('recurring'),
  days: z.array(z.string()).min(1, { message: 'Select at least one day' }),
  startTime: z.string(),
  endTime: z.string(),
  reason: z.string().optional(),
}).refine(data => {
  const startIndex = TIME_OPTIONS.findIndex(option => option.value === data.startTime);
  const endIndex = TIME_OPTIONS.findIndex(option => option.value === data.endTime);
  return endIndex > startIndex;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

// Schema for one-time time off
const oneTimeTimeOffSchema = z.object({
  type: z.literal('one-time'),
  startDate: z.date(),
  endDate: z.date(),
  startTime: z.string(),
  endTime: z.string(),
  reason: z.string().optional(),
}).refine(data => {
  const startIndex = TIME_OPTIONS.findIndex(option => option.value === data.startTime);
  const endIndex = TIME_OPTIONS.findIndex(option => option.value === data.endTime);
  return endIndex > startIndex;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
}).refine(data => {
  return data.endDate >= data.startDate;
}, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

// Define types directly without using the discriminated union
type RecurringTimeOffFormValues = z.infer<typeof recurringTimeOffSchema>;
type OneTimeTimeOffFormValues = z.infer<typeof oneTimeTimeOffSchema>;
type TimeOffFormValues = RecurringTimeOffFormValues | OneTimeTimeOffFormValues;

interface TimeOffManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitRecurring: (data: RecurringTimeOffFormValues) => Promise<void>;
  onSubmitOneTime: (data: OneTimeTimeOffFormValues) => Promise<void>;
}

const TimeOffManager = ({
  isOpen,
  onOpenChange,
  onSubmitRecurring,
  onSubmitOneTime,
}: TimeOffManagerProps) => {
  const [activeTab, setActiveTab] = useState<'recurring' | 'one-time'>('recurring');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form for recurring time off
  const recurringForm = useForm<RecurringTimeOffFormValues>({
    resolver: zodResolver(recurringTimeOffSchema),
    defaultValues: {
      type: 'recurring',
      days: [],
      startTime: '12:00', // Default to 12:00 PM
      endTime: '13:00',   // Default to 1:00 PM
      reason: '',
    },
  });

  // Form for one-time time off
  const oneTimeForm = useForm<OneTimeTimeOffFormValues>({
    resolver: zodResolver(oneTimeTimeOffSchema),
    defaultValues: {
      type: 'one-time',
      startDate: new Date(),
      endDate: new Date(),
      startTime: '12:00', // Default to 12:00 PM
      endTime: '13:00',   // Default to 1:00 PM
      reason: '',
    },
  });

  const handleSubmitRecurring = async (data: RecurringTimeOffFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmitRecurring(data);
      recurringForm.reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitOneTime = async (data: OneTimeTimeOffFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmitOneTime(data);
      oneTimeForm.reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Time Off</DialogTitle>
          <DialogDescription>
            Set up recurring breaks or schedule time off for specific dates.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'recurring' | 'one-time')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recurring">Regular Breaks</TabsTrigger>
            <TabsTrigger value="one-time">Time Off</TabsTrigger>
          </TabsList>

          {/* Recurring Time Off Tab */}
          <TabsContent value="recurring">
            <Form {...recurringForm}>
              <form onSubmit={recurringForm.handleSubmit(handleSubmitRecurring)} className="space-y-4">
                <div className="space-y-4">
                  <FormField
                    control={recurringForm.control}
                    name="days"
                    render={() => (
                      <FormItem>
                        <div className="mb-2">
                          <FormLabel>Days of Week</FormLabel>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <FormField
                              key={day}
                              control={recurringForm.control}
                              name="days"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={day}
                                    className="flex flex-row items-center space-x-2 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(day)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, day])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== day
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal">
                                      {day.substring(0, 3)}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={recurringForm.control}
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
                      control={recurringForm.control}
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

                  <FormField
                    control={recurringForm.control}
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
                </div>

                {error && <div className="text-red-500 text-sm">{error}</div>}

                <DialogFooter className="w-full">
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Regular Break'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          {/* One-Time Time Off Tab */}
          <TabsContent value="one-time">
            <Form {...oneTimeForm}>
              <form onSubmit={oneTimeForm.handleSubmit(handleSubmitOneTime)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={oneTimeForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <div className="border rounded-md p-2">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={oneTimeForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <div className="border rounded-md p-2">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={oneTimeForm.control}
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
                    control={oneTimeForm.control}
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

                <FormField
                  control={oneTimeForm.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Vacation, Doctor's appointment" {...field} />
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
                      'Save Time Off'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TimeOffManager; 