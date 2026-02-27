/*
  # Update Maintenance Interventions Time Fields

  1. Changes
    - Rename `scheduled_at` to `started_at` to match SAV interventions structure
    - Rename `completed_at` to `ended_at` to match SAV interventions structure
    - This makes the maintenance interventions consistent with SAV interventions
    - Preserves existing data during migration

  2. Migration Steps
    - Add new columns with default values
    - Copy data from old columns to new columns
    - Keep old columns for backward compatibility (can be removed later)
*/

-- Add new columns for maintenance_interventions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_interventions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE maintenance_interventions ADD COLUMN started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_interventions' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE maintenance_interventions ADD COLUMN ended_at timestamptz;
  END IF;
END $$;

-- Copy data from old columns to new columns
UPDATE maintenance_interventions
SET 
  started_at = scheduled_at,
  ended_at = completed_at
WHERE started_at IS NULL OR ended_at IS NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_maintenance_interventions_started_at 
  ON maintenance_interventions(started_at);

CREATE INDEX IF NOT EXISTS idx_maintenance_interventions_ended_at 
  ON maintenance_interventions(ended_at);