import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Loader2, X, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BaseAvailabilityFormValues, refinedBaseSchema } from '../utils/schemas';

// Import from the new modular structure
import { DAYS_OF_WEEK, BUSINESS_HOURS } from '../utils/time/types';
import { TIME_OPTIONS } from '../utils/time/format';
import { validateTimeRange } from '../utils/time/calculations';

interface BaseAvailabilityFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BaseAvailabilityFormValues, forceAdd?: boolean) => Promise<void>;
  checkForOverlaps?: (formData: BaseAvailabilityFormValues) => { hasOverlap: boolean, overlapDays: string[] };
  onOverlapDetected?: (data: BaseAvailabilityFormValues) => void;
}

const BaseAvailabilityForm = ({
  isOpen,
  onOpenChange,
  onSubmit,
  checkForOverlaps,
  onOverlapDetected
}: BaseAvailabilityFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<{ hasOverlap: boolean, overlapDays: string[] }>({
    hasOverlap: false,
    overlapDays: []
  });

  const form = useForm<BaseAvailabilityFormValues>({
    resolver: zodResolver(refinedBaseSchema),
    defaultValues: {
      type: 'recurring',
      days: [],
      startTime: BUSINESS_HOURS.DEFAULT_START,
      endTime: BUSINESS_HOURS.DEFAULT_END,
    },
  });

  const formType = form.watch('type');
  const selectedDays = form.watch('days');
  const selectedSpecificDate = form.watch('date');

  // Apply time preset
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

  const handleSubmit = async (data: BaseAvailabilityFormValues) => {
    // Validate time range
    const validation = validateTimeRange(data.startTime, data.endTime);
    if (!validation.isValid) {
      setError(validation.errorMessage || 'Invalid time range');
      return;
    }
    
    // Check for overlaps if the function is provided
    if (checkForOverlaps) {
      const overlaps = checkForOverlaps(data);
      
      if (overlaps.hasOverlap) {
        setOverlapWarning(overlaps);
        return; // Don't submit if there are overlaps
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(data, false); // Not forcing the add
      form.reset({
        type: 'recurring',
        days: [],
        startTime: BUSINESS_HOURS.DEFAULT_START,
        endTime: BUSINESS_HOURS.DEFAULT_END,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-lg">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl font-bold">Add Availability</DialogTitle>
          </div>
          <p className="text-blue-100 mt-2">Set your availability for appointments</p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="p-6 space-y-6">
            <Tabs 
              defaultValue="recurring" 
              value={formType}
              onValueChange={value => form.setValue('type', value as 'recurring' | 'specific')}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="recurring">Weekly Recurring</TabsTrigger>
                <TabsTrigger value="specific">Specific Date</TabsTrigger>
              </TabsList>

              <TabsContent value="recurring" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="days"
                  render={() => (
                    <FormItem>
                      <div className="mb-3">
                        <FormLabel className="text-base font-semibold text-gray-800">Select Days</FormLabel>
                        <FormDescription className="text-sm text-gray-500">
                          Select the days of the week for this availability.
                        </FormDescription>
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <FormField
                            key={day}
                            control={form.control}
                            name="days"
                            render={({ field }) => {
                              const isChecked = field.value?.includes(day);
                              return (
                                <FormItem
                                  key={day}
                                  className="flex flex-col items-center space-y-2"
                                >
                                  <FormControl>
                                    <div 
                                      className={`
                                        w-10 h-10 rounded-full flex items-center justify-center cursor-pointer
                                        ${isChecked 
                                          ? 'bg-blue-600 text-white' 
                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        } 
                                        transition-colors
                                      `}
                                      onClick={() => {
                                        const newValue = isChecked
                                          ? field.value?.filter(value => value !== day)
                                          : [...(field.value || []), day];
                                        field.onChange(newValue);
                                      }}
                                    >
                                      {day.charAt(0)}
                                    </div>
                                  </FormControl>
                                  <FormLabel className="text-xs font-normal cursor-pointer">
                                    {day.substring(0, 3)}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="specific" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-base font-semibold text-gray-800 mb-2">Date</FormLabel>
                      <div className="flex justify-center">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="rounded-md border shadow-sm"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <FormLabel className="text-base font-semibold text-gray-800 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  Time Range
                </FormLabel>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTimePreset('fullDay')}
                    className="text-xs px-3 py-1 h-auto rounded-full border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    Full Day
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTimePreset('morning')}
                    className="text-xs px-3 py-1 h-auto rounded-full border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    Morning
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTimePreset('afternoon')}
                    className="text-xs px-3 py-1 h-auto rounded-full border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    Afternoon
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-gray-700">Start Time</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
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
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-gray-700">End Time</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
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
            </div>

            {overlapWarning.hasOverlap && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
                <p className="text-amber-800 font-medium">Time Overlap Warning</p>
                <p className="text-amber-700 text-sm mt-1">
                  This time range overlaps with existing availability on:{' '}
                  <span className="font-medium">{overlapWarning.overlapDays.join(', ')}</span>
                </p>
                <p className="text-amber-700 text-sm mt-2">
                  When you proceed, you'll have the option to:
                </p>
                <ul className="list-disc list-inside text-amber-700 text-sm mt-1 ml-2">
                  <li>Merge the overlapping time slots into a single slot</li>
                  <li>Replace the existing slot with this new one</li>
                </ul>
                <div className="mt-3 flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOverlapWarning({ hasOverlap: false, overlapDays: [] })}
                    className="border-amber-300 text-amber-800 hover:bg-amber-100"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const formData = form.getValues();
                      setOverlapWarning({ hasOverlap: false, overlapDays: [] });
                      
                      // If onOverlapDetected is provided, call it and close the form
                      if (onOverlapDetected) {
                        onOverlapDetected(formData);
                        onOpenChange(false);
                      } else {
                        // Fall back to the old behavior if onOverlapDetected is not provided
                        setIsSubmitting(true);
                        onSubmit(formData, true)
                          .then(() => {
                            form.reset();
                            onOpenChange(false);
                          })
                          .catch((err) => {
                            setError(err instanceof Error ? err.message : 'An error occurred');
                          })
                          .finally(() => {
                            setIsSubmitting(false);
                          });
                      }
                    }}
                  >
                    Proceed
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-md text-red-600 text-sm">
                {error}
              </div>
            )}

            <DialogFooter className="flex justify-center gap-4 mt-6 pt-4 border-t sm:justify-center">
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
                  'Save Availability'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BaseAvailabilityForm; 