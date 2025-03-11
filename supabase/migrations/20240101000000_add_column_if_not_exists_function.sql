-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS add_column_if_not_exists(text, text, text);
-- Create a function to add a column if it doesn't exist
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
        p_table_name text,
        p_column_name text,
        p_column_type text
    ) RETURNS void AS $$
DECLARE column_exists boolean;
BEGIN -- Check if the column already exists
SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
            AND table_name = p_table_name
            AND column_name = p_column_name
    ) INTO column_exists;
-- If the column doesn't exist, add it
IF NOT column_exists THEN EXECUTE format(
    'ALTER TABLE %I ADD COLUMN %I %s',
    p_table_name,
    p_column_name,
    p_column_type
);
END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;