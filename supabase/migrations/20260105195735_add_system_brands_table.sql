/*
  # Add system brands and models table

  1. New Tables
    - `system_brands`
      - `id` (uuid, primary key)
      - `brand_name` (text, unique) - Name of the system brand
      - `models` (text array) - Array of predefined models for this brand
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `system_brands` table
    - Add policy for authenticated users to read brands data
    - Add policy for admins to modify brands data
  
  3. Initial Data
    - Pre-populate table with provided brand-model mappings
*/

-- Create system_brands table
CREATE TABLE IF NOT EXISTS system_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text UNIQUE NOT NULL,
  models text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_brands ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read brands
CREATE POLICY "Authenticated users can read system brands"
  ON system_brands
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to insert/update/delete brands
CREATE POLICY "Admins can manage system brands"
  ON system_brands
  FOR ALL
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

-- Insert initial brand data
INSERT INTO system_brands (brand_name, models) VALUES
  ('Daitem', ARRAY['DP', 'Espace', 'eSens']),
  ('Bentel', ARRAY['Kyo8', 'Kyo32', 'Kyo320']),
  ('Risco', ARRAY['Agility', 'Lightsys+']),
  ('Septam', ARRAY['Harmonia']),
  ('Diagral', ARRAY[]::text[]),
  ('Aritech', ARRAY['Master', 'Advanced']),
  ('Delta Dore', ARRAY[]::text[]),
  ('Hager', ARRAY[]::text[]),
  ('Siemens', ARRAY[]::text[]),
  ('Acre', ARRAY[]::text[]),
  ('Honeywell', ARRAY['Galaxy Flex', 'Galaxy Dimension', 'MaxPro']),
  ('Fichet', ARRAY[]::text[]),
  ('DSC', ARRAY['Neo', 'Pro', 'Alexor']),
  ('Paradox', ARRAY[]::text[]),
  ('Visonic', ARRAY[]::text[]),
  ('Bosch', ARRAY[]::text[]),
  ('Elkron', ARRAY[]::text[]),
  ('Chubb', ARRAY[]::text[]),
  ('Somfy', ARRAY[]::text[]),
  ('Dahua', ARRAY[]::text[]),
  ('HIK', ARRAY[]::text[]),
  ('Hanwha', ARRAY[]::text[]),
  ('Axis', ARRAY[]::text[]),
  ('Uniview (UNV)', ARRAY[]::text[]),
  ('DEF', ARRAY[]::text[]),
  ('Finsecur', ARRAY[]::text[]),
  ('Eaton', ARRAY[]::text[]),
  ('Aviss', ARRAY[]::text[]),
  ('Nugelec', ARRAY[]::text[]),
  ('Ura', ARRAY[]::text[]),
  ('Neutronic', ARRAY[]::text[]),
  ('Legrand', ARRAY[]::text[])
ON CONFLICT (brand_name) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_system_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_brands_updated_at
  BEFORE UPDATE ON system_brands
  FOR EACH ROW
  EXECUTE FUNCTION update_system_brands_updated_at();