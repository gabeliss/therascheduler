#!/bin/bash

# Make the script exit on any error
set -e

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "Supabase CLI is not installed. Installing..."
  npm install -g supabase
fi

# Deploy the Edge Function
echo "Deploying Edge Function..."
supabase functions deploy create-therapist-profile

# Set up the webhook
echo "Setting up webhook..."
supabase functions deploy-webhook create-therapist-profile \
  --event-types signup \
  --secret "${WEBHOOK_SECRET}"

echo "Deployment complete!" 