import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { BaseAvailability, AvailabilityException } from '@/app/types';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            const cookie = cookieStore.get(name);
            return cookie?.value;
          },
          set(name, value, options) {
            try {
              cookieStore.set(name, value, options);
            } catch (error) {
              // This is a read-only cookie jar in production
              console.error('Failed to set cookie:', error);
            }
          },
          remove(name, options) {
            try {
              cookieStore.set(name, '', { ...options, maxAge: 0 });
            } catch (error) {
              // This is a read-only cookie jar in production
              console.error('Failed to remove cookie:', error);
            }
          },
        },
      }
    );
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the therapist profile
    const { data: therapistProfile, error: profileError } = await supabase
      .from('therapist_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
      
    if (profileError || !therapistProfile) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }
    
    // Get all base availability for this therapist
    const { data: baseAvailability, error: baseError } = await supabase
      .from('base_availability')
      .select('*')
      .eq('therapist_id', therapistProfile.id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });
      
    if (baseError) {
      return NextResponse.json({ error: baseError.message }, { status: 500 });
    }
    
    // Get all exceptions for this therapist's base availability
    const baseIds = baseAvailability?.map((base: BaseAvailability) => base.id) || [];
    
    let exceptionsData: AvailabilityException[] = [];
    if (baseIds.length > 0) {
      const { data: exceptions, error: exceptionsError } = await supabase
        .from('availability_exceptions')
        .select('*')
        .in('base_availability_id', baseIds)
        .order('start_time', { ascending: true });
        
      if (exceptionsError) {
        return NextResponse.json({ error: exceptionsError.message }, { status: 500 });
      }
      
      exceptionsData = exceptions as AvailabilityException[] || [];
    }
    
    // Combine into hierarchical structure
    const hierarchicalAvailability = (baseAvailability || []).map((base: BaseAvailability) => {
      const baseExceptions = exceptionsData.filter(
        (exception: AvailabilityException) => exception.base_availability_id === base.id
      );
      
      return {
        base,
        exceptions: baseExceptions
      };
    });
    
    return NextResponse.json({ data: hierarchicalAvailability });
  } catch (error) {
    console.error('Error in hierarchical availability API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST request received at /api/availability/hierarchical');
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            const cookie = cookieStore.get(name);
            return cookie?.value;
          },
          set(name, value, options) {
            try {
              cookieStore.set(name, value, options);
            } catch (error) {
              // This is a read-only cookie jar in production
              console.error('Failed to set cookie:', error);
            }
          },
          remove(name, options) {
            try {
              cookieStore.set(name, '', { ...options, maxAge: 0 });
            } catch (error) {
              // This is a read-only cookie jar in production
              console.error('Failed to remove cookie:', error);
            }
          },
        },
      }
    );
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('Authenticated user:', user.id);
    
    // Get the therapist profile
    const { data: therapistProfile, error: profileError } = await supabase
      .from('therapist_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
      
    if (profileError || !therapistProfile) {
      console.error('Therapist profile error:', profileError);
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }
    console.log('Therapist profile found:', therapistProfile.id);
    
    // Parse request body
    const body = await request.json();
    console.log('Request body:', body);
    const { type, data } = body;
    
    if (!type || !data) {
      console.error('Invalid request body - missing type or data');
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    // Handle different types of requests
    if (type === 'base') {
      console.log('Processing base availability request');
      // Add base availability
      const { dayOfWeek, startTime, endTime, isRecurring, specificDate } = data;
      
      if (dayOfWeek === undefined || !startTime || !endTime || isRecurring === undefined) {
        console.error('Missing required fields:', { dayOfWeek, startTime, endTime, isRecurring });
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      // Validate time range
      if (startTime >= endTime) {
        console.error('Invalid time range:', { startTime, endTime });
        return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
      }
      
      // Check for overlapping base availability
      const { data: existingAvailability, error: checkError } = await supabase
        .from('base_availability')
        .select('*')
        .eq('therapist_id', therapistProfile.id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_recurring', isRecurring);
        
      if (checkError) {
        return NextResponse.json({ error: checkError.message }, { status: 500 });
      }
      
      // Check for overlaps
      const overlaps = (existingAvailability || []).some((existing: BaseAvailability) => {
        // For specific dates, only check overlaps on the same date
        if (!isRecurring && existing.specific_date !== specificDate) {
          return false;
        }
        
        return (
          (startTime >= existing.start_time && startTime < existing.end_time) ||
          (endTime > existing.start_time && endTime <= existing.end_time) ||
          (startTime <= existing.start_time && endTime >= existing.end_time)
        );
      });
      
      if (overlaps) {
        return NextResponse.json({ error: 'Overlapping availability exists' }, { status: 400 });
      }
      
      // Insert new base availability
      const { data: newBase, error: insertError } = await supabase
        .from('base_availability')
        .insert({
          therapist_id: therapistProfile.id,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          is_recurring: isRecurring,
          specific_date: specificDate,
        })
        .select()
        .single();
        
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      
      return NextResponse.json({ data: newBase });
    } else if (type === 'exception') {
      // Add availability exception
      const { baseAvailabilityId, startTime, endTime, reason } = data;
      
      if (!baseAvailabilityId || !startTime || !endTime) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      // Validate time range
      if (startTime >= endTime) {
        return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
      }
      
      // Get the base availability to check if the exception is within its time range
      const { data: baseAvail, error: baseError } = await supabase
        .from('base_availability')
        .select('*')
        .eq('id', baseAvailabilityId)
        .single();
        
      if (baseError || !baseAvail) {
        return NextResponse.json({ error: 'Base availability not found' }, { status: 404 });
      }
      
      // Check if the exception is within the base availability time range
      if (startTime < baseAvail.start_time || endTime > baseAvail.end_time) {
        return NextResponse.json(
          { error: 'Exception must be within base availability time range' },
          { status: 400 }
        );
      }
      
      // Check for overlapping exceptions
      const { data: existingExceptions, error: checkError } = await supabase
        .from('availability_exceptions')
        .select('*')
        .eq('base_availability_id', baseAvailabilityId);
        
      if (checkError) {
        return NextResponse.json({ error: checkError.message }, { status: 500 });
      }
      
      // Check for overlaps
      const overlaps = (existingExceptions || []).some((existing: AvailabilityException) => {
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
        .from('availability_exceptions')
        .insert({
          base_availability_id: baseAvailabilityId,
          start_time: startTime,
          end_time: endTime,
          reason,
        })
        .select()
        .single();
        
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      
      return NextResponse.json({ data: newException });
    } else {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in hierarchical availability API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            const cookie = cookieStore.get(name);
            return cookie?.value;
          },
          set(name, value, options) {
            try {
              cookieStore.set(name, value, options);
            } catch (error) {
              // This is a read-only cookie jar in production
              console.error('Failed to set cookie:', error);
            }
          },
          remove(name, options) {
            try {
              cookieStore.set(name, '', { ...options, maxAge: 0 });
            } catch (error) {
              // This is a read-only cookie jar in production
              console.error('Failed to remove cookie:', error);
            }
          },
        },
      }
    );
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the therapist profile
    const { data: therapistProfile, error: profileError } = await supabase
      .from('therapist_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
      
    if (profileError || !therapistProfile) {
      return NextResponse.json({ error: 'Therapist profile not found' }, { status: 404 });
    }
    
    // Parse request body
    const body = await request.json();
    const { type, id } = body;
    
    if (!type || !id) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    // Handle different types of requests
    if (type === 'base') {
      // Delete base availability
      // This will also delete all associated exceptions due to the ON DELETE CASCADE constraint
      
      // First, verify that the base availability belongs to this therapist
      const { data: baseAvail, error: checkError } = await supabase
        .from('base_availability')
        .select('*')
        .eq('id', id)
        .eq('therapist_id', therapistProfile.id)
        .single();
        
      if (checkError) {
        return NextResponse.json({ error: 'Base availability not found' }, { status: 404 });
      }
      
      // Delete the base availability
      const { error: deleteError } = await supabase
        .from('base_availability')
        .delete()
        .eq('id', id);
        
      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    } else if (type === 'exception') {
      // Delete availability exception
      
      // First, verify that the exception belongs to this therapist
      const { data: exception, error: checkError } = await supabase
        .from('availability_exceptions')
        .select('*, base_availability!inner(therapist_id)')
        .eq('id', id)
        .single();
        
      if (checkError) {
        return NextResponse.json({ error: 'Exception not found' }, { status: 404 });
      }
      
      // Check if the base availability belongs to this therapist
      if (exception.base_availability.therapist_id !== therapistProfile.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      // Delete the exception
      const { error: deleteError } = await supabase
        .from('availability_exceptions')
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
    console.error('Error in hierarchical availability API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to convert HH:MM time to minutes since midnight
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
} 