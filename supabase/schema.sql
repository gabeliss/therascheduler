-- Create tables for our application
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Therapists table
CREATE TABLE IF NOT EXISTS public.therapists (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    available_hours JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID REFERENCES public.therapists(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    status TEXT CHECK (
        status IN ('pending', 'approved', 'denied', 'canceled')
    ),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT appointments_time_check CHECK (end_time > start_time)
);
-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_id ON public.appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
-- Row Level Security (RLS) policies
ALTER TABLE public.therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.therapists;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.therapists;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.therapists;
-- Updated therapist policies
CREATE POLICY "Enable insert for signup" ON public.therapists FOR
INSERT TO authenticated,
    anon WITH CHECK (true);
CREATE POLICY "Enable select for own profile" ON public.therapists FOR
SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Enable update for own profile" ON public.therapists FOR
UPDATE TO authenticated USING (auth.uid() = id);
-- Client policies
CREATE POLICY "Enable insert for all users" ON public.clients FOR
INSERT TO authenticated,
    anon WITH CHECK (true);
CREATE POLICY "Enable select for authenticated users" ON public.clients FOR
SELECT TO authenticated USING (true);
-- Appointment policies
CREATE POLICY "Enable insert for all users" ON public.appointments FOR
INSERT TO authenticated,
    anon WITH CHECK (true);
CREATE POLICY "Enable select for therapists" ON public.appointments FOR
SELECT TO authenticated USING (auth.uid() = therapist_id);
CREATE POLICY "Enable update for therapists" ON public.appointments FOR
UPDATE TO authenticated USING (auth.uid() = therapist_id);