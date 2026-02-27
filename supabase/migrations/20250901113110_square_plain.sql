/*
  # Add Extrabat integration fields

  1. Changes
    - Add `extrabat_client_id` column to `sav_requests` table to store Extrabat client ID
    - Add `extrabat_ouvrage_id` column to `sav_requests` table to store Extrabat ouvrage ID
    - Add `extrabat_sav_id` column to `sav_requests` table to store Extrabat SAV ID once created
    - Add `extrabat_intervention_id` column to `sav_interventions` table to store Extrabat intervention ID

  2. Purpose
    - Enable bidirectional synchronization with Extrabat
    - Track which SAV requests and interventions are linked to Extrabat records
    - Allow for future integration features like status synchronization
*/

-- Add Extrabat fields to sav_requests table
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'extrabat_sav_id'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN extrabat_sav_id integer;
  END IF;
END $$;

-- Add Extrabat field to sav_interventions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_interventions' AND column_name = 'extrabat_intervention_id'
  ) THEN
    ALTER TABLE sav_interventions ADD COLUMN extrabat_intervention_id integer;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sav_requests_extrabat_client ON sav_requests(extrabat_client_id);
CREATE INDEX IF NOT EXISTS idx_sav_requests_extrabat_ouvrage ON sav_requests(extrabat_ouvrage_id);
CREATE INDEX IF NOT EXISTS idx_sav_requests_extrabat_sav ON sav_requests(extrabat_sav_id);
CREATE INDEX IF NOT EXISTS idx_sav_interventions_extrabat ON sav_interventions(extrabat_intervention_id);