-- Add reason column to availability table
ALTER TABLE public.availability
ADD COLUMN IF NOT EXISTS reason TEXT;
-- Add comment to explain the purpose of the reason column
COMMENT ON COLUMN public.availability.reason IS 'Optional reason for blocked time slots (e.g., Lunch, Dentist Appointment)';
-- Ensure the RLS policy allows updating the reason column
ALTER POLICY "Therapists can update their own availability" ON public.availability USING (
    therapist_id = auth.uid()
    OR therapist_id IN (
        SELECT id
        FROM public.therapist_profiles
        WHERE user_id = auth.uid()
    )
) WITH CHECK (
    therapist_id = auth.uid()
    OR therapist_id IN (
        SELECT id
        FROM public.therapist_profiles
        WHERE user_id = auth.uid()
    )
);
-- Ensure the RLS policy allows inserting with the reason column
ALTER POLICY "Therapists can insert their own availability" ON public.availability USING (
    therapist_id = auth.uid()
    OR therapist_id IN (
        SELECT id
        FROM public.therapist_profiles
        WHERE user_id = auth.uid()
    )
) WITH CHECK (
    therapist_id = auth.uid()
    OR therapist_id IN (
        SELECT id
        FROM public.therapist_profiles
        WHERE user_id = auth.uid()
    )
);