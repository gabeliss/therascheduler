'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parse } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDateForInput, createDefaultDate, ensureEndTimeAfterStartTime } from '@/app/dashboard/availability/utils/time/additional';
import { APPOINTMENT_TYPES } from '../types';

// Add a new field to the form schema for appointmentDate
const appointmentSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Invalid email address'),
  clientPhone: z.string().optional(),
  appointmentDate: z.date({
    required_error: "Please select a date",
  }).optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  type: z.string().min(1, 'Appointment type is required'),
  notes: z.string().optional(),
}).refine((data) => {
  // Skip validation if either field is missing
  if (!data.startTime || !data.endTime) return true;
  
  // Compare start and end times
  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);
  return endTime > startTime;
}, {
  message: "End time must be after start time",
  path: ["endTime"]
});

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AppointmentFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export default function AppointmentForm({
  isOpen,
  onOpenChange,
  onSubmit,
  isSubmitting
}: AppointmentFormProps) {
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      appointmentDate: undefined,
      startTime: createDefaultDate(9), // Default to 9:00 AM
      endTime: createDefaultDate(10),  // Default to 10:00 AM
      type: '',
      notes: '',
    },
  });

  const handleSubmit = async (data: AppointmentFormValues) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create New Appointment</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Email</FormLabel>
                    <FormControl>
                      <Input placeholder="client@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="clientPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="(123) 456-7890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="appointmentDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Appointment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="center" sideOffset={4}>
                        <div className="w-full min-w-[300px]">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                // Update the appointment date
                                field.onChange(date);
                                
                                // Update start time and end time with this date
                                const startTimeValue = form.getValues("startTime");
                                if (startTimeValue) {
                                  const startDate = new Date(startTimeValue);
                                  startDate.setFullYear(date.getFullYear());
                                  startDate.setMonth(date.getMonth());
                                  startDate.setDate(date.getDate());
                                  form.setValue("startTime", formatDateForInput(startDate));
                                }
                                
                                const endTimeValue = form.getValues("endTime");
                                if (endTimeValue) {
                                  const endDate = new Date(endTimeValue);
                                  endDate.setFullYear(date.getFullYear());
                                  endDate.setMonth(date.getMonth());
                                  endDate.setDate(date.getDate());
                                  form.setValue("endTime", formatDateForInput(endDate));
                                }
                              }
                            }}
                            disabled={{ before: new Date() }}
                            initialFocus
                            className="w-full"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <Select
                        value={field.value ? format(new Date(field.value), "HH:mm") : ""}
                        onValueChange={(time) => {
                          if (time) {
                            // Get the selected date
                            const selectedDate = form.getValues("appointmentDate");
                            if (!selectedDate) {
                              // If no date is selected, use today
                              const today = new Date();
                              form.setValue("appointmentDate", today);
                              
                              const [hours, minutes] = time.split(':').map(Number);
                              const newDate = new Date(today);
                              newDate.setHours(hours);
                              newDate.setMinutes(minutes);
                              field.onChange(formatDateForInput(newDate));
                              
                              // Update end time to be 1 hour later if needed
                              const endTimeValue = form.getValues("endTime");
                              if (endTimeValue) {
                                const endDate = new Date(endTimeValue);
                                const updatedEndTime = ensureEndTimeAfterStartTime(
                                  formatDateForInput(newDate),
                                  formatDateForInput(endDate)
                                );
                                form.setValue("endTime", updatedEndTime);
                              }
                            } else {
                              // Use the selected date
                              const [hours, minutes] = time.split(':').map(Number);
                              const newDate = new Date(selectedDate);
                              newDate.setHours(hours);
                              newDate.setMinutes(minutes);
                              field.onChange(formatDateForInput(newDate));
                              
                              // Update end time to be 1 hour later if needed
                              const endTimeValue = form.getValues("endTime");
                              if (endTimeValue) {
                                const endDate = new Date(endTimeValue);
                                const updatedEndTime = ensureEndTimeAfterStartTime(
                                  formatDateForInput(newDate),
                                  formatDateForInput(endDate)
                                );
                                form.setValue("endTime", updatedEndTime);
                              }
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          {Array.from({ length: 24 * 4 }, (_, i) => {
                            const hours = Math.floor(i / 4);
                            const minutes = (i % 4) * 15;
                            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                            const displayTime = format(parse(timeString, "HH:mm", new Date()), "h:mm a");
                            return (
                              <SelectItem key={timeString} value={timeString}>
                                {displayTime}
                              </SelectItem>
                            );
                          })}
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
                        value={field.value ? format(new Date(field.value), "HH:mm") : ""}
                        onValueChange={(time) => {
                          if (time) {
                            // Get the selected date
                            const selectedDate = form.getValues("appointmentDate");
                            if (!selectedDate) {
                              // If no date is selected, use today
                              const today = new Date();
                              form.setValue("appointmentDate", today);
                              
                              const [hours, minutes] = time.split(':').map(Number);
                              const newDate = new Date(today);
                              newDate.setHours(hours);
                              newDate.setMinutes(minutes);
                              field.onChange(formatDateForInput(newDate));
                            } else {
                              // Use the selected date
                              const [hours, minutes] = time.split(':').map(Number);
                              const newDate = new Date(selectedDate);
                              newDate.setHours(hours);
                              newDate.setMinutes(minutes);
                              field.onChange(formatDateForInput(newDate));
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          {Array.from({ length: 24 * 4 }, (_, i) => {
                            const hours = Math.floor(i / 4);
                            const minutes = (i % 4) * 15;
                            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                            const displayTime = format(parse(timeString, "HH:mm", new Date()), "h:mm a");
                            return (
                              <SelectItem key={timeString} value={timeString}>
                                {displayTime}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select appointment type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {APPOINTMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any additional notes here" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex justify-center gap-4 mt-6 sm:justify-center">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="min-w-[100px]">
                Cancel
              </Button>
              <Button type="submit" className="min-w-[100px]" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Appointment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 