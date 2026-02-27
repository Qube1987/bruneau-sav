/*
  # Add AI Report Fields to SAV Interventions

  1. Changes
    - Add `rapport_brut` column to sav_interventions table for raw technician notes
    - Add `rapport_reformule` column to sav_interventions table for AI-reformulated professional report
    - These fields complement the existing `notes` field
  
  2. Details
    - All fields are optional (nullable)
    - Text fields use `text` type for unlimited length
    - Maintains backward compatibility with existing `notes` field
*/

-- Add rapport brut (raw notes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_interventions' AND column_name = 'rapport_brut'
  ) THEN
    ALTER TABLE sav_interventions ADD COLUMN rapport_brut text;
  END IF;
END $$;

-- Add rapport reformulé (AI-reformulated)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_interventions' AND column_name = 'rapport_reformule'
  ) THEN
    ALTER TABLE sav_interventions ADD COLUMN rapport_reformule text;
  END IF;
END $$;