import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

// Helper function to validate time format (HH:MM)
function isValidTimeFormat(time: string): boolean {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

// Helper function to check if end time is after start time
function isEndTimeAfterStartTime(startTime: string, endTime: string): boolean {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  if (endHour > startHour) return true;
  if (endHour === startHour && endMinute > startMinute) return true;
  return false;
}

// Helper function to convert time string to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper function to check if two time slots overlap
function doTimeSlotsOverlap(
  slot1Start: string,
  slot1End: string,
  slot2Start: string,
  slot2End: string
): boolean {
  const slot1StartMinutes = timeToMinutes(slot1Start);
  const slot1EndMinutes = timeToMinutes(slot1End);
  const slot2StartMinutes = timeToMinutes(slot2Start);
  const slot2EndMinutes = timeToMinutes(slot2End);

  // Check if either slot starts during the other slot
  return (
    (slot1StartMinutes < slot2EndMinutes && slot1StartMinutes >= slot2StartMinutes) ||
    (slot2StartMinutes < slot1EndMinutes && slot2StartMinutes >= slot1StartMinutes)
  );
}

// Helper function to check for overlapping availability slots
async function checkForOverlappingSlots(
  therapistId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  isRecurring: boolean,
  specificDate?: string
): Promise<boolean> {
  // Query to find existing availability slots for the therapist on the same day
  const query = supabaseAdmin
    .from('availability')
    .select('*')
    .eq('therapist_id', therapistId);

  if (isRecurring) {
    // For recurring slots, check other recurring slots on the same day of week
    query.eq('day_of_week', dayOfWeek).eq('is_recurring', true);
  } else if (specificDate) {
    // For specific date slots, check other slots on the same specific date
    query.eq('specific_date', specificDate).eq('is_recurring', false);
  }

  const { data: existingSlots, error } = await query;

  if (error || !existingSlots) {
    console.error('Error checking for overlapping slots:', error);
    return false; // Assume no overlap if there's an error
  }

  // Check if any existing slot overlaps with the new slot
  return existingSlots.some((slot) =>
    doTimeSlotsOverlap(slot.start_time, slot.end_time, startTime, endTime)
  );
}

export async function POST(request: Request) {
  try {
    const availabilityData = await request.json();
    

    // Validate required fields
    if (!availabilityData.therapist_id || 
        !availabilityData.day_of_week || 
        !availabilityData.start_time || 
        !availabilityData.end_time) {
      console.error('Missing required fields:', availabilityData);
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Set default value for is_available if not provided
    if (availabilityData.is_available === undefined) {
      availabilityData.is_available = true;
    }

    // Validate time format
    if (!isValidTimeFormat(availabilityData.start_time) || !isValidTimeFormat(availabilityData.end_time)) {
      console.error('Invalid time format:', { 
        start_time: availabilityData.start_time, 
        end_time: availabilityData.end_time 
      });
      return NextResponse.json(
        { message: 'Invalid time format. Expected format: HH:MM' },
        { status: 400 }
      );
    }

    // Validate end time is after start time
    if (!isEndTimeAfterStartTime(availabilityData.start_time, availabilityData.end_time)) {
      console.error('End time must be after start time:', { 
        start_time: availabilityData.start_time, 
        end_time: availabilityData.end_time 
      });
      return NextResponse.json(
        { message: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Check if therapist profile exists
    const { data: therapistProfile, error: profileError } = await supabaseAdmin
      .from('therapist_profiles')
      .select('id')
      .eq('id', availabilityData.therapist_id)
      .single();
    
    if (profileError || !therapistProfile) {
      console.error('Therapist profile not found:', { 
        therapist_id: availabilityData.therapist_id,
        error: profileError 
      });
      return NextResponse.json(
        { message: 'Therapist profile not found' },
        { status: 404 }
      );
    }

    // Check for overlapping slots
    const hasOverlap = await checkForOverlappingSlots(
      availabilityData.therapist_id,
      availabilityData.day_of_week,
      availabilityData.start_time,
      availabilityData.end_time,
      availabilityData.is_recurring || false,
      availabilityData.specific_date
    );

    if (hasOverlap) {
      console.error('Overlapping availability slot detected:', availabilityData);
      return NextResponse.json(
        { message: 'This time slot overlaps with an existing availability slot. Please choose a different time or day.' },
        { status: 400 }
      );
    }

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