// This script adds the specific_date column to the availability table
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key available:', !!supabaseServiceKey);

async function addSpecificDateColumn() {
  try {
    console.log('Adding specific_date column to availability table...');
    
    // Use REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'params=single-object'
      },
      body: JSON.stringify({
        query: `ALTER TABLE availability ADD COLUMN IF NOT EXISTS specific_date DATE;`
      })
    });
    
    const result = await response.text();
    console.log('Response:', response.status, result);
    
    if (response.ok) {
      console.log('Column added successfully!');
    } else {
      console.error('Error adding column');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

addSpecificDateColumn(); 