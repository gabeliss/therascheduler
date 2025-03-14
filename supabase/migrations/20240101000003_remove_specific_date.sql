-- Drop the specific_date column after migrating its data
ALTER TABLE time_off DROP COLUMN IF EXISTS specific_date;