# Conflict Handling System

## Overview

The conflict handling system in TheraScheduler helps therapists manage scheduling conflicts between appointments and their availability or time-off periods. This document outlines how the system works and the enhancements made to improve the user experience.

## Conflict Types

The system detects two main types of conflicts:

1. **Availability Conflicts**: When an appointment is scheduled outside the therapist's regular availability hours.
2. **Time-Off Conflicts**: When an appointment conflicts with a therapist's scheduled time-off period.

## Conflict Severity Levels

Conflicts are categorized by severity to help therapists make informed decisions:

1. **High Severity** (Red): Conflicts with specific date time-off periods. These are typically important commitments that should rarely be overridden.
2. **Medium Severity** (Amber): Conflicts with recurring time-off periods. These are regular breaks that can occasionally be overridden.
3. **Low Severity** (Yellow): Appointments outside regular availability hours. These are less critical and mainly serve as informational warnings.

## Enhanced Conflict Resolution Dialog

The enhanced conflict resolution dialog provides:

1. **Visual Cues**: Color-coded severity indicators help quickly identify the importance of the conflict.
2. **Detailed Information**: Clear explanations of the conflict, including specific times and dates.
3. **Confirmation Requirements**: For high-severity conflicts, therapists must:

   - Provide a reason for the override
   - Explicitly confirm they understand the conflict

4. **Recommendations**: Suggestions for how to handle the conflict, such as:
   - Rescheduling to a time within regular availability
   - Updating availability settings if this is a recurring need
   - Providing clear reasons for exceptions

## Override Tracking

When a therapist chooses to override a conflict:

1. The override reason is recorded in the appointment record
2. A flag is set indicating that this appointment overrides a time-off period
3. This information is available for reporting and analysis

## Implementation Details

The conflict handling system consists of:

1. **Conflict Detection** (`use-appointments.ts`):

   - Checks for conflicts with availability and time-off periods
   - Returns detailed conflict information

2. **Conflict Resolution Dialog** (`EnhancedConflictResolutionDialog.tsx`):

   - Presents conflict information in a user-friendly way
   - Collects override reasons and confirmations
   - Provides options to reschedule or proceed

3. **Appointment Creation** (`use-appointments.ts`):
   - Records override information when conflicts are overridden
   - Stores the reason for future reference

## Best Practices

For therapists:

1. **Respect High-Severity Conflicts**: Only override specific date time-off periods for genuine emergencies or exceptional circumstances.
2. **Document Override Reasons**: Always provide clear, specific reasons when overriding conflicts.
3. **Update Availability Settings**: If you regularly book outside your availability hours, consider updating your regular availability instead of constantly overriding.
4. **Review Overrides**: Periodically review appointments that override time-off to ensure you're maintaining appropriate boundaries.

## Future Enhancements

Planned improvements to the conflict handling system:

1. **Conflict Analytics**: Reports showing patterns of overrides to help therapists better manage their boundaries.
2. **Client Notifications**: Special notifications for clients when appointments are booked during unusual hours.
3. **Calendar Integration**: Better visibility of conflicts in calendar views.
4. **Automated Suggestions**: Smart suggestions for alternative times when conflicts are detected.
