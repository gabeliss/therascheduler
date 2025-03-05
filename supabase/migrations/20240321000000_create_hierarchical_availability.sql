-- Create base_availability table
CREATE TABLE base_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID REFERENCES therapist_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (
        day_of_week BETWEEN 0 AND 6
    ),
    -- 0 = Sunday, 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_recurring BOOLEAN DEFAULT true,
    specific_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create availability_exceptions table
CREATE TABLE availability_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_availability_id UUID REFERENCES base_availability(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- We'll use a trigger instead of a check constraint for time range validation
);
-- Create a trigger function to validate exception time ranges
CREATE OR REPLACE FUNCTION validate_exception_time_range() RETURNS TRIGGER AS $$
DECLARE base_start TIME;
base_end TIME;
BEGIN -- Get the base availability time range
SELECT start_time,
    end_time INTO base_start,
    base_end
FROM base_availability
WHERE id = NEW.base_availability_id;
-- Check if the exception time is within the base availability time range
IF NEW.start_time < base_start
OR NEW.end_time > base_end THEN RAISE EXCEPTION 'Exception time must be within the base availability time range (% to %)',
base_start,
base_end;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create the trigger
CREATE TRIGGER check_exception_time_range BEFORE
INSERT
    OR
UPDATE ON availability_exceptions FOR EACH ROW EXECUTE FUNCTION validate_exception_time_range();
-- Create indexes for faster queries
CREATE INDEX base_availability_therapist_id_idx ON base_availability(therapist_id);
CREATE INDEX base_availability_day_of_week_idx ON base_availability(day_of_week);
CREATE INDEX availability_exceptions_base_id_idx ON availability_exceptions(base_availability_id);
-- Enable Row Level Security
ALTER TABLE base_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
-- Create policies for base_availability
CREATE POLICY "Therapists can view their own base availability" ON base_availability FOR
SELECT USING (
        auth.uid() IN (
            SELECT user_id
            FROM therapist_profiles
            WHERE id = therapist_id
        )
    );
CREATE POLICY "Therapists can create their own base availability" ON base_availability FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id
            FROM therapist_profiles
            WHERE id = therapist_id
        )
    );
CREATE POLICY "Therapists can update their own base availability" ON base_availability FOR
UPDATE USING (
        auth.uid() IN (
            SELECT user_id
            FROM therapist_profiles
            WHERE id = therapist_id
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT user_id
            FROM therapist_profiles
            WHERE id = therapist_id
        )
    );
CREATE POLICY "Therapists can delete their own base availability" ON base_availability FOR DELETE USING (
    auth.uid() IN (
        SELECT user_id
        FROM therapist_profiles
        WHERE id = therapist_id
    )
);
-- Create policies for availability_exceptions
CREATE POLICY "Therapists can view their own availability exceptions" ON availability_exceptions FOR
SELECT USING (
        auth.uid() IN (
            SELECT tp.user_id
            FROM therapist_profiles tp
                JOIN base_availability ba ON tp.id = ba.therapist_id
            WHERE ba.id = base_availability_id
        )
    );
CREATE POLICY "Therapists can create their own availability exceptions" ON availability_exceptions FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT tp.user_id
            FROM therapist_profiles tp
                JOIN base_availability ba ON tp.id = ba.therapist_id
            WHERE ba.id = base_availability_id
        )
    );
CREATE POLICY "Therapists can update their own availability exceptions" ON availability_exceptions FOR
UPDATE USING (
        auth.uid() IN (
            SELECT tp.user_id
            FROM therapist_profiles tp
                JOIN base_availability ba ON tp.id = ba.therapist_id
            WHERE ba.id = base_availability_id
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT tp.user_id
            FROM therapist_profiles tp
                JOIN base_availability ba ON tp.id = ba.therapist_id
            WHERE ba.id = base_availability_id
        )
    );
CREATE POLICY "Therapists can delete their own availability exceptions" ON availability_exceptions FOR DELETE USING (
    auth.uid() IN (
        SELECT tp.user_id
        FROM therapist_profiles tp
            JOIN base_availability ba ON tp.id = ba.therapist_id
        WHERE ba.id = base_availability_id
    )
);
-- Create triggers for updated_at
CREATE TRIGGER update_base_availability_updated_at BEFORE
UPDATE ON base_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_availability_exceptions_updated_at BEFORE
UPDATE ON availability_exceptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Migration function to populate base_availability from existing availability data
CREATE OR REPLACE FUNCTION migrate_to_hierarchical_availability() RETURNS void AS $$ BEGIN -- Insert existing availability records into base_availability
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
SELECT therapist_id,
    day_of_week,
    start_time,
    end_time,
    is_recurring,
    specific_date,
    created_at,
    updated_at
FROM availability
WHERE is_available = true;
-- For blocked time slots, create base availability entries with exceptions
-- First, insert the base availability entries
WITH blocked_slots AS (
    SELECT id as old_id,
        therapist_id,
        day_of_week,
        start_time,
        end_time,
        is_recurring,
        specific_date,
        reason,
        created_at,
        updated_at
    FROM availability
    WHERE is_available = false
),
inserted_base AS (
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
    SELECT therapist_id,
        day_of_week,
        start_time,
        end_time,
        is_recurring,
        specific_date,
        created_at,
        updated_at
    FROM blocked_slots
    RETURNING id,
        therapist_id
) -- Then, insert the exceptions
INSERT INTO availability_exceptions (
        base_availability_id,
        start_time,
        end_time,
        reason,
        created_at,
        updated_at
    )
SELECT ib.id,
    bs.start_time,
    bs.end_time,
    bs.reason,
    bs.created_at,
    bs.updated_at
FROM blocked_slots bs
    JOIN inserted_base ib ON bs.therapist_id = ib.therapist_id;
END;
$$ LANGUAGE plpgsql;
-- Execute the migration function
SELECT migrate_to_hierarchical_availability();
-- Drop the migration function after use
DROP FUNCTION migrate_to_hierarchical_availability();