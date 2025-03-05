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
  FormDescription,
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
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

// Generate time options in 15-minute increments with AM/PM format
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  const displayTime = format(new Date(2024, 0, 1, hour, minute), 'h:mm a');
  return { value: time, label: displayTime };
});

// Business hours presets (8am to 6pm)
const BUSINESS_HOURS = {
  DEFAULT_START: '08:00', // 8:00 AM
  DEFAULT_END: '18:00',   // 6:00 PM
  MORNING_START: '08:00', // 8:00 AM
  MORNING_END: '12:00',   // 12:00 PM
  AFTERNOON_START: '13:00', // 1:00 PM
  AFTERNOON_END: '17:00',   // 5:00 PM
};

// Find the index of a time in the TIME_OPTIONS array
const findTimeIndex = (time: string) => {
  return TIME_OPTIONS.findIndex(option => option.value === time);
};

const availabilitySchema = z.object({
  type: z.enum(['recurring', 'specific']),
  days: z.array(z.string()).optional(),
  date: z.date().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  isAvailable: z.boolean().default(true),
  reason: z.string().optional(),
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
).refine(
  (data) => {
    // Ensure end time is after start time
    if (data.startTime && data.endTime) {
      const startIndex = findTimeIndex(data.startTime);
      const endIndex = findTimeIndex(data.endTime);
      return endIndex > startIndex;
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
);

// Helper function to convert HH:MM time to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper function to check if two time slots overlap
function doTimeSlotsOverlap(
  startTime1: string,
  endTime1: string,
  startTime2: string,
  endTime2: string
): boolean {
  // Convert times to minutes since midnight for easier comparison
  const start1 = timeToMinutes(startTime1);
  const end1 = timeToMinutes(endTime1);
  const start2 = timeToMinutes(startTime2);
  const end2 = timeToMinutes(endTime2);
  
  // Check for overlap
  // Two time ranges overlap if the start of one is before the end of the other,
  // and the end of one is after the start of the other
  return start1 < end2 && end1 > start2;
}

export default function AvailabilityPage() {
  const { availability, loading, error, addAvailability, deleteAvailability } = useAvailability();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(refinedSchema),
    defaultValues: {
      type: 'recurring',
      days: [],
      startTime: BUSINESS_HOURS.DEFAULT_START,
      endTime: BUSINESS_HOURS.DEFAULT_END,
      isAvailable: true,
      reason: '',
    },
  });

  const formType = form.watch('type');
  const startTime = form.watch('startTime');
  const endTime = form.watch('endTime');
  const selectedDays = form.watch('days');
  const selectedSpecificDate = form.watch('date');

  // Reset form when dialog is opened
  useEffect(() => {
    if (isDialogOpen) {
      form.reset({
        type: 'recurring',
        days: [],
        startTime: BUSINESS_HOURS.DEFAULT_START,
        endTime: BUSINESS_HOURS.DEFAULT_END,
        isAvailable: true,
        reason: '',
      });
      setSubmitError(null);
      setSubmitSuccess(false);
      setOverlapWarning(null);
    }
  }, [isDialogOpen, form]);

  // Check for overlaps whenever relevant form fields change
  useEffect(() => {
    if (!availability || availability.length === 0) {
      setOverlapWarning(null);
      return;
    }

    // Only check if we have enough data to determine an overlap
    if (!startTime || !endTime) {
      setOverlapWarning(null);
      return;
    }

    if (formType === 'recurring' && (!selectedDays || selectedDays.length === 0)) {
      setOverlapWarning(null);
      return;
    }

    if (formType === 'specific' && !selectedSpecificDate) {
      setOverlapWarning(null);
      return;
    }

    // Use the same overlap checking logic
    const overlapError = checkForOverlaps({
      type: formType,
      days: selectedDays,
      date: selectedSpecificDate,
      startTime,
      endTime,
      isAvailable: form.watch('isAvailable'),
      reason: form.watch('reason'),
    });

    setOverlapWarning(overlapError);
  }, [availability, formType, selectedDays, selectedSpecificDate, startTime, endTime]);

  // Quick time presets
  const applyTimePreset = (preset: 'fullDay' | 'morning' | 'afternoon') => {
    switch (preset) {
      case 'fullDay':
        form.setValue('startTime', BUSINESS_HOURS.DEFAULT_START);
        form.setValue('endTime', BUSINESS_HOURS.DEFAULT_END);
        break;
      case 'morning':
        form.setValue('startTime', BUSINESS_HOURS.MORNING_START);
        form.setValue('endTime', BUSINESS_HOURS.MORNING_END);
        break;
      case 'afternoon':
        form.setValue('startTime', BUSINESS_HOURS.AFTERNOON_START);
        form.setValue('endTime', BUSINESS_HOURS.AFTERNOON_END);
        break;
    }
  };

  // Check for overlapping slots before submission
  const checkForOverlaps = (data: AvailabilityFormValues): string | null => {
    if (!availability || availability.length === 0) return null;

    if (data.type === 'recurring' && data.days && data.days.length > 0) {
      // Check each selected day for overlaps
      for (const day of data.days) {
        const dayOfWeek = parseInt(day);
        const daySlots = availability.filter(slot => 
          slot.is_recurring && slot.day_of_week === dayOfWeek
        );

        for (const slot of daySlots) {
          if (doTimeSlotsOverlap(data.startTime, data.endTime, slot.start_time, slot.end_time)) {
            return `This time slot overlaps with an existing availability on ${DAYS_OF_WEEK[dayOfWeek === 0 ? 6 : dayOfWeek - 1]}. Please choose a different time or delete the existing slot first.`;
          }
        }
      }
    } else if (data.type === 'specific' && data.date) {
      const specificDate = format(data.date, 'yyyy-MM-dd');
      const dayOfWeek = data.date.getDay();
      
      // Check specific date slots
      const specificDateSlots = availability.filter(slot => 
        !slot.is_recurring && slot.specific_date === specificDate
      );
      
      for (const slot of specificDateSlots) {
        if (doTimeSlotsOverlap(data.startTime, data.endTime, slot.start_time, slot.end_time)) {
          return `This time slot overlaps with an existing availability on ${format(data.date, 'MMMM d, yyyy')}. Please choose a different time or delete the existing slot first.`;
        }
      }
      
      // Also check recurring slots for the same day of week
      const recurringSlots = availability.filter(slot => 
        slot.is_recurring && slot.day_of_week === dayOfWeek
      );
      
      for (const slot of recurringSlots) {
        if (doTimeSlotsOverlap(data.startTime, data.endTime, slot.start_time, slot.end_time)) {
          return `This time slot overlaps with a recurring availability on ${DAYS_OF_WEEK[dayOfWeek === 0 ? 6 : dayOfWeek - 1]}. Please choose a different time or delete the existing slot first.`;
        }
      }
    }
    
    return null;
  };

  const onSubmit = async (data: AvailabilityFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    // Check for overlapping slots before making the API request
    const overlapError = checkForOverlaps(data);
    if (overlapError) {
      setSubmitError(overlapError);
      setIsSubmitting(false);
      return;
    }
    
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
              isAvailable: data.isAvailable,
              reason: data.isAvailable ? undefined : data.reason,
            })
          )
        );
      } else if (data.type === 'specific' && data.date) {
        // Handle specific date availability
        // Use the actual date object directly to avoid timezone issues
        const specificDate = format(data.date, 'yyyy-MM-dd');
        console.log('Adding specific date availability for:', specificDate);
        
        // Get the day of week from the date
        const dayOfWeek = data.date.getDay();
        console.log('Day of week:', dayOfWeek, 'for date:', specificDate);
        
        await addAvailability({
          dayOfWeek,
          startTime: data.startTime,
          endTime: data.endTime,
          isRecurring: false,
          specificDate,
          isAvailable: data.isAvailable,
          reason: data.isAvailable ? undefined : data.reason,
        });
      }
      
      setSubmitSuccess(true);
      setTimeout(() => {
        setIsDialogOpen(false);
        form.reset();
      }, 1500);
    } catch (err) {
      console.error('Failed to add availability:', err);
      if (err instanceof Error) {
        // Check for specific error messages
        if (err.message.includes('Therapist profile not found')) {
          setSubmitError('Your therapist profile is not set up yet. Please contact support.');
        } else if (err.message.includes('overlaps with an existing availability slot') || 
                  err.message.includes('This time slot overlaps')) {
          setSubmitError('This time slot overlaps with an existing availability slot. Please choose a different time or day.');
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
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
  // Use { weekStartsOn: 1 } to start weeks on Monday for better UX
  const weekStart = selectedDate 
    ? startOfWeek(selectedDate, { weekStartsOn: 1 }) 
    : startOfWeek(new Date(), { weekStartsOn: 1 });
  
  // Create an array of days for the week, with Monday first and Sunday last
  // This matches the calendar display where Monday is first and Sunday is last
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Availability</h1>
      
      <div className="flex flex-col md:flex-row md:space-x-6 space-y-6 md:space-y-0">
        <div className="w-full md:w-[350px] bg-card rounded-lg border p-4 flex justify-center">
          <div className="w-full">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="w-full rounded-md border shadow"
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              weekStartsOn={1}
            />
          </div>
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
                          <FormLabel>Availability Status</FormLabel>
                          <div className="text-sm text-gray-500 mb-2">
                            Set whether this time slot is available for appointments or blocked off (unavailable).
                          </div>
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
                                <label htmlFor="unavailable" className="cursor-pointer">Blocked</label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {!form.watch('isAvailable') && (
                      <FormField
                        control={form.control}
                        name="reason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reason (Optional)</FormLabel>
                            <div className="text-sm text-gray-500 mb-2">
                              Specify a reason for blocking this time slot.
                            </div>
                            <FormControl>
                              <Input placeholder="Lunch, Doctor's Appointment, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {formType === 'recurring' ? (
                      <FormField
                        control={form.control}
                        name="days"
                        render={() => (
                          <FormItem>
                            <FormLabel>Days of Week</FormLabel>
                            <div className="grid grid-cols-2 gap-2">
                              {DAYS_OF_WEEK.map((day, index) => {
                                // Convert our index (0-6, Monday to Sunday) to JavaScript day of week (0-6, Sunday to Saturday)
                                // index 0 (Monday) -> dayOfWeek 1
                                // index 1 (Tuesday) -> dayOfWeek 2
                                // ...
                                // index 5 (Saturday) -> dayOfWeek 6
                                // index 6 (Sunday) -> dayOfWeek 0
                                const dayOfWeek = index === 6 ? 0 : index + 1;
                                
                                return (
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
                                            checked={field.value?.includes(dayOfWeek.toString())}
                                            onCheckedChange={(checked: boolean) => {
                                              const currentValue = field.value || [];
                                              if (checked) {
                                                field.onChange([...currentValue, dayOfWeek.toString()]);
                                              } else {
                                                field.onChange(
                                                  currentValue.filter((value: string) => value !== dayOfWeek.toString())
                                                );
                                              }
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal">{day}</FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                );
                              })}
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
                              weekStartsOn={1}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Time presets */}
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTimePreset('fullDay')}
                      >
                        Full Day (8am-6pm)
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTimePreset('morning')}
                      >
                        Morning (8am-12pm)
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTimePreset('afternoon')}
                      >
                        Afternoon (1pm-5pm)
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="h-[200px]">
                                {TIME_OPTIONS.filter((time, index) => {
                                  // Only show end times that are after the selected start time
                                  const startIndex = findTimeIndex(startTime);
                                  return index > startIndex;
                                }).map((time) => (
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

                    <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
                      <strong>Note:</strong> Overlapping time slots are not allowed. Each time period can only have one availability status.
                    </div>

                    {overlapWarning && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                        <strong>Warning:</strong> {overlapWarning}
                      </div>
                    )}

                    {submitError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                        {submitError}
                      </div>
                    )}

                    {submitSuccess && (
                      <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
                        Time slot added successfully!
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isSubmitting || !!overlapWarning}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Time Slot'
                      )}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4">
            {weekDays.map((date, index) => {
              // Format the date for debugging
              const dateStr = format(date, 'yyyy-MM-dd');
              console.log(`Rendering date: ${dateStr}, day of week: ${date.getDay()}`);
              
              // Filter slots for this day, considering both recurring and specific dates
              const daySlots = availability.filter((slot) => {
                // For recurring slots, just check the day of week
                if (slot.is_recurring && slot.day_of_week === date.getDay()) {
                  return true;
                }
                
                // For specific date slots, check the specific date
                if (!slot.is_recurring && slot.specific_date) {
                  // Parse the specific_date string to a Date object
                  // Use parseISO for more reliable date parsing
                  const slotDateStr = slot.specific_date;
                  const currentDateStr = format(date, 'yyyy-MM-dd');
                  
                  console.log(`Comparing slot date: ${slotDateStr} with current date: ${currentDateStr}`);
                  
                  // Direct string comparison of dates in yyyy-MM-dd format
                  return slotDateStr === currentDateStr;
                }
                
                return false;
              });
              
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
                          className={cn(
                            "flex items-center justify-between p-2 rounded",
                            (slot.is_available === undefined || slot.is_available) 
                              ? "bg-green-50 border border-green-100" 
                              : "bg-red-50 border border-red-100"
                          )}
                        >
                          <div>
                            <span className="font-medium">
                              {format(new Date(`2024-01-01T${slot.start_time}`), 'h:mm a')} - {format(new Date(`2024-01-01T${slot.end_time}`), 'h:mm a')}
                            </span>
                            {slot.is_available === false && (
                              <span className="ml-2 text-sm text-red-600">
                                Blocked{slot.reason ? `: ${slot.reason}` : ''}
                              </span>
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