# Therapist Profile System

This document outlines the therapist profile system in TheraScheduler, including how profiles are created, managed, and used throughout the application.

## Overview

The therapist profile system is designed to:

1. Automatically create profiles for new users via Supabase Auth Webhook
2. Ensure each user has exactly one therapist profile
3. Handle edge cases like mismatched user IDs and emails
4. Provide fallback mechanisms for profile retrieval

## Database Structure

The `therapist_profiles` table has the following structure:

- `id`: UUID (primary key)
- `user_id`: UUID (references auth.users)
- `name`: String
- `email`: String
- `created_at`: Timestamp with timezone
- `updated_at`: Timestamp with timezone

## Row Level Security (RLS)

The `therapist_profiles` table has RLS policies that:

1. Allow users to view and update only their own profiles
2. Prevent unauthorized access to other users' profiles
3. Allow the service role to manage all profiles
4. Allow profile creation via the `create_therapist_profile_for_user` function

## Automatic Profile Creation

Profiles are automatically created through the Supabase Auth Webhook system:

1. When a user signs up, Supabase Auth triggers a webhook
2. The webhook calls our Edge Function (`create-therapist-profile`)
3. The Edge Function calls the `create_therapist_profile_for_user` database function
4. The database function creates or updates the profile as needed

### Edge Function

The `create-therapist-profile` Edge Function:

- Validates the webhook payload
- Extracts user information
- Uses the service role key to bypass RLS
- Calls the database function to create/update the profile

### Database Function

The `create_therapist_profile_for_user` function:

- Checks if a profile exists with the user's ID
- If found, returns the existing profile
- If not found, checks for a profile with the user's email
- If found by email, updates the user ID
- If not found by either method, creates a new profile

## Fallback Mechanisms

The system includes several fallback mechanisms:

### 1. useTherapistProfile Hook

The hook attempts to:

1. Find profile by user ID
2. Create profile via database function
3. Find profile by email
4. Update profile if found by email

### 2. useUnifiedAvailability Hook

The hook includes:

1. Profile loading state handling
2. Error propagation
3. Comprehensive error handling

## Deployment

### Edge Function Deployment

1. Install dependencies:

   ```bash
   npm install supabase --save-dev
   ```

2. Deploy the Edge Function:
   ```bash
   ./scripts/deploy-edge-function.sh
   ```

### Database Migration

1. Apply the migration:
   ```bash
   supabase db push
   ```

## Implementation Details

### Profile Creation Logic

1. Check if a profile exists with the user's ID
2. If found, use that profile
3. If not found, check if a profile exists with the user's email
4. If found by email but with a different user ID, update the user ID
5. If not found by either method, create a new profile

### Error Handling

The system includes comprehensive error handling:

- Database query errors
- API response errors
- Authentication errors
- Profile creation/update errors
- Webhook payload validation

### Logging

Extensive logging is implemented throughout the system:

- Console logs for debugging
- Error logs for troubleshooting
- API response logs for tracking
- Webhook payload logs
- Database function result logs

## Future Improvements

Potential improvements to the system:

1. Add more profile fields (phone, specialties, etc.)
2. Implement profile verification
3. Add admin tools for profile management
4. Enhance error reporting and monitoring
5. Implement profile deletion and merging
6. Add rate limiting to the webhook
7. Implement webhook retry mechanism
8. Add profile change auditing
