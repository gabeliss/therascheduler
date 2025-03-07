import { z } from 'zod';
import { findTimeIndex } from './time-utils';

// Base availability form schema
export const baseAvailabilitySchema = z.object({
  type: z.enum(['recurring', 'specific']),
  days: z.array(z.string()).optional(),
  date: z.date().optional(),
  startTime: z.string(),
  endTime: z.string(),
});

// Exception form schema
export const exceptionSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  reason: z.string().optional(),
  isRecurring: z.boolean().default(false),
});

// Define the types after the schemas
export type BaseAvailabilityFormValues = z.infer<typeof baseAvailabilitySchema>;
export type ExceptionFormValues = z.infer<typeof exceptionSchema>;

// Add refinements after the types are defined
export const refinedBaseSchema = baseAvailabilitySchema.refine(
  (data) => {
    console.log('Validating form data:', data);
    if (data.type === 'recurring') {
      const isValid = !!(data.days && data.days.length > 0);
      console.log('Recurring validation result:', isValid);
      return isValid;
    }
    return true;
  },
  {
    message: 'Select at least one day',
    path: ['days'],
  }
).refine(
  (data) => {
    if (data.type === 'specific') {
      const isValid = !!data.date;
      console.log('Specific date validation result:', isValid);
      return isValid;
    }
    return true;
  },
  {
    message: 'Select a specific date',
    path: ['date'],
  }
).refine(
  (data) => {
    // Ensure end time is after start time
    if (data.startTime && data.endTime) {
      const startIndex = findTimeIndex(data.startTime);
      const endIndex = findTimeIndex(data.endTime);
      const isValid = endIndex > startIndex;
      console.log('Time range validation result:', isValid);
      return isValid;
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
);

export const refinedExceptionSchema = exceptionSchema.refine(
  (data) => {
    // Ensure end time is after start time
    if (data.startTime && data.endTime) {
      const startIndex = findTimeIndex(data.startTime);
      const endIndex = findTimeIndex(data.endTime);
      return endIndex > startIndex;
    }
    return true;
  },
  {
    message: 'End time must be after start time',
    path: ['endTime'],
  }
); 