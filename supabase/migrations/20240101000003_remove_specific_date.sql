-- Drop the specific_date column after migrating its data
ALTER TABLE unified_availability_exceptions DROP COLUMN IF EXISTS specific_date;