-- Add columns to track time-off overrides
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS overrides_time_off BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS override_reason TEXT;
-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_overrides_time_off ON appointments(overrides_time_off);
-- Create function to update availability on appointment change
CREATE OR REPLACE FUNCTION update_availability_on_appointment_change() RETURNS TRIGGER AS $$ BEGIN -- If appointment is cancelled, check if it was overriding time-off
    IF NEW.status = 'cancelled'
    AND OLD.overrides_time_off = true THEN -- We could add notification logic here in the future
    -- For now, we'll just update the appointment record
    NEW.override_reason = CONCAT(
        COALESCE(OLD.override_reason, ''),
        ' [CANCELLED]'
    );
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create trigger for appointment status changes
DROP TRIGGER IF EXISTS appointment_status_change ON appointments;
CREATE TRIGGER appointment_status_change
AFTER
UPDATE ON appointments FOR EACH ROW
    WHEN (
        OLD.status IS DISTINCT
        FROM NEW.status
    ) EXECUTE FUNCTION update_availability_on_appointment_change();
-- Add comment to explain the purpose of these columns
COMMENT ON COLUMN appointments.overrides_time_off IS 'Indicates if this appointment was scheduled during a time-off period';
COMMENT ON COLUMN appointments.override_reason IS 'Reason provided by the therapist for scheduling during time-off';