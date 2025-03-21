import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    
    // First, check if the column already exists
    const { error: checkError } = await supabaseAdmin
      .from('therapist_availability')
      .select('specific_date')
      .limit(1);
      
    if (!checkError) {
      return NextResponse.json({ success: true, message: 'Column already exists' });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Please update your code to handle missing specific_date column',
      action: 'Update your code to handle the case where specific_date is missing'
    });
  } catch (error) {
    console.error('Error in add-specific-date route:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 