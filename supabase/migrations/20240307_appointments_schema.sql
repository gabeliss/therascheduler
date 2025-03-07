-- Create client_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS client_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create therapist_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS therapist_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Add additional columns to therapist_profiles if they don't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'therapist_profiles'
        AND column_name = 'bio'
) THEN
ALTER TABLE therapist_profiles
ADD COLUMN bio TEXT;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'therapist_profiles'
        AND column_name = 'specialties'
) THEN
ALTER TABLE therapist_profiles
ADD COLUMN specialties TEXT;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'therapist_profiles'
        AND column_name = 'education'
) THEN
ALTER TABLE therapist_profiles
ADD COLUMN education TEXT;
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'therapist_profiles'
        AND column_name = 'licenses'
) THEN
ALTER TABLE therapist_profiles
ADD COLUMN licenses TEXT;
END IF;
END $$;
-- Create appointments table if it doesn't exist
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    therapist_id UUID REFERENCES therapist_profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES client_profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (
        status IN ('pending', 'confirmed', 'cancelled', 'completed')
    ),
    type TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_therapist_id ON appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
-- Create RLS policies for client_profiles if they don't exist
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'client_profiles'
        AND policyname = 'Therapists can view all client profiles'
) THEN CREATE POLICY "Therapists can view all client profiles" ON client_profiles FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM therapist_profiles
            WHERE therapist_profiles.user_id = auth.uid()
        )
    );
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'client_profiles'
        AND policyname = 'Clients can view their own profile'
) THEN CREATE POLICY "Clients can view their own profile" ON client_profiles FOR
SELECT USING (user_id = auth.uid());
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'client_profiles'
        AND policyname = 'Clients can update their own profile'
) THEN CREATE POLICY "Clients can update their own profile" ON client_profiles FOR
UPDATE USING (user_id = auth.uid());
END IF;
END $$;
-- Create RLS policies for appointments if they don't exist
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'appointments'
        AND policyname = 'Therapists can view all appointments'
) THEN CREATE POLICY "Therapists can view all appointments" ON appointments FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM therapist_profiles
            WHERE therapist_profiles.id = appointments.therapist_id
                AND therapist_profiles.user_id = auth.uid()
        )
    );
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'appointments'
        AND policyname = 'Therapists can insert appointments'
) THEN CREATE POLICY "Therapists can insert appointments" ON appointments FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM therapist_profiles
            WHERE therapist_profiles.id = appointments.therapist_id
                AND therapist_profiles.user_id = auth.uid()
        )
    );
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'appointments'
        AND policyname = 'Therapists can update appointments'
) THEN CREATE POLICY "Therapists can update appointments" ON appointments FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM therapist_profiles
            WHERE therapist_profiles.id = appointments.therapist_id
                AND therapist_profiles.user_id = auth.uid()
        )
    );
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'appointments'
        AND policyname = 'Clients can view their own appointments'
) THEN CREATE POLICY "Clients can view their own appointments" ON appointments FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM client_profiles
            WHERE client_profiles.id = appointments.client_id
                AND client_profiles.user_id = auth.uid()
        )
    );
END IF;
END $$;
-- Create function to update updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create triggers to automatically update updated_at if they don't exist
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_client_profiles_updated_at'
) THEN CREATE TRIGGER update_client_profiles_updated_at BEFORE
UPDATE ON client_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_therapist_profiles_updated_at'
) THEN CREATE TRIGGER update_therapist_profiles_updated_at BEFORE
UPDATE ON therapist_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_appointments_updated_at'
) THEN CREATE TRIGGER update_appointments_updated_at BEFORE
UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END IF;
END $$;