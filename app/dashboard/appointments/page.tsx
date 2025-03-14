'use client';

import { useAuth } from '@/app/context/auth-context';
import { useAppointments, ConflictCheckResult } from '@/app/hooks/use-appointments';
import { useState, useEffect } from 'react';
import { isAfter, isBefore, startOfDay, endOfDay, format } from 'date-fns';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { AppointmentWithClient } from './types';
import AppointmentForm, { AppointmentFormValues } from './components/AppointmentForm';
import AppointmentFilters from './components/AppointmentFilters';
import AppointmentTable from './components/AppointmentTable';
import AppointmentDetails from './components/AppointmentDetails';
import { formatDateForInput, validateTimeRange } from '@/app/utils/time-utils';
import EnhancedConflictResolutionDialog from './components/EnhancedConflictResolutionDialog';
import { supabase } from '@/app/utils/supabase';
import { sendAppointmentStatusNotification } from '@/app/utils/email-service';
import { Appointment } from '@/app/types';
import { useTherapistProfile } from '@/app/hooks/use-therapist-profile';

export default function AppointmentsPage() {
  // We're keeping the useAuth hook for future use but not using it actively
  const auth = useAuth();
  const { 
    appointments, 
    loading, 
    error, 
    updateAppointmentStatus, 
    createAppointment, 
    checkConflicts,
    refreshAppointments
  } = useAppointments();
  const { therapistProfile } = useTherapistProfile();
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
      // Use the correct type instead of any
      await updateAppointmentStatus(id, newStatus);
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
    setIsSubmitting(true);
    
    try {
      // Validate that we have valid date objects
      const startDateTime = new Date(data.startTime);
      const endDateTime = new Date(data.endTime);
      
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        console.error('Invalid date values:', { startTime: data.startTime, endTime: data.endTime });
        toast({
          title: 'Invalid date',
          description: 'Please select valid date and time values.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      
      // Format the appointment date for conflict checking
      const appointmentDate = format(startDateTime, 'yyyy-MM-dd');
      const startTimeISO = startDateTime.toISOString();
      const endTimeISO = endDateTime.toISOString();

      console.log('Checking conflicts with:', {
        appointmentDate,
        startTimeISO,
        endTimeISO
      });

      // Call checkConflicts with all required parameters
      const conflictResult = await checkConflicts(
        appointmentDate,
        startTimeISO, // Use full ISO string instead of just time
        endTimeISO,   // Use full ISO string instead of just time
        '', // The therapist ID will be determined inside the checkConflicts function
        [], // We'll fetch exceptions in the function
        appointments
      );
      
      // Store the form data in case we need it for conflict resolution
      setPendingAppointmentData(data);
      
      if (conflictResult.hasConflict) {
        console.log('Conflicts detected:', conflictResult);
        // Show conflict resolution dialog
        setConflicts(conflictResult);
        setShowConflictDialog(true);
        setIsSubmitting(false);
        return;
      }
      
      // First, create or get the client profile
      const { data: existingClient, error: clientError } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('email', data.clientEmail)
        .single();

      if (clientError && clientError.code !== 'PGRST116') {
        throw clientError;
      }

      let clientId: string;
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Create a new client profile
        const { data: newClient, error: createError } = await supabase
          .from('client_profiles')
          .insert([
            {
              name: data.clientName,
              email: data.clientEmail,
              phone: data.clientPhone,
            },
          ])
          .select('id')
          .single();

        if (createError) throw createError;
        clientId = newClient.id;
      }
      
      // No conflicts, create the appointment
      const appointmentData: any = {
        therapist_id: therapistProfile?.id,
        client_id: clientId,
        start_time: startTimeISO,
        end_time: endTimeISO,
        status: 'pending',
        notes: data.notes,
        type: data.type
      };
      
      const result = await createAppointment(appointmentData);
      
      if (!result.success) {
        if (result.conflicts) {
          // Handle newly detected conflicts
          setConflicts(result.conflicts);
          setShowConflictDialog(true);
          setIsSubmitting(false);
          return;
        } else {
          throw new Error('Failed to create appointment');
        }
      }
      
      toast({
        title: 'Appointment created',
        description: 'The appointment has been successfully created.',
      });
      
      // Reset form and close dialog
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
      // Validate that we have valid date objects
      const startDateTime = new Date(pendingAppointmentData.startTime);
      const endDateTime = new Date(pendingAppointmentData.endTime);
      
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        console.error('Invalid date values:', { 
          startTime: pendingAppointmentData.startTime, 
          endTime: pendingAppointmentData.endTime 
        });
        toast({
          title: 'Invalid date',
          description: 'Please select valid date and time values.',
          variant: 'destructive',
        });
        return;
      }
      
      const startTimeISO = startDateTime.toISOString();
      const endTimeISO = endDateTime.toISOString();
      
      // First, create or get the client profile
      const { data: existingClient, error: clientError } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('email', pendingAppointmentData.clientEmail)
        .single();

      if (clientError && clientError.code !== 'PGRST116') {
        throw clientError;
      }

      let clientId: string;
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Create a new client profile
        const { data: newClient, error: createError } = await supabase
          .from('client_profiles')
          .insert([
            {
              name: pendingAppointmentData.clientName,
              email: pendingAppointmentData.clientEmail,
              phone: pendingAppointmentData.clientPhone,
            },
          ])
          .select('id')
          .single();

        if (createError) throw createError;
        clientId = newClient.id;
      }
      
      // Create the appointment with override flag
      const appointmentData: any = {
        therapist_id: therapistProfile?.id,
        client_id: clientId,
        start_time: startTimeISO,
        end_time: endTimeISO,
        status: 'pending',
        notes: pendingAppointmentData.notes,
        type: pendingAppointmentData.type,
        overrides_time_off: true,
        override_reason: overrideReason
      };
      
      const result = await createAppointment(appointmentData, true);
      
      if (!result.success) {
        throw new Error('Failed to create appointment with override');
      }
      
      // Close dialogs and reset
      setShowConflictDialog(false);
      setIsDialogOpen(false);
      setPendingAppointmentData(null);
      
      toast({
        title: 'Appointment created',
        description: 'Appointment has been created, overriding scheduling conflicts.',
      });
      
      refreshAppointments();
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
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Filters */}
      <AppointmentFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        resetFilters={resetFilters}
      />

      {/* Appointments Table */}
      <AppointmentTable
        filteredAppointments={filteredAppointments}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sortConfig={sortConfig}
        handleSort={handleSort}
        viewAppointmentDetails={viewAppointmentDetails}
        handleStatusUpdate={handleStatusUpdate}
      />

      {/* Appointment Form Dialog */}
      <AppointmentForm
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Appointment Details Dialog */}
      <AppointmentDetails
        isOpen={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        appointment={selectedAppointment}
        handleStatusUpdate={handleStatusUpdate}
      />

      {/* Conflict Resolution Dialog */}
      <EnhancedConflictResolutionDialog
        isOpen={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        availabilityConflict={conflicts?.availabilityConflict || null}
        timeOffConflict={conflicts?.timeOffConflict || null}
        appointmentConflict={conflicts?.appointmentConflict || null}
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