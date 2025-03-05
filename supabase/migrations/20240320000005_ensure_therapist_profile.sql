-- Create a function to ensure a therapist profile exists for a user
CREATE OR REPLACE FUNCTION public.ensure_therapist_profile() RETURNS TRIGGER AS $$ BEGIN -- Check if a therapist profile already exists for this user
    IF NOT EXISTS (
        SELECT 1
        FROM public.therapist_profiles
        WHERE user_id = NEW.id
    ) THEN -- Create a new therapist profile
INSERT INTO public.therapist_profiles (user_id, name, email)
VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Therapist'),
        NEW.email
    );
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Create a trigger to ensure a therapist profile is created when a user is created
DROP TRIGGER IF EXISTS ensure_therapist_profile_trigger ON auth.users;
CREATE TRIGGER ensure_therapist_profile_trigger
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.ensure_therapist_profile();
-- Create a function to create therapist profiles for existing users
CREATE OR REPLACE FUNCTION public.create_therapist_profiles_for_existing_users() RETURNS void AS $$
DECLARE user_record RECORD;
BEGIN FOR user_record IN
SELECT *
FROM auth.users
WHERE NOT EXISTS (
        SELECT 1
        FROM public.therapist_profiles
        WHERE user_id = auth.users.id
    ) LOOP
INSERT INTO public.therapist_profiles (user_id, name, email)
VALUES (
        user_record.id,
        COALESCE(
            user_record.raw_user_meta_data->>'name',
            'Therapist'
        ),
        user_record.email
    );
END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Run the function to create therapist profiles for existing users
SELECT public.create_therapist_profiles_for_existing_users();