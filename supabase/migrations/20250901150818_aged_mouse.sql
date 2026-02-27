/*
  # Add Extrabat integration columns

  1. New Columns
    - Add `extrabat_client_id` (integer) to store Extrabat client ID
    - Add `extrabat_ouvrage_id` (integer) to store Extrabat ouvrage ID
    - Add `extrabat_code` (text) to users table for technician codes

  2. Changes
    - These columns are optional and can be null
    - Will help link SAV requests to Extrabat data
*/

-- Add Extrabat columns to sav_requests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'extrabat_client_id'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN extrabat_client_id integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'extrabat_ouvrage_id'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN extrabat_ouvrage_id integer;
  END IF;
END $$;

-- Add Extrabat code column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'extrabat_code'
  ) THEN
    ALTER TABLE users ADD COLUMN extrabat_code text;
  END IF;
END $$;