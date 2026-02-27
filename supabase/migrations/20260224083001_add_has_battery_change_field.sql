/*
  # Add battery change tracking field

  1. Changes
    - Add `has_battery_change` boolean field to `sav_interventions` table
    - Default to false for existing records
    - This field tracks whether a battery/pile change was performed during the intervention
  
  2. Notes
    - This ensures the "Changement de piles/batteries" checkbox state persists when reopening the report modal
*/

-- Add has_battery_change field to sav_interventions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_interventions' AND column_name = 'has_battery_change'
  ) THEN
    ALTER TABLE sav_interventions ADD COLUMN has_battery_change boolean DEFAULT false;
  END IF;
END $$;