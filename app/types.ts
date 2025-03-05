// User types
export interface User {
  id: string;
  email: string;
  role: 'therapist' | 'client' | 'admin';
}

// Therapist profile types
export interface TherapistProfile {
  id: string;
  user_id: string;
  name: string;
  bio: string;
  specialties: string[];
  created_at: string;
  updated_at: string;
}

// Appointment types
export interface Appointment {
  id: string;
  therapist_id: string;
  client_id: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  created_at: string;
  updated_at: string;
}

// Legacy availability types
export interface Availability {
  id: string;
  therapist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_recurring: boolean;
  specific_date?: string;
  reason?: string;
  created_at: string;
  updated_at: string;
}

// Hierarchical availability types
export interface BaseAvailability {
  id: string;
  therapist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  specific_date?: string;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityException {
  id: string;
  base_availability_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface HierarchicalAvailability {
  base: BaseAvailability;
  exceptions: AvailabilityException[];
}

// Form input types for hierarchical availability
export interface BaseAvailabilityInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  specificDate?: string;
}

export interface ExceptionInput {
  baseAvailabilityId: string;
  startTime: string;
  endTime: string;
  reason?: string;
} 