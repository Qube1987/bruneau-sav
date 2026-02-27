/*
  # Allow users to add system brands

  1. Changes
    - Drop the restrictive admin-only policy
    - Add separate policies for INSERT, UPDATE, and DELETE
    - Allow all authenticated users to insert new brands
    - Only admins can update or delete brands

  2. Security
    - All authenticated users can read brands (existing policy)
    - All authenticated users can insert new brands
    - Only admins can update existing brands
    - Only admins can delete brands
*/

-- Drop the existing admin-only policy
DROP POLICY IF EXISTS "Admins can manage system brands" ON system_brands;

-- Allow all authenticated users to insert new brands
CREATE POLICY "Authenticated users can insert system brands"
  ON system_brands
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can update brands
CREATE POLICY "Admins can update system brands"
  ON system_brands
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Only admins can delete brands
CREATE POLICY "Admins can delete system brands"
  ON system_brands
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );