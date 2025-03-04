-- Drop existing table if it exists
DROP TABLE IF EXISTS appointments CASCADE;
-- Create appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- Create index for faster queries
CREATE INDEX appointments_therapist_id_idx ON appointments(therapist_id);
CREATE INDEX appointments_client_id_idx ON appointments(client_id);
CREATE INDEX appointments_start_time_idx ON appointments(start_time);
-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Therapists can view their own appointments" ON appointments;
DROP POLICY IF EXISTS "Therapists can create appointments" ON appointments;
DROP POLICY IF EXISTS "Therapists can update their own appointments" ON appointments;
-- Create policies
CREATE POLICY "Therapists can view their own appointments" ON appointments FOR
SELECT USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can create appointments" ON appointments FOR
INSERT WITH CHECK (auth.uid() = therapist_id);
CREATE POLICY "Therapists can update their own appointments" ON appointments FOR
UPDATE USING (auth.uid() = therapist_id) WITH CHECK (auth.uid() = therapist_id);
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
-- Create trigger for updated_at using existing function
CREATE TRIGGER update_appointments_updated_at BEFORE
UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();