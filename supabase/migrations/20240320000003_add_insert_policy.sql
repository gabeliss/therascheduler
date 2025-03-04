-- Add INSERT policy for therapist_profiles
CREATE POLICY "Users can create their own therapist profile" ON therapist_profiles FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Add INSERT policy for client_profiles
CREATE POLICY "Users can create their own client profile" ON client_profiles FOR
INSERT WITH CHECK (auth.uid() = user_id);