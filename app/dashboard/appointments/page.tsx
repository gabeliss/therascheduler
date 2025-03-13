'use client';

import { useAuth } from '@/app/context/auth-context';
import { useAppointments, ConflictCheckResult } from '@/app/hooks/use-appointments';
import { Appointment } from '@/app/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay, parse } from 'date-fns';
import { CalendarIcon, ChevronDown, ChevronUp, Eye, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ConflictResolutionDialog from './components/ConflictResolutionDialog';
import { TimePickerInput } from '@/components/ui/time-picker-input';
import { formatDateForInput, createDefaultDate, validateTimeRange, ensureEndTimeAfterStartTime } from '@/app/utils/time-utils';

// Define ClientProfile interface
interface ClientProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
}

// Extended Appointment interface with client property
interface AppointmentWithClient {
  id: string;
  therapist_id: string;
  client_id: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  type: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  client?: ClientProfile;
  formatted_start_time?: string;
  formatted_end_time?: string;
  time_zone_abbr?: string;
  time_zone?: string;
}

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

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

// Status filter options
const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

// Appointment type options
const APPOINTMENT_TYPES = [
  { value: 'initial-consultation', label: 'Initial Consultation' },
  { value: 'therapy-session', label: 'Therapy Session' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'other', label: 'Other' },
];

// Helper function to round time to nearest 15 minutes
function roundToNearest15Minutes(date: Date): Date {
  const minutes = date.getMinutes();
  const remainder = minutes % 15;
  const roundedMinutes = remainder < 8 ? minutes - remainder : minutes + (15 - remainder);
  
  const result = new Date(date);
  result.setMinutes(roundedMinutes);
  result.setSeconds(0);
  result.setMilliseconds(0);
  
  return result;
}

// Remove the duplicate utility functions that are now imported from time-utils.ts

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { 
    appointments, 
    loading, 
    error, 
    updateAppointmentStatus, 
    createAppointment, 
    checkConflicts,
    refreshAppointments 
  } = useAppointments();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithClient | null>(null);
  const [filteredAppointments, setFilteredAppointments] = useState<AppointmentWithClient[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'start_time',
    direction: 'asc',
  });
  const [activeTab, setActiveTab] = useState('upcoming');
  
  // State for conflict resolution
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictCheckResult | null>(null);
  const [pendingAppointmentData, setPendingAppointmentData] = useState<AppointmentFormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Filter and sort appointments
  useEffect(() => {
    // Cast appointments to AppointmentWithClient[]
    let filtered = [...appointments] as AppointmentWithClient[];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === statusFilter);
    }

    // Filter by search query (client name or type)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(appointment => {
        const clientName = appointment.client?.name?.toLowerCase() || '';
        return clientName.includes(query) || appointment.type.toLowerCase().includes(query);
      });
    }

    // Filter by date
    if (dateFilter) {
      const start = startOfDay(dateFilter);
      const end = endOfDay(dateFilter);
      filtered = filtered.filter(appointment => {
        const appointmentDate = new Date(appointment.start_time);
        return isAfter(appointmentDate, start) && isBefore(appointmentDate, end);
      });
    }

    // Filter by tab (upcoming or past)
    const now = new Date();
    if (activeTab === 'upcoming') {
      filtered = filtered.filter(appointment => new Date(appointment.start_time) >= now);
      console.log('Filtered appointments:', filtered);
    } else if (activeTab === 'past') {
      filtered = filtered.filter(appointment => new Date(appointment.start_time) < now);
    }

    // Sort appointments
    filtered.sort((a, b) => {
      if (sortConfig.key === 'start_time') {
        return sortConfig.direction === 'asc' 
          ? new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          : new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      }
      
      if (sortConfig.key === 'client') {
        const aName = a.client?.name || '';
        const bName = b.client?.name || '';
        return sortConfig.direction === 'asc'
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName);
      }
      
      if (sortConfig.key === 'status' || sortConfig.key === 'type') {
        const aValue = a[sortConfig.key as keyof AppointmentWithClient] as string;
        const bValue = b[sortConfig.key as keyof AppointmentWithClient] as string;
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });

    setFilteredAppointments(filtered);
  }, [appointments, statusFilter, searchQuery, dateFilter, sortConfig, activeTab]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleStatusUpdate = async (id: string, newStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed') => {
    try {
      // Cast to any to bypass type checking
      await updateAppointmentStatus(id, newStatus as any);
      toast({
        title: 'Status updated',
        description: `Appointment status has been updated to ${newStatus}.`,
      });
    } catch (err) {
      console.error('Failed to update appointment status:', err);
      toast({
        title: 'Error',
        description: 'Failed to update appointment status.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: AppointmentFormValues) => {
    try {
      setIsSubmitting(true);
      
      // Ensure both start and end times use the selected date
      if (data.appointmentDate) {
        const startDate = new Date(data.startTime);
        const endDate = new Date(data.endTime);
        
        // Set dates to match the selected appointment date
        startDate.setFullYear(data.appointmentDate.getFullYear());
        startDate.setMonth(data.appointmentDate.getMonth());
        startDate.setDate(data.appointmentDate.getDate());
        
        endDate.setFullYear(data.appointmentDate.getFullYear());
        endDate.setMonth(data.appointmentDate.getMonth());
        endDate.setDate(data.appointmentDate.getDate());
        
        // Update the form data
        data.startTime = formatDateForInput(startDate);
        data.endTime = formatDateForInput(endDate);
      }
      
      // Validate that end time is after start time
      if (!validateTimeRange(data.startTime, data.endTime)) {
        form.setError("endTime", {
          type: "manual",
          message: "End time must be after start time"
        });
        setIsSubmitting(false);
        return;
      }
      
      // Check for conflicts
      const conflictResult = await checkConflicts(data.startTime, data.endTime);
      
      // Store the form data in case we need it for conflict resolution
      setPendingAppointmentData(data);
      
      if (conflictResult.hasConflict) {
        // Show conflict resolution dialog
        setConflicts(conflictResult);
        setShowConflictDialog(true);
        setIsSubmitting(false);
        return;
      }
      
      // No conflicts, create the appointment
      await createAppointment({
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        startTime: data.startTime,
        endTime: data.endTime,
        type: data.type,
        notes: data.notes
      });
      
      toast({
        title: 'Appointment created',
        description: 'The appointment has been successfully created.',
      });
      
      // Reset form and close dialog
      form.reset();
      setIsDialogOpen(false);
      refreshAppointments();
    } catch (err) {
      console.error('Failed to create appointment:', err);
      toast({
        title: 'Error',
        description: 'Failed to create appointment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle override confirmation
  const handleOverride = async (overrideReason: string) => {
    if (!pendingAppointmentData) return;
    
    try {
      // Create the appointment with override flag
      const { appointmentDate, ...appointmentData } = pendingAppointmentData;
      
      await createAppointment({
        ...appointmentData,
        overrideTimeOff: true,
        overrideReason
      });
      
      // Close dialogs and reset
      setShowConflictDialog(false);
      setIsDialogOpen(false);
      form.reset();
      setPendingAppointmentData(null);
      
      toast({
        title: 'Appointment created',
        description: 'Appointment has been created, overriding scheduling conflicts.',
      });
    } catch (err) {
      console.error('Failed to create appointment with override:', err);
      toast({
        title: 'Error',
        description: 'Failed to create appointment.',
        variant: 'destructive',
      });
    }
  };
  
  // Handle reschedule option
  const handleReschedule = () => {
    // Close the conflict dialog but keep the appointment form open
    setShowConflictDialog(false);
    
    toast({
      title: 'Please reschedule',
      description: 'Please select a different time for this appointment.',
    });
  };

  const viewAppointmentDetails = (appointment: AppointmentWithClient) => {
    setSelectedAppointment(appointment);
    setIsDetailsOpen(true);
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
    setDateFilter(undefined);
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
        Error loading appointments: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Appointments</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshAppointments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Create New Appointment</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="min-w-[100px]">
                      Cancel
                    </Button>
                    <Button type="submit" className="min-w-[100px]" disabled={isSubmitting}>
                      Create Appointment
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by client or type"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFilter && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto min-w-[250px] p-0">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={resetFilters} className="w-full">
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Appointments Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('start_time')}>
                Date & Time
                {sortConfig.key === 'start_time' && (
                  sortConfig.direction === 'asc' ? 
                    <ChevronUp className="inline ml-1 h-4 w-4" /> : 
                    <ChevronDown className="inline ml-1 h-4 w-4" />
                )}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('client')}>
                Client
                {sortConfig.key === 'client' && (
                  sortConfig.direction === 'asc' ? 
                    <ChevronUp className="inline ml-1 h-4 w-4" /> : 
                    <ChevronDown className="inline ml-1 h-4 w-4" />
                )}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                Status
                {sortConfig.key === 'status' && (
                  sortConfig.direction === 'asc' ? 
                    <ChevronUp className="inline ml-1 h-4 w-4" /> : 
                    <ChevronDown className="inline ml-1 h-4 w-4" />
                )}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('type')}>
                Type
                {sortConfig.key === 'type' && (
                  sortConfig.direction === 'asc' ? 
                    <ChevronUp className="inline ml-1 h-4 w-4" /> : 
                    <ChevronDown className="inline ml-1 h-4 w-4" />
                )}
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAppointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                  No appointments found
                </TableCell>
              </TableRow>
            ) : (
              filteredAppointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    {appointment.formatted_start_time 
                      ? (
                        <>
                          {format(new Date(appointment.formatted_start_time), 'MMM d, yyyy h:mm a')}
                          {appointment.formatted_end_time && (
                            <> - {format(new Date(appointment.formatted_end_time), 'h:mm a')}</>
                          )}
                        </>
                      )
                      : (
                        <>
                          {format(new Date(appointment.start_time), 'MMM d, yyyy h:mm a')}
                          {appointment.end_time && (
                            <> - {format(new Date(appointment.end_time), 'h:mm a')}</>
                          )}
                        </>
                      )}
                  </TableCell>
                  <TableCell>{appointment.client?.name || 'Unknown Client'}</TableCell>
                  <TableCell>
                    <Badge className={`${
                      appointment.status === 'confirmed' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                      appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' :
                      appointment.status === 'cancelled' ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                      appointment.status === 'completed' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' :
                      'bg-gray-100 text-gray-800 hover:bg-gray-100'
                    }`}>
                      {appointment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{appointment.type}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewAppointmentDetails(appointment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      {appointment.status === 'pending' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                          >
                            Confirm
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {appointment.status === 'confirmed' && new Date(appointment.start_time) < new Date() && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                        >
                          Mark Completed
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Appointment Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Client</h3>
                  <p className="text-base">{selectedAppointment.client?.name || 'Unknown Client'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <Badge className={`mt-1 ${
                    selectedAppointment.status === 'confirmed' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                    selectedAppointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' :
                    selectedAppointment.status === 'cancelled' ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                    selectedAppointment.status === 'completed' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' :
                    'bg-gray-100 text-gray-800 hover:bg-gray-100'
                  }`}>
                    {selectedAppointment.status}
                  </Badge>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Contact Information</h3>
                <p className="text-base">{selectedAppointment.client?.email || 'No email provided'}</p>
                <p className="text-base">{selectedAppointment.client?.phone || 'No phone provided'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Start Time</h3>
                  <p className="text-base">
                    {selectedAppointment.formatted_start_time 
                      ? format(new Date(selectedAppointment.formatted_start_time), 'MMM d, yyyy h:mm a')
                      : format(new Date(selectedAppointment.start_time), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">End Time</h3>
                  <p className="text-base">
                    {selectedAppointment.formatted_end_time 
                      ? format(new Date(selectedAppointment.formatted_end_time), 'MMM d, yyyy h:mm a')
                      : format(new Date(selectedAppointment.end_time), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Appointment Type</h3>
                <p className="text-base">{selectedAppointment.type}</p>
              </div>
              
              {selectedAppointment.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                  <p className="text-base whitespace-pre-wrap">{selectedAppointment.notes}</p>
                </div>
              )}
              
              <DialogFooter className="flex justify-center gap-4 mt-6 sm:justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDetailsOpen(false)}
                  className="min-w-[100px]"
                >
                  Close
                </Button>
                {selectedAppointment.status === 'pending' && (
                  <>
                    <Button 
                      onClick={() => {
                        handleStatusUpdate(selectedAppointment.id, 'confirmed');
                        setIsDetailsOpen(false);
                      }}
                      className="min-w-[100px]"
                    >
                      Confirm
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        handleStatusUpdate(selectedAppointment.id, 'cancelled');
                        setIsDetailsOpen(false);
                      }}
                      className="min-w-[100px]"
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {selectedAppointment.status === 'confirmed' && new Date(selectedAppointment.start_time) < new Date() && (
                  <Button 
                    onClick={() => {
                      handleStatusUpdate(selectedAppointment.id, 'completed');
                      setIsDetailsOpen(false);
                    }}
                    className="min-w-[100px]"
                  >
                    Mark Completed
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add the conflict resolution dialog */}
      <ConflictResolutionDialog
        isOpen={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        availabilityConflict={conflicts?.availabilityConflict || null}
        timeOffConflict={conflicts?.timeOffConflict || null}
        onCancel={() => {
          setShowConflictDialog(false);
          setPendingAppointmentData(null);
        }}
        onOverride={handleOverride}
        onReschedule={handleReschedule}
      />
    </div>
  );
} 