-- Add is_all_day column to time_off table
ALTER TABLE time_off
ADD COLUMN is_all_day BOOLEAN NOT NULL DEFAULT false;
-- Create index for performance
CREATE INDEX idx_unified_exceptions_is_all_day ON time_off(is_all_day);