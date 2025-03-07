'use client';

import { useAuth } from '@/app/context/auth-context';
import { useAppointments } from '@/app/hooks/use-appointments';
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
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { CalendarIcon, ChevronDown, ChevronUp, Eye, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
}

const appointmentSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Invalid email address'),
  clientPhone: z.string().optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  type: z.string().min(1, 'Appointment type is required'),
  notes: z.string().optional(),
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

export default function AppointmentsPage() {
  const { user } = useAuth();
  const { appointments, loading, error, updateAppointmentStatus, createAppointment, refreshAppointments } = useAppointments();
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

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      startTime: '',
      endTime: '',
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
      await createAppointment({
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        startTime: data.startTime,
        endTime: data.endTime,
        type: data.type,
        notes: data.notes,
      });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: 'Appointment created',
        description: 'New appointment has been created successfully.',
      });
    } catch (err) {
      console.error('Failed to create appointment:', err);
      toast({
        title: 'Error',
        description: 'Failed to create appointment.',
        variant: 'destructive',
      });
    }
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
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
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                    <Button type="submit" className="min-w-[100px]">
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
              <PopoverContent className="w-auto p-0">
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
                    {format(new Date(appointment.start_time), 'MMM d, yyyy h:mm a')}
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
                  <p className="text-base">{format(new Date(selectedAppointment.start_time), 'MMM d, yyyy h:mm a')}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">End Time</h3>
                  <p className="text-base">{format(new Date(selectedAppointment.end_time), 'MMM d, yyyy h:mm a')}</p>
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
    </div>
  );
} 