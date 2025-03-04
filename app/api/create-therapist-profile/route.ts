import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { userId, name, email } = await request.json();
    
    console.log('Creating therapist profile for:', { userId, name, email });

    if (!userId || !name || !email) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('therapist_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    console.log('Check for existing profile:', { existingProfile, error: checkError });

    if (existingProfile) {
      console.log('Existing profile found:', existingProfile);
      return NextResponse.json({ id: existingProfile.id });
    }

    // Create new profile
    const { data, error } = await supabaseAdmin
      .from('therapist_profiles')
      .insert([
        {
          user_id: userId,
          name,
          email,
        },
      ])
      .select('id')
      .single();
      
    console.log('Profile creation result:', { data, error });

    if (error) {
      console.error('Error creating therapist profile:', error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    console.error('Error in create-therapist-profile route:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 