-- Create unified_availability_exceptions table
CREATE TABLE unified_availability_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID REFERENCES therapist_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (
        day_of_week BETWEEN 0 AND 6
    ),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason TEXT,
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    specific_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Add constraint to ensure end_time is after start_time
    CONSTRAINT unified_exceptions_end_time_after_start_time CHECK (end_time > start_time),
    -- Add constraint to ensure either day_of_week or specific_date is set
    CONSTRAINT unified_exceptions_day_or_date CHECK (
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
CREATE INDEX idx_unified_exceptions_therapist_id ON unified_availability_exceptions(therapist_id);
CREATE INDEX idx_unified_exceptions_day_of_week ON unified_availability_exceptions(day_of_week);
CREATE INDEX idx_unified_exceptions_specific_date ON unified_availability_exceptions(specific_date);
CREATE INDEX idx_unified_exceptions_is_recurring ON unified_availability_exceptions(is_recurring);
-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_unified_exceptions_updated_at BEFORE
UPDATE ON unified_availability_exceptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Enable Row Level Security
ALTER TABLE unified_availability_exceptions ENABLE ROW LEVEL SECURITY;
-- Create a function to check if the user is the owner of the therapist profile
CREATE OR REPLACE FUNCTION is_therapist_profile_owner(profile_id UUID) RETURNS BOOLEAN AS $$ BEGIN RETURN EXISTS (
        SELECT 1
        FROM therapist_profiles
        WHERE id = profile_id
            AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Create policies for unified_availability_exceptions
CREATE POLICY "Therapists can view their own exceptions" ON unified_availability_exceptions FOR
SELECT USING (is_therapist_profile_owner(therapist_id));
CREATE POLICY "Therapists can insert their own exceptions" ON unified_availability_exceptions FOR
INSERT WITH CHECK (is_therapist_profile_owner(therapist_id));
CREATE POLICY "Therapists can update their own exceptions" ON unified_availability_exceptions FOR
UPDATE USING (is_therapist_profile_owner(therapist_id));
CREATE POLICY "Therapists can delete their own exceptions" ON unified_availability_exceptions FOR DELETE USING (is_therapist_profile_owner(therapist_id));
-- Migration function to convert existing exceptions to the unified model
CREATE OR REPLACE FUNCTION migrate_to_unified_exceptions() RETURNS VOID AS $$
DECLARE base_rec RECORD;
exception_rec RECORD;
BEGIN -- Process each existing base availability record
FOR base_rec IN
SELECT *
FROM base_availability LOOP -- For each exception of this base availability
    FOR exception_rec IN
SELECT *
FROM availability_exceptions
WHERE base_availability_id = base_rec.id LOOP -- Insert into unified_availability_exceptions
INSERT INTO unified_availability_exceptions (
        therapist_id,
        day_of_week,
        start_time,
        end_time,
        reason,
        is_recurring,
        specific_date,
        created_at,
        updated_at
    )
VALUES (
        base_rec.therapist_id,
        CASE
            WHEN base_rec.is_recurring THEN base_rec.day_of_week
            ELSE NULL
        END,
        exception_rec.start_time,
        exception_rec.end_time,
        exception_rec.reason,
        base_rec.is_recurring,
        CASE
            WHEN NOT base_rec.is_recurring THEN base_rec.specific_date
            ELSE NULL
        END,
        exception_rec.created_at,
        exception_rec.updated_at
    );
END LOOP;
END LOOP;
END;
$$ LANGUAGE plpgsql;