// This script sets up the database for therapist profiles directly
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
    const { data: tableData, error: tableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'therapist_profiles');
    
    if (tableError) {
      console.error('Error checking if table exists:', tableError);
    } else {
      console.log('Table exists check result:', tableData);
    }
    
    // Create the therapist_profiles table if it doesn't exist
    console.log('Creating therapist_profiles table if it doesn\'t exist...');
    
    const { error: createTableError } = await supabaseAdmin.rpc('create_therapist_profiles_table');
    
    if (createTableError) {
      console.error('Error creating table:', createTableError);
      console.log('Trying direct table creation...');
      
      // Try direct table creation
      const { error: directCreateError } = await supabaseAdmin
        .from('therapist_profiles')
        .insert([
          {
            user_id: 'abb3997f-e6f1-4e5c-a317-474db2401b3c',
            name: 'Gabe Liss',
            email: 'gabeliss17@gmail.com',
          }
        ])
        .select();
      
      if (directCreateError) {
        console.error('Error with direct table creation:', directCreateError);
      } else {
        console.log('Direct table creation successful');
      }
    } else {
      console.log('Table creation successful');
    }
    
    // Check if your profile exists
    console.log('Checking if your profile exists...');
    
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('therapist_profiles')
      .select('*')
      .eq('user_id', 'abb3997f-e6f1-4e5c-a317-474db2401b3c');
    
    if (profileError) {
      console.error('Error checking profile:', profileError);
    } else {
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
        } else {
          console.log('Profile created:', newProfile);
        }
      } else {
        console.log('Your profile already exists:', profileData);
      }
    }
    
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Error setting up database:', error);
  }
}

setupDatabase(); 