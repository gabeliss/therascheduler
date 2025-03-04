import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const availabilityData = await request.json();
    
    console.log('Creating availability with service role:', availabilityData);

    // Validate required fields
    if (!availabilityData.therapist_id || 
        !availabilityData.day_of_week || 
        !availabilityData.start_time || 
        !availabilityData.end_time) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert availability using service role
    const { data, error } = await supabaseAdmin
      .from('availability')
      .insert([availabilityData])
      .select()
      .single();

    if (error) {
      console.error('Error creating availability:', error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    console.log('Availability created successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in create-availability route:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 