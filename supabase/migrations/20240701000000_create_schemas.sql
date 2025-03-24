-- Create therapists table first
CREATE TABLE IF NOT EXISTS therapists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Enable RLS on therapists
ALTER TABLE therapists ENABLE ROW LEVEL SECURITY;
-- Enable RLS on clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- Create policies for therapists table
CREATE POLICY "Users can view their own therapist profile" ON therapists FOR
SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own therapist profile" ON therapists FOR
UPDATE USING (user_id = auth.uid());
CREATE POLICY "Service role can manage all therapist profiles" ON therapists USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Allow creation of therapist profiles via function" ON therapists FOR
INSERT WITH CHECK (
        auth.role() = 'service_role'
        OR user_id = auth.uid()
    );
-- Create policies for clients table
CREATE POLICY "Users can view their own client profile" ON clients FOR
SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own client profile" ON clients FOR
UPDATE USING (user_id = auth.uid());
CREATE POLICY "Service role can manage all client profiles" ON clients USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Allow creation of client profiles via function" ON clients FOR
INSERT WITH CHECK (
        auth.role() = 'service_role'
        OR user_id = auth.uid()
    );
-- Create availability table according to the AVAILABILITY.md spec
CREATE TABLE IF NOT EXISTS availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    recurrence TEXT,
    -- e.g., "weekly:Mon,Wed,Fri" or null for one-time
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT availability_end_time_after_start_time CHECK (end_time > start_time)
);
-- Create time_off table according to the AVAILABILITY.md spec
CREATE TABLE IF NOT EXISTS time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    recurrence TEXT,
    -- e.g., "weekly:Mon,Wed,Fri" or null for one-time
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT time_off_end_time_after_start_time CHECK (end_time > start_time)
);
-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    therapist_id UUID REFERENCES therapists(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending',
    -- pending, confirmed, cancelled, completed
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT appointments_end_time_after_start_time CHECK (end_time > start_time),
    -- ensure appointment doesn't conflict with other appointments
    CONSTRAINT unique_therapist_timeslot UNIQUE (therapist_id, start_time, end_time)
);
-- Add indexes for better performance
CREATE INDEX idx_availability_therapist_id ON availability(therapist_id);
CREATE INDEX idx_time_off_therapist_id ON time_off(therapist_id);
CREATE INDEX idx_appointments_therapist_id ON appointments(therapist_id);
CREATE INDEX idx_appointments_client_id ON appointments(client_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
-- Create function to handle updating timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create functions to handle recurrence
CREATE OR REPLACE FUNCTION get_next_occurrences(
        start_time TIMESTAMP WITH TIME ZONE,
        end_time TIMESTAMP WITH TIME ZONE,
        recurrence TEXT,
        from_date DATE,
        to_date DATE
    ) RETURNS TABLE (
        occurrence_start TIMESTAMP WITH TIME ZONE,
        occurrence_end TIMESTAMP WITH TIME ZONE
    ) AS $$
DECLARE days TEXT [];
day TEXT;
day_of_week INTEGER;
curr_date DATE := from_date;
time_start TIME := start_time::TIME;
time_end TIME := end_time::TIME;
pattern TEXT;
frequency TEXT;
BEGIN -- If no recurrence, just return the original times if they're within range
IF recurrence IS NULL THEN IF start_time::DATE BETWEEN from_date AND to_date THEN RETURN QUERY
SELECT start_time,
    end_time;
END IF;
ELSE -- Extract pattern type (daily, weekly) and days if applicable
pattern := split_part(recurrence, ':', 1);
IF pattern = 'daily' THEN -- For each day in the range
WHILE curr_date <= to_date LOOP RETURN QUERY
SELECT curr_date + time_start,
    curr_date + time_end;
curr_date := curr_date + INTERVAL '1 day';
END LOOP;
ELSIF pattern = 'weekly' THEN -- Get the days specified in the pattern (e.g., Mon,Wed,Fri)
frequency := split_part(recurrence, ':', 2);
days := string_to_array(frequency, ',');
-- For each day in the range
WHILE curr_date <= to_date LOOP -- Check if the current day is in the specified days
FOREACH day IN ARRAY days LOOP day_of_week := CASE
    WHEN day = 'Sun' THEN 0
    WHEN day = 'Mon' THEN 1
    WHEN day = 'Tue' THEN 2
    WHEN day = 'Wed' THEN 3
    WHEN day = 'Thu' THEN 4
    WHEN day = 'Fri' THEN 5
    WHEN day = 'Sat' THEN 6
END;
-- If current day matches, add to results
IF EXTRACT(
    DOW
    FROM curr_date
) = day_of_week THEN RETURN QUERY
SELECT curr_date + time_start,
    curr_date + time_end;
END IF;
END LOOP;
curr_date := curr_date + INTERVAL '1 day';
END LOOP;
END IF;
END IF;
END;
$$ LANGUAGE plpgsql;
-- Enable Row Level Security
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
-- Create policies for availability
CREATE POLICY "Therapists can view their own availability" ON availability FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM therapists
            WHERE id = therapist_id
                AND user_id = auth.uid()
        )
    );
CREATE POLICY "Therapists can insert their own availability" ON availability FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM therapists
            WHERE id = therapist_id
                AND user_id = auth.uid()
        )
    );
CREATE POLICY "Therapists can update their own availability" ON availability FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM therapists
            WHERE id = therapist_id
                AND user_id = auth.uid()
        )
    );
CREATE POLICY "Therapists can delete their own availability" ON availability FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM therapists
        WHERE id = therapist_id
            AND user_id = auth.uid()
    )
);
-- Create policies for time_off
CREATE POLICY "Therapists can view their own time_off" ON time_off FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM therapists
            WHERE id = therapist_id
                AND user_id = auth.uid()
        )
    );
CREATE POLICY "Therapists can insert their own time_off" ON time_off FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM therapists
            WHERE id = therapist_id
                AND user_id = auth.uid()
        )
    );
CREATE POLICY "Therapists can update their own time_off" ON time_off FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM therapists
            WHERE id = therapist_id
                AND user_id = auth.uid()
        )
    );
CREATE POLICY "Therapists can delete their own time_off" ON time_off FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM therapists
        WHERE id = therapist_id
            AND user_id = auth.uid()
    )
);
-- Create policies for appointments
CREATE POLICY "Therapists can view their own appointments" ON appointments FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM therapists
            WHERE id = therapist_id
                AND user_id = auth.uid()
        )
    );
CREATE POLICY "Clients can view their own appointments" ON appointments FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM clients
            WHERE id = client_id
                AND user_id = auth.uid()
        )
    );
CREATE POLICY "Therapists can create appointments" ON appointments FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM therapists
            WHERE id = therapist_id
                AND user_id = auth.uid()
        )
    );
CREATE POLICY "Clients can create appointments" ON appointments FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM clients
            WHERE id = client_id
                AND user_id = auth.uid()
        )
    );
CREATE POLICY "Therapists can update their appointments" ON appointments FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM therapists
            WHERE id = therapist_id
                AND user_id = auth.uid()
        )
    );
CREATE POLICY "Clients can update their appointments" ON appointments FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM clients
            WHERE id = client_id
                AND user_id = auth.uid()
        )
    );
CREATE POLICY "Therapists can delete their appointments" ON appointments FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM therapists
        WHERE id = therapist_id
            AND user_id = auth.uid()
    )
);
-- Add triggers to update updated_at timestamp
CREATE TRIGGER update_therapists_updated_at BEFORE
UPDATE ON therapists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE
UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_availability_updated_at BEFORE
UPDATE ON availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_off_updated_at BEFORE
UPDATE ON time_off FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE
UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();