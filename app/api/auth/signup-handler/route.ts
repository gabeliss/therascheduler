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

// Webhook secret for security
const webhookSecret = process.env.WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    // Verify webhook secret if configured
    const requestSecret = request.headers.get('x-webhook-secret');
    if (webhookSecret && requestSecret !== webhookSecret) {
      console.error('Unauthorized webhook request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse the request body
    const body = await request.json();
    
    // Handle both direct API calls and webhook payloads
    let user_id, email, name;
    
    if (body.type === 'signup' && body.event) {
      // This is a webhook payload
      user_id = body.event.user_id;
      email = body.event.email;
      name = body.event.user_metadata?.name || email.split('@')[0];
    } else {
      // This is a direct API call
      user_id = body.user_id;
      email = body.email;
      name = body.name;
    }
    
    if (!user_id || !email) {
      return NextResponse.json({ error: 'Missing required fields: user_id, email' }, { status: 400 });
    }
    
    
    // Check if a profile already exists for this user
    const { data: existingProfiles, error: checkError } = await supabaseAdmin
      .from('therapist_profiles')
      .select('*')
      .or(`user_id.eq.${user_id},email.eq.${email}`);
    
    if (checkError) {
      console.error("Error checking for existing profile:", checkError);
      return NextResponse.json({ error: 'Error checking for existing profile: ' + checkError.message }, { status: 500 });
    }
    
    if (existingProfiles && existingProfiles.length > 0) {
      // Profile exists, ensure it has the correct user_id
      const existingProfile = existingProfiles[0];
      
      if (existingProfile.user_id !== user_id) {
        // Update the profile to have the correct user_id
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from('therapist_profiles')
          .update({ user_id: user_id })
          .eq('id', existingProfile.id)
          .select();
        
        if (updateError) {
          console.error("Error updating profile:", updateError);
          return NextResponse.json({ error: 'Error updating profile: ' + updateError.message }, { status: 500 });
        }
        
        return NextResponse.json({ 
          message: 'Profile updated with correct user_id', 
          profile: updatedProfile && updatedProfile.length > 0 ? updatedProfile[0] : null,
          action: 'updated'
        });
      }

      return NextResponse.json({ 
        message: 'Profile already exists', 
        profile: existingProfile,
        action: 'exists'
      });
    }
    
    // No profile exists, create a new one
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('therapist_profiles')
      .insert([
        {
          user_id: user_id,
          email: email,
          name: name || email.split('@')[0], // Use part of email as name if not provided
        }
      ])
      .select();
    
    if (createError) {
      console.error("Error creating profile:", createError);
      return NextResponse.json({ error: 'Error creating profile: ' + createError.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      message: 'Profile created', 
      profile: newProfile && newProfile.length > 0 ? newProfile[0] : null,
      action: 'created'
    });
  } catch (error) {
    console.error("Error in signup-handler:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 