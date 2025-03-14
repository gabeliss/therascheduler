-- Add start_date and end_date columns to time_off table
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