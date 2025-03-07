# Setting Up Supabase Auth Webhook

This guide explains how to set up a Supabase Auth Webhook to automatically create therapist profiles when new users sign up.

## Overview

Supabase Auth Webhooks allow you to trigger actions when auth events occur, such as user signup, login, or password reset. We'll use this to automatically create a therapist profile when a new user signs up.

## Step 1: Configure the Webhook in Supabase Dashboard

1. Log in to your Supabase dashboard
2. Navigate to **Authentication** > **Webhooks**
3. Click **Add Webhook**
4. Configure the webhook with the following settings:
   - **Name**: `Create Therapist Profile`
   - **URL**: `https://your-app-domain.com/api/auth/signup-handler`
   - **Events**: Select `signup`
   - **HTTP Method**: `POST`
   - **Headers**: Add a header `x-webhook-secret` with a secure random value

## Step 2: Store the Webhook Secret

1. Generate a secure random string for your webhook secret
2. Add this secret to your environment variables:
   ```
   WEBHOOK_SECRET=your_secure_random_string
   ```
3. Make sure this environment variable is set in all environments (development, staging, production)

## Step 3: Verify the Webhook Configuration

The webhook payload will include:

```json
{
	"type": "signup",
	"event": {
		"user_id": "uuid",
		"email": "user@example.com",
		"user_metadata": {
			"name": "User Name"
		}
	}
}
```

Our `/api/auth/signup-handler` endpoint is already configured to handle this payload format and verify the webhook secret.

## Step 4: Testing the Webhook

1. Create a new user through the Supabase authentication system
2. Check the logs to verify that the webhook was triggered
3. Verify that a therapist profile was created for the new user

## Security Considerations

- The webhook secret should be kept secure and rotated periodically
- The webhook endpoint should verify the secret before processing the request
- Use HTTPS for the webhook URL to ensure secure transmission
- Consider implementing rate limiting to prevent abuse

## Troubleshooting

If profiles aren't being created automatically:

1. Check the server logs for errors
2. Verify that the webhook is configured correctly in Supabase
3. Ensure the webhook secret matches between Supabase and your application
4. Check that the endpoint is accessible from the internet
5. Verify that the service role key has the necessary permissions
