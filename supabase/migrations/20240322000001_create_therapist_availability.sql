-- Create therapist_availability table
CREATE TABLE therapist_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID REFERENCES therapist_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (
        day_of_week BETWEEN 0 AND 6
    ),
    -- 0 = Sunday, 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT true,
    specific_date DATE,
    -- Only used when is_recurring is false
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Add constraint to ensure end_time is after start_time
    CONSTRAINT availability_end_time_after_start_time CHECK (end_time > start_time),
    -- Add constraint to ensure either day_of_week or specific_date is set
    CONSTRAINT availability_day_or_date CHECK (
        (
            is_recurring = true
            AND day_of_week IS NOT NULL
        )
        OR (
            is_recurring = false
            AND specific_date IS NOT NULL
        )
    )
);
-- Add indexes for performance
CREATE INDEX idx_therapist_availability_therapist_id ON therapist_availability(therapist_id);
CREATE INDEX idx_therapist_availability_day_of_week ON therapist_availability(day_of_week);
CREATE INDEX idx_therapist_availability_specific_date ON therapist_availability(specific_date);
-- Enable Row Level Security
ALTER TABLE therapist_availability ENABLE ROW LEVEL SECURITY;
-- Create policies for therapist_availability
CREATE POLICY "Therapists can view their own availability" ON therapist_availability FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM therapist_profiles
            WHERE id = therapist_id
                AND user_id = auth.uid()
        )
    );
CREATE POLICY "Therapists can insert their own availability" ON therapist_availability FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM therapist_profiles
            WHERE id = therapist_id
                AND user_id = auth.uid()
        )
    );
CREATE POLICY "Therapists can update their own availability" ON therapist_availability FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM therapist_profiles
            WHERE id = therapist_id
                AND user_id = auth.uid()
        )
    );
CREATE POLICY "Therapists can delete their own availability" ON therapist_availability FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM therapist_profiles
        WHERE id = therapist_id
            AND user_id = auth.uid()
    )
);
-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_therapist_availability_updated_at BEFORE
UPDATE ON therapist_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();