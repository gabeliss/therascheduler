-- Add is_all_day column to unified_availability_exceptions table
ALTER TABLE unified_availability_exceptions
ADD COLUMN is_all_day BOOLEAN NOT NULL DEFAULT false;
-- Create index for performance
CREATE INDEX idx_unified_exceptions_is_all_day ON unified_availability_exceptions(is_all_day);