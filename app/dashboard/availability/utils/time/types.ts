// Define a TimeBlock interface for type safety
export interface TimeBlock {
  id: string;
  start_time: string;
  end_time: string;
  recurrence: string | null;
  type: 'availability' | 'time-off' | 'appointment';
  reason?: string;
  original: any;
  original_time?: string;
  client_name?: string;
  status?: string;
  overrides_time_off?: boolean;
}

// Days of week array
export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// Business hours presets (8am to 6pm)
export const BUSINESS_HOURS = {
  DEFAULT_START: '08:00', // 8:00 AM
  DEFAULT_END: '18:00',   // 6:00 PM
  MORNING_START: '08:00', // 8:00 AM
  MORNING_END: '12:00',   // 12:00 PM
  AFTERNOON_START: '13:00', // 1:00 PM
  AFTERNOON_END: '17:00',   // 5:00 PM
}; 