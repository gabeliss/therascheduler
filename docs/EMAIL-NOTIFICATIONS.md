# Email Notification System

## Overview

The email notification system in TheraScheduler is designed to keep both therapists and clients informed about appointment status changes. This document outlines how the system works and how to extend it for future needs.

## Current Implementation

For the MVP, we've implemented a simple email notification system that logs emails to the console. In a production environment, this would be replaced with a proper email service integration.

### Email Types

The system currently supports the following notification types:

1. **Pending** - Sent when a new appointment is created
2. **Confirmed** - Sent when an appointment is confirmed by the therapist
3. **Cancelled** - Sent when an appointment is cancelled
4. **Completed** - Sent when an appointment is marked as completed
5. **Reminder** - Ready for implementation, but not yet triggered automatically

### Components

The email system consists of:

1. **Email Service Utility** (`app/utils/email-service.ts`)

   - Contains email templates for different notification types
   - Provides functions to send emails

2. **Email API Endpoint** (`app/api/email/send/route.ts`)

   - Receives email requests from the client
   - Currently logs emails to the console
   - Will be replaced with actual email sending in production

3. **Integration with Appointment Management** (`app/hooks/use-appointments.ts`)
   - Triggers email notifications when appointments are created or their status changes

## How It Works

1. When an appointment is created or its status is updated, the `use-appointments.ts` hook calls the `sendAppointmentStatusNotification` function.

2. This function selects the appropriate email template based on the appointment status and sends emails to both the client and therapist.

3. The emails are sent via the `/api/email/send` endpoint, which currently logs them to the console.

## Future Enhancements

For the production version, consider the following enhancements:

1. **Email Service Integration**

   - Integrate with a service like SendGrid, Mailgun, or AWS SES
   - Implement proper email templates with HTML/CSS styling
   - Add tracking for email delivery and opens

2. **Automated Reminders**

   - Implement a scheduled job to send reminders 24 hours and 1 hour before appointments
   - Allow clients and therapists to configure reminder preferences

3. **SMS Notifications**

   - Add SMS notifications for clients who prefer text messages
   - Implement a similar template system for SMS content

4. **Calendar Attachments**
   - Add .ics calendar attachments to confirmation emails
   - Enable one-click calendar adding for popular calendar services

## Testing

To test the email system:

1. Create a new appointment or update an existing appointment's status
2. Check the server console logs to see the email content
3. In production, you would verify actual email delivery

## Configuration

For production deployment, you'll need to:

1. Add appropriate environment variables for your email service
2. Update the email sending logic in `app/api/email/send/route.ts`
3. Consider implementing email templates using a template engine for better maintainability
