/*
  # Add battery change tracking field to maintenance interventions

  1. Changes
    - Add `has_battery_change` boolean field to `maintenance_interventions` table
    - Default to false for existing records
    - This field tracks whether a battery/pile change was performed during the maintenance intervention
*/

-- Add has_battery_change field to maintenance_interventions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_interventions' AND column_name = 'has_battery_change'
  ) THEN
    ALTER TABLE maintenance_interventions ADD COLUMN has_battery_change boolean DEFAULT false;
  END IF;
END $$;
