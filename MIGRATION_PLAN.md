# Schema Migration Plan

## Overview

This document outlines the comprehensive plan to migrate from the old availability schema to the new unified schema. The old schema used fields like `is_recurring`, `specific_date`, and `day_of_week`, while the new schema uses `recurrence` (string pattern) and ISO format timestamps.

## New Schema Structure

- **Availability**: Uses `start_time`, `end_time`, `recurrence`, `therapist_id`
- **TimeOff**: Uses `start_time`, `end_time`, `recurrence`, `therapist_id`, `reason`

### Recurrence Format

- One-time: `recurrence` is null
- Weekly recurring: `recurrence` is a string in the format "weekly:Day1,Day2,..."
  - Example: "weekly:Sun,Mon" for weekly recurrence on Sunday and Monday

## Database Schema Changes

1. Modify `availability` table:

   - Remove columns: `is_recurring`, `day_of_week`, `specific_date`, `is_available`
   - Add column: `recurrence` (text, nullable)

2. Modify `time_off` table:
   - Remove columns: `is_recurring`, `day_of_week`, `specific_date`, `start_date`, `end_date`, `isAllDay`
   - Add column: `recurrence` (text, nullable)

## Files to Update

### Core Types and Utilities

- [x] `app/types/index.ts` - Update interface definitions
- [x] `app/utils/schema-converters.ts` - Create utility functions for schema conversion
- [x] `app/hooks/use-therapist-availability.ts` - Update to use new schema
- [x] `app/hooks/use-unified-availability.ts` - Update to use new schema

### API Routes

- [ ] `app/api/availability/create/route.ts` - Convert all query parameters and logic
- [ ] `app/api/availability/unified/route.ts` - Update to use new schema
- [ ] `app/api/widget-preview/get-slots/route.tsx` - Update filtering logic

### Booking Pages

- [ ] `app/book/page.tsx` - Update availability queries
- [ ] `app/book/embed/page.tsx` - Update availability queries

### Dashboard Components

- [ ] `app/dashboard/availability/page.tsx` - Major update needed
- [ ] `app/dashboard/availability/components/CalendarView.tsx` - Update filtering logic
- [ ] `app/dashboard/availability/components/TimeOffManager.tsx` - Update sorting and filtering
- [ ] `app/dashboard/availability/components/EditTimeOffDialog.tsx` - Major update needed
- [ ] `app/dashboard/availability/components/EditAvailabilityDialog.tsx` - Major update needed
- [ ] `app/dashboard/availability/utils/time/availability.ts` - Update availability processing
- [ ] `app/dashboard/availability/utils/time/conflicts.ts` - Update conflict detection logic
- [ ] `app/dashboard/availability/utils/time/types.ts` - Update type definitions
- [ ] `app/dashboard/appointments/components/EnhancedConflictResolutionDialog.tsx` - Update conflict handling

### Hooks and Utilities

- [ ] `app/hooks/use-appointments.ts` - Update exception handling
- [ ] `app/hooks/use-availability.ts` - Complete rewrite needed to use new schema
- [ ] `app/dashboard/availability/utils/components/TimeBlockRenderer.tsx` - Update rendering logic

## Migration Strategy

1. First update all core types and utilities (completed)
2. Then update server-side API routes
3. Next update client-side hooks and utilities
4. Finally update UI components

## Testing Plan

For each component:

1. Test availability creation with both recurring and one-time slots
2. Test time-off creation with both recurring and one-time slots
3. Verify conflict detection works correctly
4. Verify calendar displays correctly
5. Verify booking flow works with new schema

## Rollback Plan

If issues arise, consider implementing temporary compatibility layers for critical paths until all components can be updated.

## Note on Data Migration

A separate database migration script will be needed to convert existing data from the old schema to the new schema.
