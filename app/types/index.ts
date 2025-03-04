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
  therapistId: string;
  clientId: string;
  status: 'pending' | 'approved' | 'denied' | 'canceled';
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface AppointmentRequest {
  therapistId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  startTime: string;
  endTime: string;
} 