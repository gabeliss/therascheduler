# **Therapist Scheduling Platform - Technical Documentation**

## **Overview**

This document outlines the MVP requirements, tech stack, directory structure, and key implementation details for building the therapist scheduling platform using **Cursor Agent**.

## **MVP Features & Development Phases**

### **Phase 1: Core MVP (Weeks 1-2)**

🚀 **Goal**: Build a functional scheduling system where **clients request appointments, and therapists approve them**.

✅ **Features:**

- Therapist **sign-up & authentication** (Firebase/Auth0 & Supabase)
- Therapist **dashboard** to manage availability
- Clients can **request appointments** (not instant booking)
- Therapists **approve/deny** requests
- **Google Calendar integration** for approved appointments
- Automated **email & SMS notifications** (SendGrid & Twilio)
- **Basic UI with Tailwind CSS & ShadCN**

### **Phase 2: Pilot & Feedback (Weeks 3-4)**

- Onboard **5-10 therapists** for beta testing.
- Gather feedback and refine core features.

### **Phase 3: Expansion & Monetization (Weeks 5-6)**

- Introduce **subscription pricing ($30-$100/month per therapist)**
- Optimize UX & add improvements based on user feedback.
- Expand outreach via marketing and direct therapist contacts.

---

## **Tech Stack**

### **Frontend:**

- **Framework**: React (Vercel)
- **Styling**: Tailwind CSS + ShadCN
- **State Management**: React Query (for API fetching/caching)
- **Form Handling**: React Hook Form
- **Authentication**: Firebase Auth or Auth0

### **Backend:**

- **Database**: Supabase (PostgreSQL)
- **Server Functions**: Supabase Edge Functions (or Express on Vercel if needed)
- **APIs**: RESTful API (Node.js/Express or Supabase functions)
- **Notifications**: Twilio (SMS) & SendGrid (email)
- **Scheduling & Calendar Sync**: Google Calendar API

### **Infrastructure & Deployment:**

- **Frontend Hosting**: Vercel
- **Backend Hosting**: Supabase Edge Functions (or Vercel serverless functions)
- **Database Hosting**: Supabase (PostgreSQL)
- **CI/CD**: GitHub Actions for automatic deployments

---

## **Directory Structure**

```plaintext
therapist-scheduling-platform/
├── frontend/ (React, Tailwind CSS, ShadCN)
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/  # Main pages (Dashboard, Booking, Login, etc.)
│   │   ├── hooks/  # Custom React hooks
│   │   ├── utils/  # Utility functions (API calls, formatting)
│   │   ├── api/  # API client (Supabase, Google Calendar integration)
│   │   ├── types/  # TypeScript interfaces
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── .env (API keys, environment variables)
├── backend/ (Supabase Edge Functions / Express API if needed)
│   ├── functions/
│   │   ├── auth.ts  # Authentication handlers
│   │   ├── booking.ts  # Appointment handling logic
│   │   ├── notifications.ts  # Email/SMS notifications
│   │   ├── calendar.ts  # Google Calendar integration
│   ├── db/
│   │   ├── schema.sql  # Database schema (PostgreSQL)
│   ├── package.json
│   ├── .env (Database & API credentials)
├── docs/  # Documentation
├── README.md
```

---

## **Database Schema (Supabase - PostgreSQL)**

```sql
CREATE TABLE therapists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    available_hours JSONB,  -- Store available slots per week
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID REFERENCES therapists(id),
    client_id UUID REFERENCES clients(id),
    status TEXT CHECK (status IN ('pending', 'approved', 'denied', 'canceled')),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);
```

---

## **Key API Endpoints**

### **Authentication**

```http
POST /api/auth/signup  →  Registers a therapist
POST /api/auth/login  →  Logs in therapist
```

### **Appointments**

```http
GET /api/appointments  →  Get therapist's appointments
POST /api/appointments/request  →  Client requests an appointment
POST /api/appointments/approve  →  Therapist approves request
POST /api/appointments/cancel  →  Cancel appointment
```

### **Google Calendar Integration**

```http
POST /api/calendar/sync  →  Sync approved appointments
```

---

## **Next Steps for Cursor Agent**

1. **Set up project scaffolding**
   - Initialize **frontend (React, Vercel, Tailwind, ShadCN, TypeScript)**.
   - Set up **backend with Supabase Edge Functions**.
2. **Implement authentication (Firebase/Auth0 + Supabase)**.
3. **Build therapist dashboard & appointment booking system**.
4. **Set up notifications (Twilio, SendGrid)**.
5. **Integrate Google Calendar API**.
6. **Deploy MVP to Vercel & Supabase**.

---

This document ensures **Cursor Agent has all necessary details** to build the MVP efficiently.

🚀 **Next Steps: Start project setup & begin core feature implementation.**
