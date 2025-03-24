import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createRecurrenceString, DayOfWeek } from '@/app/utils/schema-converters';

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
    // Set reasonable timeouts in the Supabase client options
    db: {
      schema: 'public',
    },
  }
);

// Helper function to validate ISO timestamp
function isValidISOTimestamp(timestamp: string): boolean {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

// Helper function to check if end time is after start time for ISO timestamps
function isEndTimeAfterStartTime(startTime: string, endTime: string): boolean {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  return endDate > startDate;
}

// Helper function to check for overlapping availability slots
async function checkForOverlappingSlots(
  therapistId: string,
  startTime: string,
  endTime: string,
  recurrence: string | null
): Promise<boolean> {
  // Query to find existing availability slots for the therapist
  const { data: existingSlots, error } = await supabaseAdmin
    .from('availability')
    .select('*')
    .eq('therapist_id', therapistId);

  if (error || !existingSlots) {
    console.error('Error checking for overlapping slots:', error);
    return false; // Assume no overlap if there's an error
  }

  const newStartTime = new Date(startTime);
  const newEndTime = new Date(endTime);
  const newDayOfWeek = newStartTime.getDay() as DayOfWeek;
  const isRecurringSlot = recurrence !== null;

  // Check for overlaps
  return existingSlots.some((slot) => {
    const slotStartTime = new Date(slot.start_time);
    const slotEndTime = new Date(slot.end_time);
    const isSlotRecurring = slot.recurrence !== null;
    
    // If they're different types (recurring vs non-recurring), no need to check
    if (isRecurringSlot !== isSlotRecurring) return false;
    
    if (isRecurringSlot && isSlotRecurring) {
      // For recurring slots, check if days match and times overlap
      // Extract weekday pattern from recurrence strings
      const slotRecurrence = slot.recurrence || '';
      const newRecurrence = recurrence || '';
      
      // Parse days from recurrence patterns (weekly:Day1,Day2,...)
      const getDaysFromRecurrence = (rec: string): number[] => {
        if (!rec.startsWith('weekly:')) return [];
        const days = rec.split(':')[1].split(',');
        return days.map(day => {
          switch(day) {
            case 'Sun': return 0;
            case 'Mon': return 1;
            case 'Tue': return 2;
            case 'Wed': return 3;
            case 'Thu': return 4;
            case 'Fri': return 5;
            case 'Sat': return 6;
            default: return -1;
          }
        }).filter(d => d !== -1);
      };
      
      const slotDays = getDaysFromRecurrence(slotRecurrence);
      const newDays = getDaysFromRecurrence(newRecurrence);
      
      // Check if any days overlap
      const hasOverlappingDays = slotDays.some(day => newDays.includes(day));
      if (!hasOverlappingDays) return false;
      
      // Check time overlap (just using hours and minutes)
      const getTimeString = (date: Date): string => {
        return date.toTimeString().substring(0, 5); // HH:MM
      };
      
      const slotStartTimeStr = getTimeString(slotStartTime);
      const slotEndTimeStr = getTimeString(slotEndTime);
      const newStartTimeStr = getTimeString(newStartTime);
      const newEndTimeStr = getTimeString(newEndTime);
      
      // Check time overlap using the same function
      return (
        (newStartTimeStr > slotStartTimeStr && newStartTimeStr < slotEndTimeStr) ||
        (newEndTimeStr > slotStartTimeStr && newEndTimeStr <= slotEndTimeStr) ||
        (newStartTimeStr <= slotStartTimeStr && newEndTimeStr >= slotEndTimeStr)
      );
      
    } else {
      // For one-time slots, check if date ranges overlap
      return (
        (newStartTime < slotEndTime && newStartTime >= slotStartTime) ||
        (newEndTime > slotStartTime && newEndTime <= slotEndTime) ||
        (newStartTime <= slotStartTime && newEndTime >= slotEndTime)
      );
    }
  });
}

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    
    // Extract data with new schema field names
    const { 
      therapist_id, 
      start_time, 
      end_time, 
      recurrence,
      _selectedDays // Optional internal param to help build recurrence string
    } = requestBody;

    // Validate required fields
    if (!therapist_id || !start_time || !end_time) {
      console.error('Missing required fields:', requestBody);
      return NextResponse.json(
        { message: 'Missing required fields: therapist_id, start_time, end_time' },
        { status: 400 }
      );
    }

    // Validate timestamp format
    if (!isValidISOTimestamp(start_time) || !isValidISOTimestamp(end_time)) {
      console.error('Invalid timestamp format:', { 
        start_time, 
        end_time 
      });
      return NextResponse.json(
        { message: 'Invalid timestamp format. Expected ISO format.' },
        { status: 400 }
      );
    }

    // Validate end time is after start time
    if (!isEndTimeAfterStartTime(start_time, end_time)) {
      console.error('End time must be after start time:', { 
        start_time, 
        end_time 
      });
      return NextResponse.json(
        { message: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Check if therapist profile exists
    const { data: therapistProfile, error: profileError } = await supabaseAdmin
      .from('therapists')
      .select('id')
      .eq('id', therapist_id)
      .single();
    
    if (profileError || !therapistProfile) {
      console.error('Therapist profile not found:', { 
        therapist_id,
        error: profileError 
      });
      return NextResponse.json(
        { message: 'Therapist profile not found' },
        { status: 404 }
      );
    }

    // Prepare final recurrence string if _selectedDays is provided
    let finalRecurrence = recurrence;
    if (_selectedDays && Array.isArray(_selectedDays) && _selectedDays.length > 0) {
      finalRecurrence = createRecurrenceString(_selectedDays as DayOfWeek[]);
    }

    // Check for overlapping slots
    const hasOverlap = await checkForOverlappingSlots(
      therapist_id,
      start_time,
      end_time,
      finalRecurrence
    );

    if (hasOverlap) {
      console.error('Overlapping availability slot detected:', requestBody);
      return NextResponse.json(
        { message: 'This time slot overlaps with an existing availability slot. Please choose a different time or day.' },
        { status: 400 }
      );
    }

    // Prepare data for insertion
    const availabilityData = {
      therapist_id,
      start_time,
      end_time,
      recurrence: finalRecurrence
    };

    // Insert availability using service role with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    try {
      const { data, error } = await supabaseAdmin
        .from('availability')
        .insert([availabilityData])
        .select()
        .single();
      
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('Error creating availability:', error);
        return NextResponse.json(
          { message: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('Request timed out');
        return NextResponse.json(
          { message: 'Request timed out. Please try again.' },
          { status: 504 }
        );
      }
      throw err; // Re-throw for the outer catch block
    }
  } catch (error) {
    console.error('Error in create-availability route:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 