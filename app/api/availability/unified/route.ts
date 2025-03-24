import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createRecurrenceString, getDaysOfWeekFromRecurrence, DayOfWeek } from '@/app/utils/schema-converters';

// Define TimeOff interface locally to avoid import errors
interface TimeOff {
  id: string;
  therapist_id: string;
  start_time: string;
  end_time: string;
  reason?: string;
  recurrence: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the therapist profile
    const { data: therapistProfile, error: profileError } = await supabase
      .from('therapists')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (profileError || !therapistProfile) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }
    
    // Get all time-off periods for this therapist
    const { data: timeOffPeriods, error: timeOffError } = await supabase
      .from('time_off')
      .select('*')
      .eq('therapist_id', therapistProfile.id)
      .order('recurrence', { ascending: false }) // Recurring first
      .order('start_time', { ascending: true });
      
    if (timeOffError) {
      return NextResponse.json({ error: timeOffError.message }, { status: 500 });
    }
    
    return NextResponse.json({ data: timeOffPeriods });
  } catch (error) {
    console.error('Error in unified availability API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the therapist profile
    const { data: therapistProfile, error: profileError } = await supabase
      .from('therapists')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (profileError || !therapistProfile) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }
    
    // Parse the request body
    const { type, data } = await request.json();
    
    if (type === 'time_off') {
      // Add time-off period
      const { 
        start_time, 
        end_time, 
        reason, 
        recurrence,
        _selectedDays // Optional param to help build recurrence string
      } = data;
      
      // Validate required fields
      if (!start_time || !end_time) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      // Validate time range
      if (new Date(start_time) >= new Date(end_time)) {
        return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
      }

      // Build recurrence string if _selectedDays is provided
      let finalRecurrence = recurrence;
      if (_selectedDays && Array.isArray(_selectedDays) && _selectedDays.length > 0) {
        finalRecurrence = createRecurrenceString(_selectedDays as DayOfWeek[]);
      }
      
      // Check for overlapping time-off periods
      const { data: existingTimeOffs, error: checkError } = await supabase
        .from('time_off')
        .select('*')
        .eq('therapist_id', therapistProfile.id);
        
      if (checkError) {
        return NextResponse.json({ error: checkError.message }, { status: 500 });
      }
      
      const isOverlapping = checkForOverlaps(
        start_time,
        end_time,
        finalRecurrence,
        existingTimeOffs || []
      );
      
      if (isOverlapping) {
        return NextResponse.json({ 
          error: 'This time-off period overlaps with an existing one. Please choose a different time.' 
        }, { status: 400 });
      }
      
      // Insert the time-off period
      const timeOffData = {
        therapist_id: therapistProfile.id,
        start_time,
        end_time,
        reason,
        recurrence: finalRecurrence
      };
      
      const { data: insertedTimeOff, error: insertError } = await supabase
        .from('time_off')
        .insert([timeOffData])
        .select()
        .single();
        
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      
      return NextResponse.json({ data: insertedTimeOff });
    }
    
    return NextResponse.json({ error: 'Invalid operation type' }, { status: 400 });
  } catch (error) {
    console.error('Error in unified availability API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the therapist profile
    const { data: therapistProfile, error: profileError } = await supabase
      .from('therapists')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (profileError || !therapistProfile) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }
    
    // Parse the request body
    const { id, data: updateData } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Missing ID for update' }, { status: 400 });
    }
    
    // Only allow updating certain fields
    const { start_time, end_time, reason, recurrence, _selectedDays } = updateData;
    
    // Build update object
    const updates: Partial<TimeOff> = {};
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;
    if (reason !== undefined) updates.reason = reason;
    
    // Handle recurrence 
    if (recurrence !== undefined) {
      updates.recurrence = recurrence;
    } else if (_selectedDays && Array.isArray(_selectedDays) && _selectedDays.length > 0) {
      updates.recurrence = createRecurrenceString(_selectedDays as DayOfWeek[]);
    }
    
    // Update the time-off period
    const { data: updatedTimeOff, error: updateError } = await supabase
      .from('time_off')
      .update(updates)
      .eq('id', id)
      .eq('therapist_id', therapistProfile.id) // Ensure it belongs to this therapist
      .select()
      .single();
      
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    
    return NextResponse.json({ data: updatedTimeOff });
  } catch (error) {
    console.error('Error in unified availability API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing ID for deletion' }, { status: 400 });
    }
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the therapist profile
    const { data: therapistProfile, error: profileError } = await supabase
      .from('therapists')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (profileError || !therapistProfile) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }
    
    // Delete the time-off period, ensuring it belongs to this therapist
    const { error: deleteError } = await supabase
      .from('time_off')
      .delete()
      .eq('id', id)
      .eq('therapist_id', therapistProfile.id);
      
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in unified availability API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to check for overlaps between time-off periods
function checkForOverlaps(
  startTime: string,
  endTime: string,
  recurrence: string | null,
  existingTimeOffs: TimeOff[]
): boolean {
  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  const dayOfWeek = startDate.getDay() as DayOfWeek;
  const isRecurring = recurrence !== null;
  
  return existingTimeOffs.some(timeOff => {
    const timeOffStart = new Date(timeOff.start_time);
    const timeOffEnd = new Date(timeOff.end_time);
    const isTimeOffRecurring = timeOff.recurrence !== null;
    
    // If they're different types (recurring vs non-recurring), no need to check
    if (isRecurring !== isTimeOffRecurring) return false;
    
    if (isRecurring && isTimeOffRecurring) {
      // For recurring time-off, check if days overlap
      const timeOffDays = getDaysOfWeekFromRecurrence(timeOff.recurrence);
      const newDays = getDaysOfWeekFromRecurrence(recurrence);
      
      const hasOverlappingDays = timeOffDays.some(day => newDays.includes(day));
      if (!hasOverlappingDays) return false;
      
      // Check time overlap (just using hours and minutes)
      const timeToMinutes = (date: Date): number => {
        return date.getHours() * 60 + date.getMinutes();
      };
      
      const timeOffStartMinutes = timeToMinutes(timeOffStart);
      const timeOffEndMinutes = timeToMinutes(timeOffEnd);
      const newStartMinutes = timeToMinutes(startDate);
      const newEndMinutes = timeToMinutes(endDate);
      
      return (
        (newStartMinutes >= timeOffStartMinutes && newStartMinutes < timeOffEndMinutes) ||
        (newEndMinutes > timeOffStartMinutes && newEndMinutes <= timeOffEndMinutes) ||
        (newStartMinutes <= timeOffStartMinutes && newEndMinutes >= timeOffEndMinutes)
      );
    } else {
      // For one-time time-off, check if date ranges overlap
      return (
        (startDate <= timeOffEnd && endDate >= timeOffStart)
      );
    }
  });
} 