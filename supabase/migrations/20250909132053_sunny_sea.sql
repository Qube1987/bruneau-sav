/*
  # Add billing and additional columns to sav_requests table

  1. New Columns
    - `billing_status` (text, default 'to_bill') - Track billing status
    - `billed_at` (timestamptz) - When the request was billed
    - `created_by` (uuid) - User who created the request
    - `extrabat_client_id` (integer) - External system client ID
    - `extrabat_ouvrage_id` (integer) - External system work ID

  2. Constraints
    - Add check constraint for billing_status values
    - Add foreign key for created_by
*/

-- Add missing columns to sav_requests table
DO $$
BEGIN
  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN created_by uuid REFERENCES users(id);
  END IF;

  -- Add extrabat_client_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'extrabat_client_id'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN extrabat_client_id integer;
  END IF;

  -- Add extrabat_ouvrage_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'extrabat_ouvrage_id'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN extrabat_ouvrage_id integer;
  END IF;

  -- Add billing_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'billing_status'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN billing_status text NOT NULL DEFAULT 'to_bill' CHECK (billing_status IN ('to_bill','billed'));
  END IF;

  -- Add billed_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'billed_at'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN billed_at timestamptz;
  END IF;
END $$;