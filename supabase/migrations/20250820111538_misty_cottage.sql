/*
  # Add Extrabat code to users table

  1. Changes
    - Add `extrabat_code` column to `users` table for storing Extrabat user codes
    - This allows linking SAV technicians to their Extrabat calendar accounts

  2. Notes
    - Column is nullable as not all users may have Extrabat accounts
    - Used for automatic appointment creation in Extrabat when interventions are scheduled
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'extrabat_code'
  ) THEN
    ALTER TABLE users ADD COLUMN extrabat_code text;
  END IF;
END $$;