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
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string;
  created_at: string;
  updated_at: string;
}

// Legacy availability types
export interface Availability {
  id: string;
  therapist_id: string;
  start_time: string;
  end_time: string;
  recurrence: string | null; // "weekly:Day1,Day2,..." or null for one-time
  reason?: string;
  created_at: string;
  updated_at: string;
}

// Hierarchical availability types
export interface BaseAvailability {
  id: string;
  therapist_id: string;
  start_time: string;
  end_time: string;
  recurrence: string | null; // "weekly:Day1,Day2,..." or null for one-time
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
  startTime: string;
  endTime: string;
  recurrence: string | null; // "weekly:Day1,Day2,..." or null for one-time
}

export interface ExceptionInput {
  baseAvailabilityId: string;
  startTime: string;
  endTime: string;
  reason?: string;
} 