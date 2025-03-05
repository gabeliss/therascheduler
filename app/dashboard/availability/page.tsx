'use client';

import { useHierarchicalAvailability } from '@/app/hooks/use-hierarchical-availability';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
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
import { Loader2, Plus, Trash2, Clock, Edit, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import CalendarView from './calendar-view';

// Create Badge component if it doesn't exist
const Badge = ({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) => {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
      variant === "outline" ? "border border-gray-200 text-gray-800" : "bg-primary text-primary-foreground",
      className
    )}>
      {children}
    </span>
  );
};

// Create Accordion components if they don't exist
const Accordion = ({ children, type, className }: { children: React.ReactNode, type?: string, className?: string }) => {
  return <div className={className}>{children}</div>;
};

const AccordionItem = ({ children, value, className }: { children: React.ReactNode, value: string, className?: string }) => {
  return <div className={className}>{children}</div>;
};

const AccordionTrigger = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return <div className={cn("flex justify-between items-center cursor-pointer", className)}>{children}</div>;
};

const AccordionContent = ({ children }: { children: React.ReactNode }) => {
  return <div className="mt-2">{children}</div>;
};

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

// Base availability form schema
const baseAvailabilitySchema = z.object({
  type: z.enum(['recurring', 'specific']),
  days: z.array(z.string()).optional(),
  date: z.date().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
});

// Exception form schema
const exceptionSchema = z.object({
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  reason: z.string().optional(),
});

// Define the types after the schemas
type BaseAvailabilityFormValues = z.infer<typeof baseAvailabilitySchema>;
type ExceptionFormValues = z.infer<typeof exceptionSchema>;

// Add refinements after the types are defined
const refinedBaseSchema = baseAvailabilitySchema.refine(
  (data) => {
    console.log('Validating form data:', data);
    if (data.type === 'recurring') {
      const isValid = !!(data.days && data.days.length > 0);
      console.log('Recurring validation result:', isValid);
      return isValid;
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
      const isValid = !!data.date;
      console.log('Specific date validation result:', isValid);
      return isValid;
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
      const isValid = endIndex > startIndex;
      console.log('Time range validation result:', isValid);
      return isValid;
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
);

const refinedExceptionSchema = exceptionSchema.refine(
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

// Add this function before the AvailabilityPage component
function checkTimeOverlap(
  startTime1: string,
  endTime1: string,
  startTime2: string,
  endTime2: string
): boolean {
  // Convert times to minutes since midnight for easier comparison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const start1 = timeToMinutes(startTime1);
  const end1 = timeToMinutes(endTime1);
  const start2 = timeToMinutes(startTime2);
  const end2 = timeToMinutes(endTime2);
  
  // Check for overlap
  return start1 < end2 && end1 > start2;
}

export default function AvailabilityPage() {
  const { 
    hierarchicalAvailability, 
    loading, 
    error, 
    addBaseAvailability, 
    addAvailabilityException,
    deleteBaseAvailability,
    deleteAvailabilityException,
    refreshAvailability
  } = useHierarchicalAvailability();
  
  const [isBaseDialogOpen, setIsBaseDialogOpen] = useState(false);
  const [isExceptionDialogOpen, setIsExceptionDialogOpen] = useState(false);
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { toast } = useToast();

  // Base availability form
  const baseForm = useForm<BaseAvailabilityFormValues>({
    resolver: zodResolver(refinedBaseSchema),
    defaultValues: {
      type: 'recurring',
      days: [],
      startTime: BUSINESS_HOURS.DEFAULT_START,
      endTime: BUSINESS_HOURS.DEFAULT_END,
    },
  });

  console.log('Form initialized with default values:', baseForm.getValues());

  // Exception form
  const exceptionForm = useForm<ExceptionFormValues>({
    resolver: zodResolver(refinedExceptionSchema),
    defaultValues: {
      startTime: '',
      endTime: '',
      reason: '',
    },
  });

  const formType = baseForm.watch('type');
  const selectedDays = baseForm.watch('days');
  const selectedSpecificDate = baseForm.watch('date');

  // Reset base form when dialog is opened
  useEffect(() => {
    if (isBaseDialogOpen) {
      console.log('Dialog opened, resetting form');
      baseForm.reset({
        type: 'recurring',
        days: [],
        startTime: BUSINESS_HOURS.DEFAULT_START,
        endTime: BUSINESS_HOURS.DEFAULT_END,
      });
      console.log('Form reset with values:', baseForm.getValues());
      setSubmitError(null);
      setSubmitSuccess(false);
    }
  }, [isBaseDialogOpen, baseForm]);

  // Reset exception form when dialog is opened
  useEffect(() => {
    if (isExceptionDialogOpen && selectedBaseId) {
      const baseAvail = hierarchicalAvailability.find(ha => ha.base.id === selectedBaseId);
      if (baseAvail) {
        exceptionForm.reset({
          startTime: baseAvail.base.start_time,
          endTime: baseAvail.base.end_time,
          reason: '',
        });
      }
      setSubmitError(null);
      setSubmitSuccess(false);
    }
  }, [isExceptionDialogOpen, selectedBaseId, exceptionForm, hierarchicalAvailability]);

  // Quick time presets for base availability
  const applyTimePreset = (preset: 'fullDay' | 'morning' | 'afternoon') => {
    switch (preset) {
      case 'fullDay':
        baseForm.setValue('startTime', BUSINESS_HOURS.DEFAULT_START);
        baseForm.setValue('endTime', BUSINESS_HOURS.DEFAULT_END);
        break;
      case 'morning':
        baseForm.setValue('startTime', BUSINESS_HOURS.MORNING_START);
        baseForm.setValue('endTime', BUSINESS_HOURS.MORNING_END);
        break;
      case 'afternoon':
        baseForm.setValue('startTime', BUSINESS_HOURS.AFTERNOON_START);
        baseForm.setValue('endTime', BUSINESS_HOURS.AFTERNOON_END);
        break;
    }
  };

  // Add this function after the form setup
  const checkForOverlaps = (formData: BaseAvailabilityFormValues): { hasOverlap: boolean, overlapDays: string[] } => {
    const overlapDays: string[] = [];
    
    if (formData.type === 'recurring' && formData.days && formData.days.length > 0) {
      // Check each selected day against existing availability
      formData.days.forEach(day => {
        const dayNumber = parseInt(day);
        const existingForDay = hierarchicalAvailability.filter(
          slot => slot.base.day_of_week === dayNumber && slot.base.is_recurring
        );
        
        // Check for overlaps with existing slots
        const hasOverlapForDay = existingForDay.some(slot => 
          checkTimeOverlap(
            formData.startTime, 
            formData.endTime, 
            slot.base.start_time, 
            slot.base.end_time
          )
        );
        
        if (hasOverlapForDay) {
          overlapDays.push(DAYS_OF_WEEK[dayNumber]);
        }
      });
    } else if (formData.type === 'specific' && formData.date) {
      const specificDate = format(formData.date, 'yyyy-MM-dd');
      const dayOfWeek = formData.date.getDay();
      
      // Check against specific date slots
      const existingSpecific = hierarchicalAvailability.filter(
        slot => !slot.base.is_recurring && slot.base.specific_date === specificDate
      );
      
      // Also check against recurring slots for that day
      const existingRecurring = hierarchicalAvailability.filter(
        slot => slot.base.is_recurring && slot.base.day_of_week === dayOfWeek
      );
      
      const hasOverlapSpecific = existingSpecific.some(slot => 
        checkTimeOverlap(
          formData.startTime, 
          formData.endTime, 
          slot.base.start_time, 
          slot.base.end_time
        )
      );
      
      const hasOverlapRecurring = existingRecurring.some(slot => 
        checkTimeOverlap(
          formData.startTime, 
          formData.endTime, 
          slot.base.start_time, 
          slot.base.end_time
        )
      );
      
      if (hasOverlapSpecific || hasOverlapRecurring) {
        overlapDays.push(format(formData.date, 'MMMM d, yyyy'));
      }
    }
    
    return { 
      hasOverlap: overlapDays.length > 0,
      overlapDays 
    };
  };

  // Update the form watch to check for overlaps as user selects times
  const baseFormValues = baseForm.watch();
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  
  // Add this useEffect after the other useEffects
  useEffect(() => {
    // Only check when we have enough data to determine an overlap
    if (
      baseFormValues.startTime && 
      baseFormValues.endTime && 
      ((baseFormValues.type === 'recurring' && baseFormValues.days && baseFormValues.days.length > 0) || 
       (baseFormValues.type === 'specific' && baseFormValues.date))
    ) {
      const { hasOverlap, overlapDays } = checkForOverlaps(baseFormValues as BaseAvailabilityFormValues);
      
      if (hasOverlap) {
        setOverlapWarning(`Warning: This time overlaps with existing availability for ${overlapDays.join(', ')}`);
      } else {
        setOverlapWarning(null);
      }
    } else {
      setOverlapWarning(null);
    }
  }, [baseFormValues.startTime, baseFormValues.endTime, baseFormValues.days, baseFormValues.date, baseFormValues.type]);

  // Submit base availability form
  const onSubmitBase = async (data: BaseAvailabilityFormValues) => {
    console.log('Form submitted with data:', data);
    
    // Check for overlaps before submitting
    const { hasOverlap, overlapDays } = checkForOverlaps(data);
    
    if (hasOverlap) {
      const errorMessage = `This time slot overlaps with existing availability for ${overlapDays.join(', ')}. Please choose a different time or delete the existing slot first.`;
      setSubmitError(errorMessage);
      toast({
        title: "Overlap Detected",
        description: errorMessage,
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    try {
      console.log('Processing form submission...');
      if (data.type === 'recurring' && data.days && data.days.length > 0) {
        // Handle recurring availability
        console.log('Adding recurring availability for days:', data.days);
        
        // Process each day one by one to better handle errors
        for (const day of data.days) {
          try {
            await addBaseAvailability({
              dayOfWeek: parseInt(day),
              startTime: data.startTime,
              endTime: data.endTime,
              isRecurring: true,
            });
          } catch (err) {
            // Check if this is an overlap error
            if (err instanceof Error && 
                (err.message.includes('overlap') || 
                 err.message.includes('Overlapping availability exists'))) {
              console.error(`Overlap detected for day ${day}:`, err);
              throw new Error(`Overlapping availability exists for ${DAYS_OF_WEEK[parseInt(day)]}. Please delete the existing availability first or choose a different time.`);
            } else {
              // Re-throw other errors
              throw err;
            }
          }
        }
      } else if (data.type === 'specific' && data.date) {
        // Handle specific date availability
        const specificDate = format(data.date, 'yyyy-MM-dd');
        const dayOfWeek = data.date.getDay();
        console.log('Adding specific date availability for:', specificDate);
        
        try {
          await addBaseAvailability({
            dayOfWeek,
            startTime: data.startTime,
            endTime: data.endTime,
            isRecurring: false,
            specificDate,
          });
        } catch (err) {
          // Check if this is an overlap error
          if (err instanceof Error && 
              (err.message.includes('overlap') || 
               err.message.includes('Overlapping availability exists'))) {
            console.error(`Overlap detected for specific date ${specificDate}:`, err);
            throw new Error(`Overlapping availability exists for ${format(data.date, 'MMMM d, yyyy')}. Please delete the existing availability first or choose a different time.`);
          } else {
            // Re-throw other errors
            throw err;
          }
        }
      } else {
        console.error('Invalid form data:', data);
        setSubmitError('Please select at least one day or a specific date');
        setIsSubmitting(false);
        return;
      }
      
      console.log('Availability added successfully');
      setSubmitSuccess(true);
      
      // Refresh the availability data
      await refreshAvailability();
      
      setTimeout(() => {
        setIsBaseDialogOpen(false);
        baseForm.reset();
      }, 1500);
    } catch (err) {
      console.error('Failed to add base availability:', err);
      if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('An unexpected error occurred. Please try again.');
      }
      
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add base availability",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit exception form
  const onSubmitException = async (data: ExceptionFormValues) => {
    if (!selectedBaseId) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    
    try {
      await addAvailabilityException({
        baseAvailabilityId: selectedBaseId,
        startTime: data.startTime,
        endTime: data.endTime,
        reason: data.reason,
      });
      
      setSubmitSuccess(true);
      toast({
        title: "Success",
        description: "Exception added successfully",
        variant: "default",
      });
      
      setTimeout(() => {
        setIsExceptionDialogOpen(false);
        exceptionForm.reset();
      }, 1500);
    } catch (err) {
      console.error('Failed to add exception:', err);
      if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('An unexpected error occurred. Please try again.');
      }
      
      toast({
        title: "Error",
        description: submitError || "Failed to add exception",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting base availability
  const handleDeleteBase = async (id: string) => {
    try {
      await deleteBaseAvailability(id);
      toast({
        title: "Success",
        description: "Base availability deleted successfully",
        variant: "default",
      });
    } catch (err) {
      console.error('Failed to delete base availability:', err);
      toast({
        title: "Error",
        description: "Failed to delete base availability",
        variant: "destructive",
      });
    }
  };

  // Handle deleting exception
  const handleDeleteException = async (id: string) => {
    try {
      await deleteAvailabilityException(id);
      toast({
        title: "Success",
        description: "Exception deleted successfully",
        variant: "default",
      });
    } catch (err) {
      console.error('Failed to delete exception:', err);
      toast({
        title: "Error",
        description: "Failed to delete exception",
        variant: "destructive",
      });
    }
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));
    return format(date, 'h:mm a');
  };

  // Format date safely
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
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

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Availability</h1>
        <Dialog open={isBaseDialogOpen} onOpenChange={setIsBaseDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Base Availability
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Add Base Availability</DialogTitle>
              <DialogDescription>
                Set your regular working hours or specific date availability.
              </DialogDescription>
            </DialogHeader>
            <Form {...baseForm}>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  console.log('Form submitted directly');
                  const formData = baseForm.getValues();
                  console.log('Form values:', formData);
                  
                  // Validate the form manually
                  if (formData.type === 'recurring' && (!formData.days || formData.days.length === 0)) {
                    console.error('Please select at least one day');
                    baseForm.setError('days', { message: 'Please select at least one day' });
                    return;
                  }
                  
                  if (formData.type === 'specific' && !formData.date) {
                    console.error('Please select a specific date');
                    baseForm.setError('date', { message: 'Please select a specific date' });
                    return;
                  }
                  
                  // Call the submit handler directly
                  onSubmitBase(formData);
                }} 
                className="space-y-6"
              >
                {/* Form fields for base availability */}
                <FormField
                  control={baseForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Availability Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => {
                            console.log('Type changed to:', value);
                            field.onChange(value);
                          }}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
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

                {formType === 'recurring' ? (
                  <FormField
                    control={baseForm.control}
                    name="days"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">Days of Week</FormLabel>
                          <FormDescription>
                            Select the days when you are available.
                          </FormDescription>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {DAYS_OF_WEEK.map((day, index) => (
                            <FormField
                              key={day}
                              control={baseForm.control}
                              name="days"
                              render={({ field }) => {
                                console.log(`Rendering checkbox for ${day}, current value:`, field.value);
                                return (
                                  <FormItem
                                    key={day}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(index.toString())}
                                        onCheckedChange={(checked) => {
                                          console.log(`Checkbox for ${day} changed to:`, checked);
                                          return checked
                                            ? field.onChange([...field.value || [], index.toString()])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== index.toString()
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      {day}
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
                ) : (
                  <FormField
                    control={baseForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          className="rounded-md border"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={baseForm.control}
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
                          <SelectContent className="max-h-[300px]">
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
                    control={baseForm.control}
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
                          <SelectContent className="max-h-[300px]">
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

                <div className="flex space-x-2">
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

                {/* Add the overlap warning */}
                {overlapWarning && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm">
                    {overlapWarning}
                  </div>
                )}

                {submitError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
                    {submitError}
                  </div>
                )}

                {submitSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm">
                    Availability added successfully!
                  </div>
                )}

                <DialogFooter className="flex justify-center w-full">
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Base Availability'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add Tabs for List and Calendar views */}
      <Tabs defaultValue="list" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          {/* Existing list view */}
          <div className="space-y-6">
            {hierarchicalAvailability.length === 0 ? (
              <div className="text-center py-12 border rounded-lg">
                <h3 className="text-lg font-medium">No availability set</h3>
                <p className="text-gray-500 mt-2">
                  Click "Add Base Availability" to set your working hours.
                </p>
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-4">
                {hierarchicalAvailability.map((item) => (
                  <AccordionItem
                    key={item.base.id}
                    value={item.base.id}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">
                          {item.base.is_recurring
                            ? DAYS_OF_WEEK[item.base.day_of_week]
                            : formatDate(item.base.specific_date)}
                        </h3>
                        <p className="text-gray-500">
                          {formatTime(item.base.start_time)} - {formatTime(item.base.end_time)}
                          {item.base.is_recurring && (
                            <Badge variant="outline" className="ml-2">
                              Weekly
                            </Badge>
                          )}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedBaseId(item.base.id);
                                setIsExceptionDialogOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Exception
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[550px]">
                            <DialogHeader>
                              <DialogTitle>Add Exception</DialogTitle>
                            </DialogHeader>
                            <Form {...exceptionForm}>
                              <form onSubmit={exceptionForm.handleSubmit(onSubmitException)} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={exceptionForm.control}
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
                                          <SelectContent className="max-h-[300px]">
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
                                    control={exceptionForm.control}
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
                                          <SelectContent className="max-h-[300px]">
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
                                  control={exceptionForm.control}
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

                                {submitError && (
                                  <div className="text-red-500 text-sm">{submitError}</div>
                                )}

                                {submitSuccess && (
                                  <div className="text-green-500 text-sm">
                                    Exception added successfully!
                                  </div>
                                )}

                                <Button type="submit" disabled={isSubmitting} className="w-full">
                                  {isSubmitting ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    'Save Exception'
                                  )}
                                </Button>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteBase(item.base.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <AccordionTrigger className="py-2">
                      {item.exceptions.length > 0 ? (
                        <span className="text-sm text-gray-500">
                          {item.exceptions.length} exception{item.exceptions.length > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">No exceptions</span>
                      )}
                    </AccordionTrigger>
                    <AccordionContent>
                      {item.exceptions.length > 0 ? (
                        <div className="space-y-2 mt-2">
                          {item.exceptions.map((exception) => (
                            <div
                              key={exception.id}
                              className="flex justify-between items-center p-2 bg-gray-50 rounded-md"
                            >
                              <div>
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                                  <span>
                                    {formatTime(exception.start_time)} - {formatTime(exception.end_time)}
                                  </span>
                                </div>
                                {exception.reason && (
                                  <div className="text-sm text-gray-500 ml-6">
                                    {exception.reason}
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteException(exception.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          <p>No exceptions for this time slot.</p>
                          <p className="text-sm">
                            Add exceptions for lunch breaks, meetings, or other blocked times.
                          </p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="calendar">
          {/* Calendar view */}
          {hierarchicalAvailability.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <h3 className="text-lg font-medium">No availability set</h3>
              <p className="text-gray-500 mt-2">
                Click "Add Base Availability" to set your working hours.
              </p>
            </div>
          ) : (
            <CalendarView hierarchicalAvailability={hierarchicalAvailability} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 