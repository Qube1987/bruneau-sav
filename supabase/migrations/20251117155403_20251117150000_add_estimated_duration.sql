/*
  # Add Estimated Duration Field

  ## Overview
  This migration adds estimated intervention duration fields to SAV requests and maintenance contracts.

  ## Changes

  ### 1. Add Column to `sav_requests`
    - `estimated_duration` (integer, optional) - Estimated duration in minutes

  ### 2. Add Column to `maintenance_contracts`
    - `estimated_duration` (integer, optional) - Estimated duration in minutes

  ## Benefits
  - Better planning and scheduling of interventions
  - Visible in map popups for quick reference
  - Helps technicians estimate their daily workload

  ## Notes
  - Duration is stored in minutes for consistency
  - Field is optional (NULL allowed)
  - Can be displayed in hours and minutes format in the UI
*/

-- Add estimated_duration to sav_requests (in minutes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'estimated_duration'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN estimated_duration integer;
  END IF;
END $$;

-- Add estimated_duration to maintenance_contracts (in minutes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_contracts' AND column_name = 'estimated_duration'
  ) THEN
    ALTER TABLE maintenance_contracts ADD COLUMN estimated_duration integer;
  END IF;
END $$;

-- Add constraint to ensure positive duration
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'sav_requests_estimated_duration_positive'
  ) THEN
    ALTER TABLE sav_requests ADD CONSTRAINT sav_requests_estimated_duration_positive CHECK (estimated_duration IS NULL OR estimated_duration > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'maintenance_contracts_estimated_duration_positive'
  ) THEN
    ALTER TABLE maintenance_contracts ADD CONSTRAINT maintenance_contracts_estimated_duration_positive CHECK (estimated_duration IS NULL OR estimated_duration > 0);
  END IF;
END $$;
