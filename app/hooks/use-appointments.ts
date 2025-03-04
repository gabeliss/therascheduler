import { useEffect, useState } from 'react';
import { supabase } from '@/app/utils/supabase';
import { Appointment } from '@/app/types';

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:client_profiles(*)
        `)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function updateAppointmentStatus(id: string, status: Appointment['status']) {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      await fetchAppointments(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }

  async function createAppointment({
    clientName,
    clientEmail,
    clientPhone,
    startTime,
    endTime,
    type,
    notes,
  }: {
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    startTime: string;
    endTime: string;
    type: string;
    notes?: string;
  }) {
    try {
      // First, create or get the client profile
      const { data: existingClient, error: clientError } = await supabase
        .from('client_profiles')
        .select('id')
        .eq('email', clientEmail)
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
              name: clientName,
              email: clientEmail,
              phone: clientPhone,
            },
          ])
          .select('id')
          .single();

        if (createError) throw createError;
        clientId = newClient.id;
      }

      // Get the therapist profile ID
      const { data: therapist, error: therapistError } = await supabase
        .from('therapist_profiles')
        .select('id')
        .single();

      if (therapistError) throw therapistError;

      // Create the appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert([
          {
            therapist_id: therapist.id,
            client_id: clientId,
            start_time: startTime,
            end_time: endTime,
            type,
            notes,
            status: 'pending',
          },
        ]);

      if (appointmentError) throw appointmentError;

      await fetchAppointments(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  }

  return {
    appointments,
    loading,
    error,
    updateAppointmentStatus,
    createAppointment,
    refreshAppointments: fetchAppointments,
  };
} 