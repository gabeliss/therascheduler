import { Appointment } from '@/app/types';
import { format, isWithinInterval, parseISO } from 'date-fns';

/**
 * Checks if a time off block clashes with any existing appointments
 * 
 * @param startDate The start date of the time off block (YYYY-MM-DD format)
 * @param endDate The end date of the time off block (YYYY-MM-DD format)
 * @param startTime The start time of the time off block (HH:MM:SS format)
 * @param endTime The end time of the time off block (HH:MM:SS format)
 * @param isRecurring Whether the time off block is recurring
 * @param dayOfWeek The day of week for recurring blocks (0 = Sunday, 6 = Saturday)
 * @param isAllDay Whether the time off block is for the entire day
 * @param appointments The list of appointments to check against
 * @returns An object with clash information or null if no clash
 */
export function checkTimeOffAppointmentClash({
  startDate,
  endDate,
  startTime,
  endTime,
  isRecurring,
  dayOfWeek,
  isAllDay,
  appointments
}: {
  startDate?: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  dayOfWeek?: number;
  isAllDay?: boolean;
  appointments: Appointment[];
}): { 
  hasClash: boolean; 
  clashingAppointments: Appointment[];
  message: string;
} | null {
  if (!appointments || appointments.length === 0) {
    return null; // No appointments to check against
  }

  const clashingAppointments: Appointment[] = [];

  // For recurring time off blocks
  if (isRecurring && dayOfWeek !== undefined) {
    // Filter appointments that fall on the same day of week
    const sameWeekdayAppointments = appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.start_time);
      return appointmentDate.getDay() === dayOfWeek;
    });

    // Check time overlap for each appointment
    sameWeekdayAppointments.forEach(appointment => {
      const appointmentStartTime = format(new Date(appointment.start_time), 'HH:mm:ss');
      const appointmentEndTime = format(new Date(appointment.end_time), 'HH:mm:ss');

      // If all day, it's automatically a clash
      if (isAllDay) {
        clashingAppointments.push(appointment);
        return;
      }

      // Check if appointment time overlaps with time off block
      if (
        (appointmentStartTime >= startTime && appointmentStartTime < endTime) ||
        (appointmentEndTime > startTime && appointmentEndTime <= endTime) ||
        (appointmentStartTime <= startTime && appointmentEndTime >= endTime)
      ) {
        clashingAppointments.push(appointment);
      }
    });
  } 
  // For specific date time off blocks
  else if (!isRecurring && startDate && endDate) {
    // Filter appointments that fall within the date range
    const dateRangeAppointments = appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.start_time);
      const formattedAppointmentDate = format(appointmentDate, 'yyyy-MM-dd');
      
      return formattedAppointmentDate >= startDate && formattedAppointmentDate <= endDate;
    });

    // Check time overlap for each appointment
    dateRangeAppointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.start_time);
      const appointmentStartTime = format(appointmentDate, 'HH:mm:ss');
      const appointmentEndTime = format(new Date(appointment.end_time), 'HH:mm:ss');
      
      // If all day, it's automatically a clash
      if (isAllDay) {
        clashingAppointments.push(appointment);
        return;
      }

      // Check if appointment time overlaps with time off block
      if (
        (appointmentStartTime >= startTime && appointmentStartTime < endTime) ||
        (appointmentEndTime > startTime && appointmentEndTime <= endTime) ||
        (appointmentStartTime <= startTime && appointmentEndTime >= endTime)
      ) {
        clashingAppointments.push(appointment);
      }
    });
  }

  if (clashingAppointments.length > 0) {
    // Format the message based on the number of clashing appointments
    let message = '';
    if (clashingAppointments.length === 1) {
      const appointment = clashingAppointments[0];
      const appointmentDate = format(new Date(appointment.start_time), 'MMMM d, yyyy');
      const appointmentTime = format(new Date(appointment.start_time), 'h:mm a');
      
      // Safely check for client name
      let clientName = 'a client';
      if ('client' in appointment && 
          appointment.client && 
          typeof appointment.client === 'object' && 
          'name' in appointment.client) {
        clientName = String(appointment.client.name);
      }
      
      message = `This time off block clashes with an appointment on ${appointmentDate} at ${appointmentTime} with ${clientName}.`;
    } else {
      message = `This time off block clashes with ${clashingAppointments.length} appointments.`;
    }

    return {
      hasClash: true,
      clashingAppointments,
      message
    };
  }

  return null; // No clash
} 