/*
  # Add client_email field to sav_requests

  1. Changes
    - Add `client_email` text field to `sav_requests` table
    - This field will store the client's email address selected during SAV creation
    - The email is fetched from Extrabat when creating a SAV request
    - If multiple emails exist, the user can select the appropriate one

  2. Notes
    - Field is nullable to support existing records without emails
    - No RLS changes needed as it's part of the existing sav_requests table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'client_email'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN client_email text;
  END IF;
END $$;