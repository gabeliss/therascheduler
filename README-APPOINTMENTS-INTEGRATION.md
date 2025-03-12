# Appointments and Availability Integration

This document outlines how appointments and availability are integrated in TheraScheduler.

## Database Schema

### Appointments Table

The appointments table has been enhanced with the following columns:

- `overrides_time_off` (boolean): Indicates if this appointment was scheduled during a time-off period
- `override_reason` (text): Reason provided by the therapist for scheduling during time-off

### Relationships

- Appointments are linked to therapist availability through the `therapist_id` field
- When an appointment is created, it checks for conflicts with:
  - Regular availability hours
  - Time-off periods (both recurring and specific dates)

## Conflict Resolution

When creating an appointment, the system checks for two types of conflicts:

1. **Availability Conflicts**: The appointment time is outside regular availability hours
2. **Time-Off Conflicts**: The appointment conflicts with a scheduled time-off period

If conflicts are detected, a conflict resolution dialog is shown with options to:

- Cancel the appointment creation
- Reschedule to a different time
- Override the conflict with a reason (for time-off conflicts)

## UI Integration

### Appointments Page

- The appointments page now checks for conflicts when creating appointments
- A conflict resolution dialog is shown when conflicts are detected
- Appointments that override time-off are visually indicated

### Availability Page

- The availability page now shows booked appointments in both weekly and calendar views
- Appointments are color-coded based on their status:
  - Confirmed: Blue
  - Pending: Yellow
  - Cancelled: Gray
- Appointments that override time-off are specially marked
- Toggle switches allow showing/hiding appointments in the views

## Implementation Details

### Hooks

- `useAppointments`: Enhanced to check for conflicts with availability and time-off
- `useTherapistAvailability`: Used to retrieve and manage availability slots
- `useUnifiedAvailability`: Used to retrieve and manage time-off periods

### Components

- `ConflictResolutionDialog`: Displays conflicts and provides resolution options
- `WeeklyView`: Updated to show appointments alongside availability and time-off
- `UnifiedCalendarView`: Updated to show appointments in the calendar view

## Usage Guidelines

### Creating Appointments

1. When creating an appointment, the system automatically checks for conflicts
2. If conflicts exist, the therapist can:
   - Choose a different time (recommended)
   - Override the conflict with a reason (for urgent appointments)

### Managing Time-Off

1. Time-off periods are respected by default when scheduling appointments
2. If an appointment is scheduled during time-off, it's marked as an override
3. If a time-off period is scheduled after appointments exist, the system will warn about conflicts

## Future Enhancements

- Email notifications when appointments are scheduled during time-off
- Batch rescheduling when new time-off periods conflict with existing appointments
- Client-facing booking that respects therapist availability and time-off
- Google Calendar integration for two-way sync of appointments and time-off
