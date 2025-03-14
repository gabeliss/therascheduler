-- First, drop the existing constraint
ALTER TABLE time_off DROP CONSTRAINT IF EXISTS unified_exceptions_day_or_date;
-- Add start_date and end_date columns if they don't exist yet
SELECT add_column_if_not_exists(
        'time_off',
        'start_date',
        'text'
    );
SELECT add_column_if_not_exists(
        'time_off',
        'end_date',
        'text'
    );
-- Migrate existing data: copy specific_date to both start_date and end_date where needed
UPDATE time_off
SET start_date = specific_date,
    end_date = specific_date
WHERE is_recurring = false
    AND specific_date IS NOT NULL
    AND (
        start_date IS NULL
        OR end_date IS NULL
    );
-- Add a new constraint that uses only start_date and end_date for non-recurring exceptions
ALTER TABLE time_off
ADD CONSTRAINT unified_exceptions_day_or_date CHECK (
        (
            is_recurring = true
            AND day_of_week IS NOT NULL
        )
        OR (
            is_recurring = false
            AND start_date IS NOT NULL
            AND end_date IS NOT NULL
        )
    );
-- Mark specific_date as deprecated (we'll keep it for now but will remove it later)
COMMENT ON COLUMN time_off.specific_date IS 'DEPRECATED: Use start_date and end_date instead';