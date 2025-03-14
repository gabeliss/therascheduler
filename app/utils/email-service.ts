import { Appointment } from '@/app/types';
import { format } from 'date-fns';

// Create a more specific type for email templates to use
interface EmailAppointment {
  id: string;
  start_time: string;
  end_time: string;
  type?: string;
  notes?: string;
  client?: {
    name?: string;
    email?: string;
  };
}

// Email templates for different appointment statuses
const EMAIL_TEMPLATES = {
  pending: {
    subject: 'New Appointment Request',
    clientBody: (appointment: EmailAppointment, therapistName: string) => `
      <h1>Your Appointment Request</h1>
      <p>Dear ${appointment.client?.name || 'Client'},</p>
      <p>Your appointment request with ${therapistName} has been received and is pending confirmation.</p>
      <p><strong>Appointment Details:</strong></p>
      <ul>
        <li>Date: ${format(new Date(appointment.start_time), 'EEEE, MMMM do, yyyy')}</li>
        <li>Time: ${format(new Date(appointment.start_time), 'h:mm a')} - ${format(new Date(appointment.end_time), 'h:mm a')}</li>
        <li>Type: ${appointment.type || 'Consultation'}</li>
      </ul>
      <p>You will receive another email once your appointment has been confirmed.</p>
      <p>Thank you for using TheraScheduler!</p>
    `,
    therapistBody: (appointment: EmailAppointment) => `
      <h1>New Appointment Request</h1>
      <p>You have received a new appointment request from ${appointment.client?.name || 'a client'}.</p>
      <p><strong>Appointment Details:</strong></p>
      <ul>
        <li>Client: ${appointment.client?.name || 'Unknown'}</li>
        <li>Email: ${appointment.client?.email || 'Unknown'}</li>
        <li>Date: ${format(new Date(appointment.start_time), 'EEEE, MMMM do, yyyy')}</li>
        <li>Time: ${format(new Date(appointment.start_time), 'h:mm a')} - ${format(new Date(appointment.end_time), 'h:mm a')}</li>
        <li>Type: ${appointment.type || 'Consultation'}</li>
        <li>Notes: ${appointment.notes || 'None'}</li>
      </ul>
      <p>Please log in to your dashboard to confirm or reschedule this appointment.</p>
    `
  },
  confirmed: {
    subject: 'Appointment Confirmed',
    clientBody: (appointment: EmailAppointment, therapistName: string) => `
      <h1>Your Appointment is Confirmed</h1>
      <p>Dear ${appointment.client?.name || 'Client'},</p>
      <p>Your appointment with ${therapistName} has been confirmed.</p>
      <p><strong>Appointment Details:</strong></p>
      <ul>
        <li>Date: ${format(new Date(appointment.start_time), 'EEEE, MMMM do, yyyy')}</li>
        <li>Time: ${format(new Date(appointment.start_time), 'h:mm a')} - ${format(new Date(appointment.end_time), 'h:mm a')}</li>
        <li>Type: ${appointment.type || 'Consultation'}</li>
      </ul>
      <p>We look forward to seeing you!</p>
      <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
    `,
    therapistBody: (appointment: EmailAppointment) => `
      <h1>Appointment Confirmed</h1>
      <p>You have confirmed an appointment with ${appointment.client?.name || 'a client'}.</p>
      <p><strong>Appointment Details:</strong></p>
      <ul>
        <li>Client: ${appointment.client?.name || 'Unknown'}</li>
        <li>Email: ${appointment.client?.email || 'Unknown'}</li>
        <li>Date: ${format(new Date(appointment.start_time), 'EEEE, MMMM do, yyyy')}</li>
        <li>Time: ${format(new Date(appointment.start_time), 'h:mm a')} - ${format(new Date(appointment.end_time), 'h:mm a')}</li>
        <li>Type: ${appointment.type || 'Consultation'}</li>
      </ul>
      <p>This appointment has been added to your schedule.</p>
    `
  },
  cancelled: {
    subject: 'Appointment Cancelled',
    clientBody: (appointment: EmailAppointment, therapistName: string) => `
      <h1>Your Appointment has been Cancelled</h1>
      <p>Dear ${appointment.client?.name || 'Client'},</p>
      <p>Your appointment with ${therapistName} scheduled for ${format(new Date(appointment.start_time), 'EEEE, MMMM do, yyyy')} at ${format(new Date(appointment.start_time), 'h:mm a')} has been cancelled.</p>
      <p>If you would like to reschedule, please visit our booking page or contact us directly.</p>
      <p>We apologize for any inconvenience.</p>
    `,
    therapistBody: (appointment: EmailAppointment) => `
      <h1>Appointment Cancelled</h1>
      <p>An appointment with ${appointment.client?.name || 'a client'} has been cancelled.</p>
      <p><strong>Cancelled Appointment Details:</strong></p>
      <ul>
        <li>Client: ${appointment.client?.name || 'Unknown'}</li>
        <li>Date: ${format(new Date(appointment.start_time), 'EEEE, MMMM do, yyyy')}</li>
        <li>Time: ${format(new Date(appointment.start_time), 'h:mm a')} - ${format(new Date(appointment.end_time), 'h:mm a')}</li>
        <li>Type: ${appointment.type || 'Consultation'}</li>
      </ul>
      <p>This time slot is now available for other appointments.</p>
    `
  },
  completed: {
    subject: 'Appointment Completed',
    clientBody: (appointment: EmailAppointment, therapistName: string) => `
      <h1>Your Appointment is Complete</h1>
      <p>Dear ${appointment.client?.name || 'Client'},</p>
      <p>Thank you for attending your appointment with ${therapistName} on ${format(new Date(appointment.start_time), 'EEEE, MMMM do, yyyy')}.</p>
      <p>We hope your session was beneficial. If you would like to schedule another appointment, please visit our booking page.</p>
      <p>Thank you for choosing TheraScheduler!</p>
    `,
    therapistBody: (appointment: EmailAppointment) => `
      <h1>Appointment Completed</h1>
      <p>Your appointment with ${appointment.client?.name || 'a client'} has been marked as completed.</p>
      <p><strong>Appointment Details:</strong></p>
      <ul>
        <li>Client: ${appointment.client?.name || 'Unknown'}</li>
        <li>Date: ${format(new Date(appointment.start_time), 'EEEE, MMMM do, yyyy')}</li>
        <li>Time: ${format(new Date(appointment.start_time), 'h:mm a')} - ${format(new Date(appointment.end_time), 'h:mm a')}</li>
        <li>Type: ${appointment.type || 'Consultation'}</li>
      </ul>
    `
  },
  reminder: {
    subject: 'Appointment Reminder',
    clientBody: (appointment: EmailAppointment, therapistName: string) => `
      <h1>Appointment Reminder</h1>
      <p>Dear ${appointment.client?.name || 'Client'},</p>
      <p>This is a friendly reminder about your upcoming appointment with ${therapistName}.</p>
      <p><strong>Appointment Details:</strong></p>
      <ul>
        <li>Date: ${format(new Date(appointment.start_time), 'EEEE, MMMM do, yyyy')}</li>
        <li>Time: ${format(new Date(appointment.start_time), 'h:mm a')} - ${format(new Date(appointment.end_time), 'h:mm a')}</li>
        <li>Type: ${appointment.type || 'Consultation'}</li>
      </ul>
      <p>We look forward to seeing you!</p>
      <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
    `,
    therapistBody: (appointment: EmailAppointment) => `
      <h1>Appointment Reminder</h1>
      <p>This is a reminder about your upcoming appointment with ${appointment.client?.name || 'a client'}.</p>
      <p><strong>Appointment Details:</strong></p>
      <ul>
        <li>Client: ${appointment.client?.name || 'Unknown'}</li>
        <li>Date: ${format(new Date(appointment.start_time), 'EEEE, MMMM do, yyyy')}</li>
        <li>Time: ${format(new Date(appointment.start_time), 'h:mm a')} - ${format(new Date(appointment.end_time), 'h:mm a')}</li>
        <li>Type: ${appointment.type || 'Consultation'}</li>
      </ul>
    `
  }
};

// Function to send email using the server API
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Function to send appointment status notification emails
export async function sendAppointmentStatusNotification(
  appointment: Appointment,
  therapistName: string,
  therapistEmail: string,
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'reminder'
): Promise<boolean> {
  try {
    const template = EMAIL_TEMPLATES[status];
    
    if (!template) {
      throw new Error(`No email template found for status: ${status}`);
    }

    // Convert Appointment to EmailAppointment
    const emailAppointment: EmailAppointment = {
      id: appointment.id,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      type: (appointment as any).type,
      notes: (appointment as any).notes,
      client: (appointment as any).client
    };

    // Only send client email if we have client information
    if (emailAppointment.client?.email) {
      const clientEmailSent = await sendEmail(
        emailAppointment.client.email,
        template.subject,
        template.clientBody(emailAppointment, therapistName)
      );
      
      if (!clientEmailSent) {
        console.error('Failed to send email to client');
      }
    }

    // Send email to therapist
    const therapistEmailSent = await sendEmail(
      therapistEmail,
      template.subject,
      template.therapistBody(emailAppointment)
    );

    if (!therapistEmailSent) {
      console.error('Failed to send email to therapist');
    }

    return true;
  } catch (error) {
    console.error('Error sending appointment notification:', error);
    return false;
  }
} 