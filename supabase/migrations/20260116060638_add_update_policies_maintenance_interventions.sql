/*
  # Add UPDATE policies for maintenance interventions

  1. Changes
    - Add UPDATE policy for maintenance_interventions table
    - Add UPDATE policy for maintenance_intervention_technicians table

  2. Security
    - Allow authenticated users to update maintenance intervention records
    - Allow authenticated users to update technician assignments
*/

-- Add UPDATE policy for maintenance_interventions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_interventions' 
    AND policyname = 'Users can update maintenance interventions'
  ) THEN
    CREATE POLICY "Users can update maintenance interventions"
      ON maintenance_interventions FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Add UPDATE policy for maintenance_intervention_technicians
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'maintenance_intervention_technicians' 
    AND policyname = 'Users can update maintenance intervention technician assignments'
  ) THEN
    CREATE POLICY "Users can update maintenance intervention technician assignments"
      ON maintenance_intervention_technicians FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;