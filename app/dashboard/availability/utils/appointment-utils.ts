import { Appointment } from '@/app/types';
import { format, isWithinInterval, parseISO, isFuture } from 'date-fns';
import { getDaysOfWeekFromRecurrence, DayOfWeek } from '@/app/utils/schema-converters';

/**
 * Checks if a time off block clashes with any existing appointments
 * 
 * @param start_time The start time of the time off block (ISO format)
 * @param end_time The end time of the time off block (ISO format)
 * @param recurrence The recurrence pattern ("weekly:0,1,2" for weekly on Sun,Mon,Tue or null for one-time)
 * @param appointments The list of appointments to check against
 * @returns An object with clash information or null if no clash
 */
export function checkTimeOffAppointmentClash({
  start_time,
  end_time,
  recurrence,
  appointments
}: {
  start_time: string;
  end_time: string;
  recurrence: string | null;
  appointments: Appointment[];
}): { 
  hasClash: boolean; 
  clashingAppointments: Appointment[];
  message: string;
} | null {
  if (!appointments || appointments.length === 0) {
    return null; // No appointments to check against
  }

  // Filter out past appointments first - we don't care about clashes with them
  const currentDate = new Date();
  const futureAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.start_time);
    return appointmentDate > currentDate;
  });
  
  // If no future appointments, return null - no clash to worry about
  if (futureAppointments.length === 0) {
    return null;
  }

  // Since appointments will be rendered over time off blocks anyway,
  // we don't need to warn about clashes. Return null to indicate no clash.
  // This effectively disables clash warnings for appointments.
  return null;

  /* Original implementation would have continued here to identify clashes
  const clashingAppointments: Appointment[] = [];
  const startDate = new Date(start_time);
  const endDate = new Date(end_time);
  
  // Extract time parts for comparisons
  const timeStart = format(startDate, 'HH:mm:ss');
  const timeEnd = format(endDate, 'HH:mm:ss');
  
  // Check if this is an all-day time-off
  const isAllDay = 
    startDate.getHours() === 0 && 
    startDate.getMinutes() === 0 && 
    endDate.getHours() === 23 && 
    endDate.getMinutes() === 59;

  // For recurring time off blocks
  if (recurrence) {
    // Get the days of week this recurring time-off occurs on
    const daysOfWeek = getDaysOfWeekFromRecurrence(recurrence);
    
    // Filter appointments that fall on the same day of week
    const sameWeekdayAppointments = futureAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.start_time);
      return daysOfWeek.includes(appointmentDate.getDay() as DayOfWeek);
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
        (appointmentStartTime >= timeStart && appointmentStartTime < timeEnd) ||
        (appointmentEndTime > timeStart && appointmentEndTime <= timeEnd) ||
        (appointmentStartTime <= timeStart && appointmentEndTime >= timeEnd)
      ) {
        clashingAppointments.push(appointment);
      }
    });
  }
  // For specific date time off blocks
  else {
    // Format date strings for comparison
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    // Filter appointments that fall within the date range
    const dateRangeAppointments = futureAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.start_time);
      const formattedAppointmentDate = format(appointmentDate, 'yyyy-MM-dd');
      
      return formattedAppointmentDate >= startDateStr && formattedAppointmentDate <= endDateStr;
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
        (appointmentStartTime >= timeStart && appointmentStartTime < timeEnd) ||
        (appointmentEndTime > timeStart && appointmentEndTime <= timeEnd) ||
        (appointmentStartTime <= timeStart && appointmentEndTime >= timeEnd)
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
  */

  return null; // No clash
} 