-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Therapists can view all client profiles" ON client_profiles;
DROP POLICY IF EXISTS "Therapists can insert client profiles" ON client_profiles;
DROP POLICY IF EXISTS "Clients can view their own profile" ON client_profiles;
DROP POLICY IF EXISTS "Clients can update their own profile" ON client_profiles;
-- Create new policies with proper permissions
CREATE POLICY "Therapists can view all client profiles" ON client_profiles FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM therapist_profiles
            WHERE user_id = auth.uid()
        )
    );
CREATE POLICY "Therapists can insert client profiles" ON client_profiles FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM therapist_profiles
            WHERE user_id = auth.uid()
        )
    );
CREATE POLICY "Clients can view their own profile" ON client_profiles FOR
SELECT USING (user_id = auth.uid());
CREATE POLICY "Clients can update their own profile" ON client_profiles FOR
UPDATE USING (user_id = auth.uid());
-- Add comment explaining the purpose of this migration
COMMENT ON TABLE client_profiles IS 'Client profiles with RLS policies allowing therapists to create and view client profiles';