// This script checks and sets up the database for therapist profiles
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
  }
);

async function setupDatabase() {
  try {
    console.log('Checking if therapist_profiles table exists...');
    
    // Check if the table exists
    const { data: tableExists, error: tableError } = await supabaseAdmin.rpc(
      'execute_sql',
      {
        sql_query: `
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name = 'therapist_profiles'
          );
        `
      }
    );
    
    if (tableError) {
      console.error('Error checking if table exists:', tableError);
      return;
    }
    
    console.log('Table exists check result:', tableExists);
    
    // Run the migration script
    console.log('Running migration script...');
    
    const migrationScript = `
      -- Create therapist_profiles table if it doesn't exist
      CREATE TABLE IF NOT EXISTS therapist_profiles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      
      -- Create an index on user_id for faster lookups
      CREATE INDEX IF NOT EXISTS therapist_profiles_user_id_idx ON therapist_profiles(user_id);
      
      -- Create an index on email for faster lookups
      CREATE INDEX IF NOT EXISTS therapist_profiles_email_idx ON therapist_profiles(email);
      
      -- Enable RLS on the therapist_profiles table
      ALTER TABLE therapist_profiles ENABLE ROW LEVEL SECURITY;
      
      -- Create a function to check if the user is the owner of the therapist profile
      CREATE OR REPLACE FUNCTION is_owner_of_therapist_profile() RETURNS BOOLEAN AS $$
      BEGIN
        RETURN (auth.uid() = user_id);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view their own therapist profile" ON therapist_profiles;
      DROP POLICY IF EXISTS "Users can update their own therapist profile" ON therapist_profiles;
      DROP POLICY IF EXISTS "Service role can manage all therapist profiles" ON therapist_profiles;
      DROP POLICY IF EXISTS "Allow creation of therapist profiles via function" ON therapist_profiles;
      
      -- Create policies for therapist_profiles table
      -- Allow users to view their own profile
      CREATE POLICY "Users can view their own therapist profile" 
      ON therapist_profiles 
      FOR SELECT 
      USING (auth.uid() = user_id);
      
      -- Allow users to update their own profile
      CREATE POLICY "Users can update their own therapist profile" 
      ON therapist_profiles 
      FOR UPDATE 
      USING (auth.uid() = user_id);
      
      -- Allow service role to manage all profiles
      CREATE POLICY "Service role can manage all therapist profiles" 
      ON therapist_profiles 
      USING (auth.role() = 'service_role');
      
      -- Create a policy to allow the create_therapist_profile function to create profiles
      CREATE POLICY "Allow creation of therapist profiles via function" 
      ON therapist_profiles 
      FOR INSERT 
      WITH CHECK (true);
      
      -- Create a function to automatically create a therapist profile
      CREATE OR REPLACE FUNCTION create_therapist_profile_for_user(
        p_user_id UUID,
        p_email TEXT,
        p_name TEXT
      ) RETURNS JSONB AS $$
      DECLARE
        v_profile_id UUID;
        v_result JSONB;
      BEGIN
        -- Check if a profile already exists with this user_id
        SELECT id INTO v_profile_id FROM therapist_profiles WHERE user_id = p_user_id;
        
        IF v_profile_id IS NOT NULL THEN
          -- Profile exists with this user_id
          SELECT jsonb_build_object(
            'status', 'exists',
            'message', 'Profile already exists with this user_id',
            'profile_id', v_profile_id
          ) INTO v_result;
          RETURN v_result;
        END IF;
        
        -- Check if a profile exists with this email
        SELECT id INTO v_profile_id FROM therapist_profiles WHERE email = p_email;
        
        IF v_profile_id IS NOT NULL THEN
          -- Profile exists with this email, update the user_id
          UPDATE therapist_profiles SET user_id = p_user_id WHERE id = v_profile_id;
          
          SELECT jsonb_build_object(
            'status', 'updated',
            'message', 'Profile updated with correct user_id',
            'profile_id', v_profile_id
          ) INTO v_result;
          RETURN v_result;
        END IF;
        
        -- No profile exists, create a new one
        INSERT INTO therapist_profiles (user_id, email, name)
        VALUES (p_user_id, p_email, p_name)
        RETURNING id INTO v_profile_id;
        
        SELECT jsonb_build_object(
          'status', 'created',
          'message', 'Profile created',
          'profile_id', v_profile_id
        ) INTO v_result;
        
        RETURN v_result;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Grant execute permission to authenticated users
      GRANT EXECUTE ON FUNCTION create_therapist_profile_for_user TO authenticated;
      GRANT EXECUTE ON FUNCTION create_therapist_profile_for_user TO anon;
      
      -- Create a trigger to automatically update the updated_at field
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Create a trigger to automatically update the updated_at field
      DROP TRIGGER IF EXISTS update_therapist_profiles_updated_at ON therapist_profiles;
      CREATE TRIGGER update_therapist_profiles_updated_at
      BEFORE UPDATE ON therapist_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `;
    
    // Execute the migration script
    const { data: migrationResult, error: migrationError } = await supabaseAdmin.rpc(
      'execute_sql',
      {
        sql_query: migrationScript
      }
    );
    
    if (migrationError) {
      console.error('Error running migration script:', migrationError);
      return;
    }
    
    console.log('Migration script executed successfully');
    
    // Check if your profile exists
    console.log('Checking if your profile exists...');
    
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('therapist_profiles')
      .select('*')
      .eq('user_id', 'abb3997f-e6f1-4e5c-a317-474db2401b3c');
    
    if (profileError) {
      console.error('Error checking profile:', profileError);
      return;
    }
    
    console.log('Profile check result:', profileData);
    
    if (!profileData || profileData.length === 0) {
      console.log('Creating your profile...');
      
      // Create your profile
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('therapist_profiles')
        .insert([
          {
            user_id: 'abb3997f-e6f1-4e5c-a317-474db2401b3c',
            name: 'Gabe Liss',
            email: 'gabeliss17@gmail.com',
          }
        ])
        .select();
      
      if (createError) {
        console.error('Error creating profile:', createError);
        return;
      }
      
      console.log('Profile created:', newProfile);
    } else {
      console.log('Your profile already exists:', profileData);
    }
    
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

setupDatabase(); 