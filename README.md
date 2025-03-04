# TheraScheduler - Therapist Scheduling Platform

A modern scheduling platform built for therapists to manage their appointments and client bookings efficiently.

## Features

- 🔐 Secure therapist authentication
- 📅 Easy appointment scheduling
- 🔄 Google Calendar integration
- 📱 SMS & email notifications
- ⚡ Real-time updates
- 🎨 Modern, responsive UI

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Firebase Auth
- **State Management**: React Query
- **Form Handling**: React Hook Form
- **Notifications**: Twilio (SMS) & SendGrid (email)

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Supabase account
- Firebase account
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

   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id

   # SendGrid Configuration
   SENDGRID_API_KEY=your-sendgrid-api-key

   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your-twilio-account-sid
   TWILIO_AUTH_TOKEN=your-twilio-auth-token
   TWILIO_PHONE_NUMBER=your-twilio-phone-number

   # Google Calendar API
   GOOGLE_CALENDAR_CLIENT_ID=your-google-client-id
   GOOGLE_CALENDAR_CLIENT_SECRET=your-google-client-secret
   ```

4. Set up your database:

   - Create a new project in Supabase
   - Run the database schema provided in `docs/DOC.md`

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
├── docs/          # Documentation
└── ...            # Config files
```

## Development Workflow

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request
4. Wait for review and approval

## License

[MIT License](LICENSE)

## Support

For support, email support@therascheduler.com or open an issue in the repository.
