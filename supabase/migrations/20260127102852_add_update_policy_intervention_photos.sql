/*
  # Add UPDATE policy for intervention_photos

  1. Changes
    - Add UPDATE policy to allow authenticated users to update photo metadata (e.g., include_in_pdf flag)
  
  2. Security
    - Authenticated users can update all intervention photos
    - This allows users to toggle the include_in_pdf flag and other metadata
*/

CREATE POLICY "Authenticated users can update photos"
  ON intervention_photos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
