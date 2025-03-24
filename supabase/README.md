# Supabase Database Setup

This directory contains SQL migration scripts to set up the database schema for TheraScheduler.

## Database Schema

The application uses the following tables:

1. **clients** - Stores information about clients
2. **therapists** - Stores information about therapists
3. **appointments** - Stores appointment information

## How to Apply Migrations

### Option 1: Using Supabase CLI

1. Install the Supabase CLI:

   ```bash
   npm install -g supabase
   ```

2. Link your project:

   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Apply migrations:
   ```bash
   supabase db push
   ```

### Option 2: Using Supabase Dashboard

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of the migration files in the `migrations` directory
4. Paste and execute the SQL in the SQL Editor

## Database Relationships

- **appointments.therapist_id** references **therapists.id**
- **appointments.client_id** references **clients.id**
- **therapists.user_id** and **clients.user_id** reference **auth.users.id**

## Row Level Security (RLS)

The database uses Row Level Security to ensure that:

1. Therapists can view all client profiles
2. Clients can only view their own profile
3. Therapists can view, insert, and update appointments for their clients
4. Clients can only view their own appointments

## Indexes

The following indexes are created for better query performance:

- **idx_appointments_therapist_id** on **appointments.therapist_id**
- **idx_appointments_client_id** on **appointments.client_id**
- **idx_appointments_start_time** on **appointments.start_time**
- **idx_appointments_status** on **appointments.status**
