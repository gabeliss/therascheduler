// Define ClientProfile interface
export interface ClientProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
}

// Extended Appointment interface with client property
export interface AppointmentWithClient {
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

// Status filter options
export const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' },
];

// Appointment type options
export const APPOINTMENT_TYPES = [
  { value: 'initial-consultation', label: 'Initial Consultation' },
  { value: 'therapy-session', label: 'Therapy Session' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'other', label: 'Other' },
]; 