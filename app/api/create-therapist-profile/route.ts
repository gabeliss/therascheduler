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
    db: {
      schema: 'public',
    },
  }
);

export async function POST(request: Request) {
  try {
    const { userId, name, email } = await request.json();
    
    console.log('Creating therapist profile for user:', userId);

    // Validate required fields
    if (!userId || !email) {
      console.error('Missing required fields:', { userId, email });
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if a therapist profile already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('therapist_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (existingProfile) {
      console.log('Therapist profile already exists:', existingProfile);
      return NextResponse.json(existingProfile);
    }

    // Create a new therapist profile
    const { data, error } = await supabaseAdmin
      .from('therapist_profiles')
      .insert([
        {
          user_id: userId,
          name: name || 'Therapist',
          email: email,
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating therapist profile:', error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    console.log('Therapist profile created successfully:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in create-therapist-profile route:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 