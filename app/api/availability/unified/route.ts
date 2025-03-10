import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { UnifiedAvailabilityException } from '@/app/types/index';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the therapist profile
    const { data: therapistProfile, error: profileError } = await supabase
      .from('therapist_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (profileError || !therapistProfile) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }
    
    // Get all unified exceptions for this therapist
    const { data: exceptions, error: exceptionsError } = await supabase
      .from('unified_availability_exceptions')
      .select('*')
      .eq('therapist_id', therapistProfile.id)
      .order('is_recurring', { ascending: false }) // Recurring first
      .order('day_of_week', { ascending: true })
      .order('specific_date', { ascending: true })
      .order('start_time', { ascending: true });
      
    if (exceptionsError) {
      return NextResponse.json({ error: exceptionsError.message }, { status: 500 });
    }
    
    return NextResponse.json({ data: exceptions });
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
      .from('therapist_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (profileError || !therapistProfile) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }
    
    // Parse the request body
    const { type, data } = await request.json();
    
    if (type === 'exception') {
      // Add unified exception
      const { 
        startTime, 
        endTime, 
        reason, 
        isRecurring, 
        dayOfWeek, 
        specificDate 
      } = data;
      
      // Validate required fields
      if (!startTime || !endTime) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      // Validate time range
      if (startTime >= endTime) {
        return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
      }
      
      // Validate recurring vs specific date
      if (isRecurring && dayOfWeek === undefined) {
        return NextResponse.json({ error: 'Day of week is required for recurring exceptions' }, { status: 400 });
      }
      
      if (!isRecurring && !specificDate) {
        return NextResponse.json({ error: 'Specific date is required for non-recurring exceptions' }, { status: 400 });
      }
      
      // Check for overlapping exceptions
      const { data: existingExceptions, error: checkError } = await supabase
        .from('unified_availability_exceptions')
        .select('*')
        .eq('therapist_id', therapistProfile.id)
        .eq('is_recurring', isRecurring);
        
      if (checkError) {
        return NextResponse.json({ error: checkError.message }, { status: 500 });
      }
      
      // Add additional filters based on exception type
      let filteredExceptions = existingExceptions || [];
      if (isRecurring) {
        filteredExceptions = filteredExceptions.filter(
          (ex: UnifiedAvailabilityException) => ex.day_of_week === dayOfWeek
        );
      } else {
        filteredExceptions = filteredExceptions.filter(
          (ex: UnifiedAvailabilityException) => ex.specific_date === specificDate
        );
      }
      
      // Check for overlaps
      const overlaps = filteredExceptions.some((existing: UnifiedAvailabilityException) => {
        return (
          (startTime >= existing.start_time && startTime < existing.end_time) ||
          (endTime > existing.start_time && endTime <= existing.end_time) ||
          (startTime <= existing.start_time && endTime >= existing.end_time)
        );
      });
      
      if (overlaps) {
        return NextResponse.json({ error: 'Overlapping exception exists' }, { status: 400 });
      }
      
      // Insert new exception
      const { data: newException, error: insertError } = await supabase
        .from('unified_availability_exceptions')
        .insert({
          therapist_id: therapistProfile.id,
          day_of_week: isRecurring ? dayOfWeek : null,
          start_time: startTime,
          end_time: endTime,
          reason,
          is_recurring: isRecurring,
          specific_date: !isRecurring ? specificDate : null,
        })
        .select()
        .single();
        
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      
      return NextResponse.json({ data: newException });
    } else if (type === 'update') {
      // Update exception
      const { id, updates } = data;
      
      if (!id || !updates) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      // Validate the exception belongs to this therapist
      const { data: existingException, error: checkError } = await supabase
        .from('unified_availability_exceptions')
        .select('*')
        .eq('id', id)
        .eq('therapist_id', therapistProfile.id)
        .single();
        
      if (checkError || !existingException) {
        return NextResponse.json({ error: 'Exception not found' }, { status: 404 });
      }
      
      // Update the exception
      const { data: updatedException, error: updateError } = await supabase
        .from('unified_availability_exceptions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      
      return NextResponse.json({ data: updatedException });
    } else if (type === 'delete') {
      // Delete exception
      const { id } = data;
      
      if (!id) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      // Validate the exception belongs to this therapist
      const { data: existingException, error: checkError } = await supabase
        .from('unified_availability_exceptions')
        .select('*')
        .eq('id', id)
        .eq('therapist_id', therapistProfile.id)
        .single();
        
      if (checkError || !existingException) {
        return NextResponse.json({ error: 'Exception not found' }, { status: 404 });
      }
      
      // Delete the exception
      const { error: deleteError } = await supabase
        .from('unified_availability_exceptions')
        .delete()
        .eq('id', id);
        
      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in unified availability API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 