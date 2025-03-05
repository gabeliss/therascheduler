import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BaseAvailabilityFormValues, refinedBaseSchema } from '../utils/schemas';
import { DAYS_OF_WEEK, TIME_OPTIONS, BUSINESS_HOURS } from '../utils/time-utils';

interface BaseAvailabilityFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BaseAvailabilityFormValues) => Promise<void>;
  checkForOverlaps?: (formData: BaseAvailabilityFormValues) => { hasOverlap: boolean, overlapDays: string[] };
}

const BaseAvailabilityForm = ({
  isOpen,
  onOpenChange,
  onSubmit,
  checkForOverlaps
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
    // Check for overlaps if the function is provided
    if (checkForOverlaps) {
      const overlaps = checkForOverlaps(data);
      setOverlapWarning(overlaps);
      
      if (overlaps.hasOverlap) {
        return; // Don't submit if there are overlaps
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit(data);
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Regular Hours</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Availability Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="recurring" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Weekly Recurring
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="specific" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Specific Date
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {formType === 'recurring' && (
              <FormField
                control={form.control}
                name="days"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Select Days</FormLabel>
                      <FormDescription>
                        Select the days of the week for this availability.
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {DAYS_OF_WEEK.map((day) => (
                        <FormField
                          key={day}
                          control={form.control}
                          name="days"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={day}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(day)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value || [], day])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== day
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {day}
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
            )}

            {formType === 'specific' && (
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <FormLabel className="text-base">Time Range</FormLabel>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTimePreset('fullDay')}
                  >
                    Full Day
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTimePreset('morning')}
                  >
                    Morning
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTimePreset('afternoon')}
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
                        <SelectContent>
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
                        <SelectContent>
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
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                <p className="text-yellow-800 font-medium">Time Overlap Warning</p>
                <p className="text-yellow-700 text-sm">
                  This time range overlaps with existing availability on:{' '}
                  {overlapWarning.overlapDays.join(', ')}
                </p>
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOverlapWarning({ hasOverlap: false, overlapDays: [] })}
                    className="mr-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setOverlapWarning({ hasOverlap: false, overlapDays: [] });
                      setIsSubmitting(true);
                      onSubmit(form.getValues())
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
                    }}
                  >
                    Save Anyway
                  </Button>
                </div>
              </div>
            )}

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Hours'
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