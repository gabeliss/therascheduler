-- Add start_date and end_date columns to unified_availability_exceptions table
SELECT add_column_if_not_exists(
        'unified_availability_exceptions',
        'start_date',
        'text'
    );
SELECT add_column_if_not_exists(
        'unified_availability_exceptions',
        'end_date',
        'text'
    );