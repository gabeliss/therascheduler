-- Create base_availability table
CREATE TABLE IF NOT EXISTS base_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID NOT NULL REFERENCES therapist_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (
        day_of_week >= 0
        AND day_of_week <= 6
    ),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT true,
    specific_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Add constraint to ensure end_time is after start_time
    CONSTRAINT base_availability_end_time_after_start_time CHECK (end_time > start_time),
    -- Add constraint to ensure specific_date is set when is_recurring is false
    CONSTRAINT base_availability_specific_date_when_not_recurring CHECK (
        is_recurring = true
        OR (
            is_recurring = false
            AND specific_date IS NOT NULL
        )
    )
);
-- Create availability_exceptions table
CREATE TABLE IF NOT EXISTS availability_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_availability_id UUID NOT NULL REFERENCES base_availability(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Add constraint to ensure end_time is after start_time
    CONSTRAINT availability_exceptions_end_time_after_start_time CHECK (end_time > start_time)
);
-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_base_availability_therapist_id ON base_availability(therapist_id);
CREATE INDEX IF NOT EXISTS idx_base_availability_day_of_week ON base_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_base_availability_specific_date ON base_availability(specific_date);
CREATE INDEX IF NOT EXISTS idx_availability_exceptions_base_id ON availability_exceptions(base_availability_id);
-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ language 'plpgsql';
CREATE TRIGGER update_base_availability_updated_at BEFORE
UPDATE ON base_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_availability_exceptions_updated_at BEFORE
UPDATE ON availability_exceptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Migration function to convert existing availability data to the hierarchical model
CREATE OR REPLACE FUNCTION migrate_to_hierarchical_availability() RETURNS VOID AS $$
DECLARE avail RECORD;
BEGIN -- Process each existing availability record
FOR avail IN
SELECT *
FROM availability LOOP -- Insert into base_availability if it's marked as available
    IF avail.is_available = true THEN
INSERT INTO base_availability (
        therapist_id,
        day_of_week,
        start_time,
        end_time,
        is_recurring,
        specific_date,
        created_at,
        updated_at
    )
VALUES (
        avail.therapist_id,
        avail.day_of_week,
        avail.start_time,
        avail.end_time,
        avail.is_recurring,
        avail.specific_date,
        avail.created_at,
        avail.updated_at
    );
-- If it's marked as blocked (unavailable), find the containing base availability and add as exception
ELSE -- This is more complex and would require custom logic to find the appropriate base availability
-- For now, we'll handle this manually or in application code
END IF;
END LOOP;
END;
$$ LANGUAGE plpgsql;