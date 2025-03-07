// Follow this setup guide to integrate the Deno runtime and Supabase Functions:
// https://supabase.com/docs/guides/functions/deploy

// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get the request body
    const body = await req.json();
    console.log('Webhook payload:', body);

    // Verify this is a signup event
    if (body.type !== 'signup') {
      return new Response(
        JSON.stringify({ error: 'Not a signup event' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get user information from the event
    const { user } = body.record;
    if (!user || !user.id || !user.email) {
      return new Response(
        JSON.stringify({ error: 'Invalid user data in event' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Call the create_therapist_profile_for_user function
    const { data, error } = await supabaseClient.rpc('create_therapist_profile_for_user', {
      p_user_id: user.id,
      p_email: user.email,
      p_name: user.user_metadata?.name || user.email.split('@')[0],
    });

    if (error) {
      console.error('Error creating therapist profile:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Profile creation result:', data);
    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 