/*
  # Add problem_desc_reformule field
  
  1. Changes
    - Add `problem_desc_reformule` column to `sav_requests` table
      - Stores the AI-reformulated version of problem_desc
      - Optional field (nullable)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'problem_desc_reformule'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN problem_desc_reformule text;
  END IF;
END $$;