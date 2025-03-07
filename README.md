# TheraScheduler - Therapist Scheduling Platform

A modern scheduling platform built for therapists to manage their appointments and client bookings efficiently.

## Features

- 🔐 Secure therapist authentication and profile management
- 📅 Easy appointment scheduling
- 🔄 Google Calendar integration
- 📱 SMS & email notifications
- ⚡ Real-time updates
- 🎨 Modern, responsive UI

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: React Query
- **Form Handling**: React Hook Form
- **Notifications**: Twilio (SMS) & SendGrid (email)

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Supabase account
- SendGrid account
- Twilio account
- Google Cloud Console account (for Calendar API)

## Setup Instructions

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd therascheduler
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your environment variables:

   ```
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # SendGrid Configuration
   SENDGRID_API_KEY=your-sendgrid-api-key

   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=your-twilio-phone-number

   # Google Calendar API
   GOOGLE_CALENDAR_CLIENT_ID=your-google-client-id
   GOOGLE_CALENDAR_CLIENT_SECRET=your-google-client-secret

   # Webhook Configuration
   WEBHOOK_SECRET=your-webhook-secret
   ```

4. Set up your database:

   ```bash
   # Option 1: Using Supabase CLI
   # Install Supabase CLI
   npm install -g supabase

   # Link your project
   supabase link --project-ref your-project-ref

   # Apply database migrations
   supabase db push

   # Option 2: Using Supabase Dashboard
   # 1. Log in to your Supabase dashboard
   # 2. Navigate to the SQL Editor
   # 3. Copy the contents of the migration files in the `supabase/migrations` directory
   # 4. Paste and execute the SQL in the SQL Editor
   # 5. Optionally, run the seed script in `supabase/seed.sql` to populate the database with sample data
   ```

5. Run the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
therascheduler/
├── app/
│   ├── components/  # Reusable UI components
│   ├── hooks/      # Custom React hooks
│   ├── utils/      # Utility functions
│   ├── api/        # API endpoints
│   ├── types/      # TypeScript types
│   └── ...         # Next.js app router pages
├── public/         # Static assets
├── supabase/
│   ├── migrations/ # Database migrations
│   └── functions/  # Edge Functions
├── scripts/        # Deployment scripts
└── ...            # Config files
```

## Core Features

### Therapist Profiles

Therapist profiles are automatically created when users sign up:

1. **Profile Creation**: Automatic via Supabase Auth Webhook
2. **Data Structure**:
   - Unique user ID (linked to auth)
   - Name and email
   - Creation and update timestamps
3. **Security**:
   - Row Level Security (RLS) policies
   - Service role access for admin functions
   - Secure profile creation via Edge Functions

### Availability Management

Therapists can manage their availability through:

1. **Unified Availability System**:
   - Regular weekly schedules
   - One-time exceptions
   - Recurring exceptions
2. **Real-time Updates**:
   - Instant schedule changes
   - Conflict prevention
   - Client notifications

## Development Workflow

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request
4. Wait for review and approval

## License

[MIT License](LICENSE)

## Support

For support, email support@therascheduler.com or open an issue in the repository.
