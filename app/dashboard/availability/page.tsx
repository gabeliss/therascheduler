'use client';

import { useAvailability } from '@/app/hooks/use-availability';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format, addDays, startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// Generate time options in 15-minute increments with AM/PM format
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const displayTime = format(new Date(2024, 0, 1, hour, minute), 'h:mm a');
  return { value: time, label: displayTime };
});

const availabilitySchema = z.object({
  type: z.enum(['recurring', 'specific']),
  days: z.array(z.string()).optional(),
  date: z.date().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  isAvailable: z.boolean().default(true),
});

// Define the type after the schema
type AvailabilityFormValues = z.infer<typeof availabilitySchema>;

// Add refinements after the type is defined
const refinedSchema = availabilitySchema.refine(
  (data) => {
    if (data.type === 'recurring') {
      return !!(data.days && data.days.length > 0);
    }
    return true;
  },
  {
    message: 'Select at least one day',
    path: ['days'],
  }
).refine(
  (data) => {
    if (data.type === 'specific') {
      return !!data.date;
    }
    return true;
  },
  {
    message: 'Select a specific date',
    path: ['date'],
  }
);

export default function AvailabilityPage() {
  const { availability, loading, error, addAvailability, deleteAvailability } = useAvailability();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(refinedSchema),
    defaultValues: {
      type: 'recurring',
      days: [],
      startTime: '',
      endTime: '',
      isAvailable: true,
    },
  });

  const formType = form.watch('type');

  const onSubmit = async (data: AvailabilityFormValues) => {
    try {
      if (data.type === 'recurring' && data.days && data.days.length > 0) {
        // Handle recurring availability
        await Promise.all(
          data.days.map((day: string) =>
            addAvailability({
              dayOfWeek: parseInt(day),
              startTime: data.startTime,
              endTime: data.endTime,
              isRecurring: true,
            })
          )
        );
      } else if (data.type === 'specific' && data.date) {
        // Handle specific date availability
        const dayOfWeek = data.date.getDay();
        await addAvailability({
          dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          isRecurring: false,
          specificDate: format(data.date, 'yyyy-MM-dd'),
        });
      }
      
      setIsDialogOpen(false);
      form.reset();
    } catch (err) {
      console.error('Failed to add availability:', err);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      } else {
        console.error('Unknown error type:', typeof err);
        console.error('Error stringified:', JSON.stringify(err));
      }
      // TODO: Add toast notification for error
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAvailability(id);
    } catch (err) {
      console.error('Failed to delete availability:', err);
      // TODO: Add toast notification for error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500">
        Error loading availability: {error}
      </div>
    );
  }

  // Get the start of the week for the selected date
  const weekStart = selectedDate ? startOfWeek(selectedDate) : startOfWeek(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Availability</h1>
      
      <div className="flex space-x-6">
        <div className="w-[350px] bg-card rounded-lg border p-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border shadow"
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
        </div>

        <div className="flex-1 space-y-6">
          <div className="flex justify-between items-center">
            <div className="text-lg font-medium">
              Week of {format(weekStart, 'MMMM d, yyyy')}
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Slot
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Availability</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Schedule Type</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex space-x-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="recurring" id="recurring" />
                                <label htmlFor="recurring" className="cursor-pointer">Weekly Schedule</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="specific" id="specific" />
                                <label htmlFor="specific" className="cursor-pointer">Specific Date</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isAvailable"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Availability Type</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value: string) => field.onChange(value === 'available')}
                              defaultValue={field.value ? 'available' : 'unavailable'}
                              className="flex space-x-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="available" id="available" />
                                <label htmlFor="available" className="cursor-pointer">Available</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="unavailable" id="unavailable" />
                                <label htmlFor="unavailable" className="cursor-pointer">Unavailable (Time Off)</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {formType === 'recurring' ? (
                      <FormField
                        control={form.control}
                        name="days"
                        render={() => (
                          <FormItem>
                            <FormLabel>Days of Week</FormLabel>
                            <div className="grid grid-cols-2 gap-2">
                              {DAYS_OF_WEEK.map((day, index) => (
                                <FormField
                                  key={day}
                                  control={form.control}
                                  name="days"
                                  render={({ field }) => (
                                    <FormItem
                                      key={day}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(index.toString())}
                                          onCheckedChange={(checked: boolean) => {
                                            const currentValue = field.value || [];
                                            if (checked) {
                                              field.onChange([...currentValue, index.toString()]);
                                            } else {
                                              field.onChange(
                                                currentValue.filter((value: string) => value !== index.toString())
                                              );
                                            }
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">{day}</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ) : (
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Specific Date</FormLabel>
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              className="rounded-md border"
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="h-[200px]">
                                {TIME_OPTIONS.map((time) => (
                                  <SelectItem key={time.value} value={time.value}>
                                    {time.label}
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="h-[200px]">
                                {TIME_OPTIONS.map((time) => (
                                  <SelectItem key={time.value} value={time.value}>
                                    {time.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Add Time Slot
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4">
            {weekDays.map((date, index) => {
              const daySlots = availability.filter((slot) => slot.day_of_week === date.getDay());
              const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
              return (
                <div 
                  key={date.toISOString()} 
                  className={cn(
                    "p-4 border rounded-lg",
                    isPast && "opacity-50"
                  )}
                >
                  <h2 className="font-semibold mb-2">
                    {format(date, 'EEEE, MMMM d')}
                  </h2>
                  {daySlots.length === 0 ? (
                    <p className="text-sm text-gray-500">No time slots available</p>
                  ) : (
                    <div className="space-y-2">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div>
                            <span className="font-medium">
                              {format(new Date(`2024-01-01T${slot.start_time}`), 'h:mm a')} - {format(new Date(`2024-01-01T${slot.end_time}`), 'h:mm a')}
                            </span>
                            {!slot.is_recurring && (
                              <span className="ml-2 text-sm text-gray-500">(One-time)</span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(slot.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
} 