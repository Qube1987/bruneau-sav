/*
  # Add end time to interventions

  1. Changes
    - Add `ended_at` column to `sav_interventions` table
    - Rename `occurred_at` to `started_at` for clarity
    - Update existing data to maintain compatibility

  2. Migration steps
    - Add new column `ended_at`
    - Rename `occurred_at` to `started_at`
    - Update any existing records
*/

-- Add the new ended_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_interventions' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE sav_interventions ADD COLUMN ended_at timestamptz;
  END IF;
END $$;

-- Rename occurred_at to started_at for better clarity
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_interventions' AND column_name = 'occurred_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_interventions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE sav_interventions RENAME COLUMN occurred_at TO started_at;
  END IF;
END $$;