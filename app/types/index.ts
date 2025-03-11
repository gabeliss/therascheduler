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
}

export interface Availability {
  id: string;
  therapist_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  is_available: boolean; // true = available for appointments, false = blocked off
  specific_date?: string; // Format: YYYY-MM-DD
  reason?: string; // Optional reason for blocked time slots
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

// New hierarchical availability model
export interface BaseAvailability {
  id: string;
  therapist_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  specific_date?: string; // Format: YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface AvailabilityException {
  id: string;
  base_availability_id: string;
  start_time: string;
  end_time: string;
  reason?: string; // Reason for the exception (e.g., "Lunch", "Dentist appointment")
  created_at: string;
  updated_at: string;
}

// New unified exception model
export interface UnifiedAvailabilityException {
  id: string;
  therapist_id: string;
  day_of_week?: number; // 0-6 for Sunday-Saturday (only for recurring exceptions)
  start_time: string;
  end_time: string;
  reason?: string;
  is_recurring: boolean;
  start_date?: string; // ISO date string (start date for time-off periods)
  end_date?: string; // ISO date string (end date for time-off periods)
  created_at: string;
  updated_at: string;
  is_all_day?: boolean; // Indicates if this is an all-day time off
}

// Combined type for UI representation
export interface HierarchicalAvailability {
  base: BaseAvailability;
  exceptions: AvailabilityException[];
}

// New unified availability representation for UI
export interface UnifiedAvailability {
  exceptions: UnifiedAvailabilityException[];
} 