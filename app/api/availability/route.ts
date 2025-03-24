import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  }
);

// Helper function to check if time is valid
function isValidTime(time: string): boolean {
  if (!time) return false;
  return new Date(time).toString() !== 'Invalid Date';
}

// Helper function to check for overlapping availability
async function checkForOverlaps(
  therapistId: string,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<boolean> {
  const query = supabase
    .from('availability')
    .select('*')
    .eq('therapist_id', therapistId);

  if (excludeId) {
    query.neq('id', excludeId);
  }

  const { data: existingSlots, error } = await query;

  if (error || !existingSlots) {
    console.error('Error checking for overlapping slots:', error);
    return false; // Assume no overlap if there's an error
  }

  const newStartTime = new Date(startTime);
  const newEndTime = new Date(endTime);

  // Check if any existing slot overlaps with the new slot
  return existingSlots.some((slot) => {
    const slotStartTime = new Date(slot.start_time);
    const slotEndTime = new Date(slot.end_time);
    
    // Check for overlap
    return (
      (newStartTime < slotEndTime && newStartTime >= slotStartTime) ||
      (slotStartTime < newEndTime && slotStartTime >= newStartTime)
    );
  });
}

// GET /api/availability?therapist_id={id}
// Returns all availability slots for a therapist
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const therapistId = url.searchParams.get('therapist_id');

    if (!therapistId) {
      return NextResponse.json(
        { error: 'Therapist ID is required' },
        { status: 400 }
      );
    }

    const { data: availability, error } = await supabase
      .from('availability')
      .select('*')
      .eq('therapist_id', therapistId);

    if (error) {
      console.error('Error fetching availability:', error);
      return NextResponse.json(
        { error: 'Failed to fetch availability' },
        { status: 500 }
      );
    }

    return NextResponse.json({ availability });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/availability
// Creates a new availability slot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { therapist_id, start_time, end_time, recurrence } = body;

    // Validate required fields
    if (!therapist_id || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: therapist_id, start_time, end_time' },
        { status: 400 }
      );
    }

    // Validate times
    if (!isValidTime(start_time) || !isValidTime(end_time)) {
      return NextResponse.json(
        { error: 'Invalid time format. Expected ISO-8601 format' },
        { status: 400 }
      );
    }

    // Validate end time is after start time
    if (new Date(end_time) <= new Date(start_time)) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Check for overlapping slots
    const hasOverlap = await checkForOverlaps(
      therapist_id,
      start_time,
      end_time
    );

    if (hasOverlap) {
      return NextResponse.json(
        { error: 'This time slot overlaps with an existing availability slot' },
        { status: 400 }
      );
    }

    // Insert availability
    const { data, error } = await supabase
      .from('availability')
      .insert([{ therapist_id, start_time, end_time, recurrence }])
      .select()
      .single();

    if (error) {
      console.error('Error creating availability:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      availability_id: data.id
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PUT /api/availability/:id
// Updates an existing availability slot
export async function PUT(request: NextRequest) {
  try {
    // Extract ID from path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    if (!id || id === 'availability') {
      return NextResponse.json(
        { error: 'Availability ID is required in the path' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { start_time, end_time, recurrence } = body;

    // Check if the availability exists
    const { data: existingAvailability, error: fetchError } = await supabase
      .from('availability')
      .select('therapist_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingAvailability) {
      return NextResponse.json(
        { error: 'Availability not found' },
        { status: 404 }
      );
    }

    // Validate times if provided
    if ((start_time && !isValidTime(start_time)) || (end_time && !isValidTime(end_time))) {
      return NextResponse.json(
        { error: 'Invalid time format. Expected ISO-8601 format' },
        { status: 400 }
      );
    }

    // Validate end time is after start time if both provided
    if (start_time && end_time && new Date(end_time) <= new Date(start_time)) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Check for overlapping slots if times are changing
    if (start_time && end_time) {
      const hasOverlap = await checkForOverlaps(
        existingAvailability.therapist_id,
        start_time,
        end_time,
        id
      );

      if (hasOverlap) {
        return NextResponse.json(
          { error: 'This time slot overlaps with an existing availability slot' },
          { status: 400 }
        );
      }
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (start_time) updateData.start_time = start_time;
    if (end_time) updateData.end_time = end_time;
    if (recurrence !== undefined) updateData.recurrence = recurrence;

    // Update availability
    const { error: updateError } = await supabase
      .from('availability')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating availability:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/availability/:id
// Deletes an availability slot
export async function DELETE(request: NextRequest) {
  try {
    // Extract ID from path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];

    if (!id || id === 'availability') {
      return NextResponse.json(
        { error: 'Availability ID is required in the path' },
        { status: 400 }
      );
    }

    // Check if the availability exists
    const { data: existingAvailability, error: fetchError } = await supabase
      .from('availability')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingAvailability) {
      return NextResponse.json(
        { error: 'Availability not found' },
        { status: 404 }
      );
    }

    // Delete availability
    const { error: deleteError } = await supabase
      .from('availability')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting availability:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 