/*
  # Add Extrabat Intervention ID to Maintenance Interventions

  1. Changes
    - Add `extrabat_intervention_id` column to `maintenance_interventions` table
    - This column stores the Extrabat appointment ID for synchronization

  2. Details
    - Column type: text (Extrabat API may return string IDs)
    - Nullable: yes (existing interventions won't have this ID)
    - Allows updating Extrabat appointments when interventions are modified
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_interventions' AND column_name = 'extrabat_intervention_id'
  ) THEN
    ALTER TABLE maintenance_interventions ADD COLUMN extrabat_intervention_id text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_maintenance_interventions_extrabat ON maintenance_interventions(extrabat_intervention_id);