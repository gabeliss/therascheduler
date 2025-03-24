export interface Therapist {
  id: string;
  email: string;
  name: string;
  availableHours: {
    [key: string]: { // day of week
      start: string;
      end: string;
    }[];
  };
  createdAt: string;
}

export interface Client {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
}

export interface Appointment {
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
  overrides_time_off?: boolean; // Indicates if this appointment overrides a time-off period
  override_reason?: string; // Reason for overriding time-off
  formatted_start_time?: string; // Formatted start time for display
  formatted_end_time?: string; // Formatted end time for display
  display_start_time?: string; // Time string in HH:MM:SS format for display
  display_end_time?: string; // Time string in HH:MM:SS format for display
  date_string?: string; // Date string in YYYY-MM-DD format for filtering
  time_zone?: string; // Full time zone name (e.g., "America/New_York")
  time_zone_abbr?: string; // Time zone abbreviation (e.g., "EDT")
  time_zone_offset?: number; // Timezone offset in minutes
}

// New schema availability model
export interface Availability {
  id: string;
  therapist_id: string;
  start_time: string;  // ISO timestamp
  end_time: string;    // ISO timestamp
  recurrence: string | null; // "weekly:Day1,Day2,..." or null for one-time
  created_at: string;
  updated_at: string;
}

export interface AppointmentRequest {
  therapistId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  startTime: string;
  endTime: string;
}

export interface TherapistProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface ClientProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
}

// Unified time off model for therapist unavailability
export interface TimeOff {
  id: string;
  therapist_id: string;
  start_time: string;   // ISO timestamp
  end_time: string;     // ISO timestamp
  reason?: string;      // Optional reason for time off
  recurrence: string | null; // "weekly:Day1,Day2,..." or null for one-time
  created_at: string;
  updated_at: string;
} 