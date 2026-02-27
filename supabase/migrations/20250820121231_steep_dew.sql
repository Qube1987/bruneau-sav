/*
  # Add extrabat_code column to users table

  1. Changes
    - Add `extrabat_code` column to `users` table
    - Column type: text (to handle numeric codes as strings)
    - Column is nullable (not all users need an Extrabat code)

  2. Purpose
    - Store Extrabat user codes for API integration
    - Enable automatic appointment creation in Extrabat agenda
*/

-- Add extrabat_code column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'extrabat_code'
  ) THEN
    ALTER TABLE users ADD COLUMN extrabat_code text;
  END IF;
END $$;