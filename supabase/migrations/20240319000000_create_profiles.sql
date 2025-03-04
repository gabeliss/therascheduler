-- Create therapist_profiles table
CREATE TABLE therapist_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create client_profiles table
CREATE TABLE client_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create indexes
CREATE INDEX therapist_profiles_user_id_idx ON therapist_profiles(user_id);
CREATE INDEX client_profiles_user_id_idx ON client_profiles(user_id);
-- Enable Row Level Security
ALTER TABLE therapist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
-- Create policies for therapist_profiles
CREATE POLICY "Users can view their own therapist profile" ON therapist_profiles FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own therapist profile" ON therapist_profiles FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Create policies for client_profiles
CREATE POLICY "Users can view their own client profile" ON client_profiles FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own client profile" ON client_profiles FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ language 'plpgsql';
-- Create triggers for updated_at
CREATE TRIGGER update_therapist_profiles_updated_at BEFORE
UPDATE ON therapist_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_profiles_updated_at BEFORE
UPDATE ON client_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();