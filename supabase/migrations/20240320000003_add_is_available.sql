-- Add is_available column to the availability table
ALTER TABLE availability
ADD COLUMN is_available BOOLEAN DEFAULT true;
-- Add an index for faster queries
CREATE INDEX availability_is_available_idx ON availability(is_available);
-- Add a comment to explain the purpose of the field
COMMENT ON COLUMN availability.is_available IS 'Indicates whether this time slot is available for appointments (true) or blocked off (false)';