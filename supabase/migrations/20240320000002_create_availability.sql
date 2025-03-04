-- Create availability table
CREATE TABLE availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID REFERENCES therapist_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (
        day_of_week BETWEEN 0 AND 6
    ),
    -- 0 = Sunday, 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_recurring BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create index for faster queries
CREATE INDEX availability_therapist_id_idx ON availability(therapist_id);
CREATE INDEX availability_day_of_week_idx ON availability(day_of_week);
-- Enable Row Level Security
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
-- Create policies
CREATE POLICY "Therapists can view their own availability" ON availability FOR
SELECT USING (auth.uid() = therapist_id);
CREATE POLICY "Therapists can create their own availability" ON availability FOR
INSERT WITH CHECK (auth.uid() = therapist_id);
CREATE POLICY "Therapists can update their own availability" ON availability FOR
UPDATE USING (auth.uid() = therapist_id) WITH CHECK (auth.uid() = therapist_id);
CREATE POLICY "Therapists can delete their own availability" ON availability FOR DELETE USING (auth.uid() = therapist_id);
-- Create trigger for updated_at
CREATE TRIGGER update_availability_updated_at BEFORE
UPDATE ON availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Add specific_date column to the availability table
ALTER TABLE availability
ADD COLUMN specific_date DATE;