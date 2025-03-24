import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/utils/supabase';

export async function POST(request: Request) {
  try {
    const { userId, email, name } = await request.json();

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured');
    }

    const { error } = await supabaseAdmin
      .from('therapists')
      .insert([
        {
          user_id: userId,
          email: email,
          name: name,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating therapist profile:', error);
      return NextResponse.json(
        { error: 'Failed to create therapist profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in register route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 