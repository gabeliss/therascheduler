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
- **Embeddable booking widget** for therapists' websites

### **Phase 2: Pilot & Feedback (Weeks 3-4)**

- Onboard **5-10 therapists** for beta testing.
- Gather feedback and refine core features.
- Enhance the **embedded booking widget** with customization options.
- Implement **analytics** to track booking conversion rates.

### **Phase 3: Expansion & Monetization (Weeks 5-6)**

- Introduce **subscription pricing ($30-$100/month per therapist)**
- Optimize UX & add improvements based on user feedback.
- Expand outreach via marketing and direct therapist contacts.
- Add **advanced widget customization** for premium subscribers.

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
│   │   ├── embed.ts  # Embeddable widget code
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

### **Embeddable Widget**

```http
GET /api/embed  →  Get embeddable widget script
```

---

## **Embeddable Booking Widget**

The platform provides an embeddable booking widget that therapists can add to their own websites, allowing clients to book appointments directly without leaving the therapist's site.

### **How It Works**

1. **Therapist Setup**:

   - Therapist configures their availability in the dashboard
   - System generates a unique embed code for the therapist
   - Therapist adds the embed code to their website

2. **Client Experience**:

   - Client visits the therapist's website
   - Client clicks "Book Appointment" button
   - Booking widget opens as a modal on the therapist's site
   - Client selects date, time, and provides their information
   - Appointment request is sent to the therapist for approval

3. **Technical Implementation**:
   - JavaScript embed code loads from our server
   - Creates a modal/popup with an iframe containing the booking interface
   - Communicates with our backend API to handle the booking process
   - Responsive design works on mobile and desktop

### **Embed Code Example**

```html
<!-- Add this to your website where you want the "Book Appointment" button to appear -->
<button data-therascheduler-booking>Book an Appointment</button>

<!-- Add this script to the bottom of your page before the closing </body> tag -->
<script src="https://therascheduler.com/api/embed?therapistId=YOUR_ID_HERE"></script>
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
6. **Implement embeddable booking widget**.
7. **Deploy MVP to Vercel & Supabase**.

---

This document ensures **Cursor Agent has all necessary details** to build the MVP efficiently.

🚀 **Next Steps: Start project setup & begin core feature implementation.**
