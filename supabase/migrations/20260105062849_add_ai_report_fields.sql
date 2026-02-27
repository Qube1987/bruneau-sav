/*
  # Add AI Report Reformulation Fields

  1. Changes
    - Add `rapport_brut` column to store raw technician dictation
    - Add `rapport_reformule` column to store AI-reformulated professional report
    - Add `rapport_valide_par_technicien` column to track manual validation
  
  2. Details
    - All fields are optional (nullable)
    - Text fields use `text` type for unlimited length
    - Validation flag defaults to false
*/

-- Add rapport brut (raw dictation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'rapport_brut'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN rapport_brut text;
  END IF;
END $$;

-- Add rapport reformulé (AI-reformulated)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'rapport_reformule'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN rapport_reformule text;
  END IF;
END $$;

-- Add validation flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'rapport_valide_par_technicien'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN rapport_valide_par_technicien boolean DEFAULT false;
  END IF;
END $$;