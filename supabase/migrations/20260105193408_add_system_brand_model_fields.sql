/*
  # Add System Brand and Model Fields

  1. New Tables
    - `custom_brands`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Custom brand name
      - `created_at` (timestamptz)

  2. Changes to existing tables
    - Add `system_brand` (text) to `sav_requests` table
    - Add `system_model` (text) to `sav_requests` table
    - Add `system_brand` (text) to `maintenance_contracts` table
    - Add `system_model` (text) to `maintenance_contracts` table

  3. Security
    - Enable RLS on `custom_brands` table
    - Add policies for authenticated users to read and insert custom brands

  4. Notes
    - Fields are optional (nullable)
    - Custom brands are stored separately and can be reused
    - System info can be pre-filled from previous requests for same client/site
*/

-- Create custom_brands table for user-added brands
CREATE TABLE IF NOT EXISTS custom_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add system_brand and system_model to sav_requests table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'system_brand'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN system_brand text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'system_model'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN system_model text;
  END IF;
END $$;

-- Add system_brand and system_model to maintenance_contracts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_contracts' AND column_name = 'system_brand'
  ) THEN
    ALTER TABLE maintenance_contracts ADD COLUMN system_brand text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_contracts' AND column_name = 'system_model'
  ) THEN
    ALTER TABLE maintenance_contracts ADD COLUMN system_model text;
  END IF;
END $$;

-- Enable RLS on custom_brands
ALTER TABLE custom_brands ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read custom brands
CREATE POLICY "Authenticated users can view custom brands"
  ON custom_brands
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy for authenticated users to insert custom brands
CREATE POLICY "Authenticated users can create custom brands"
  ON custom_brands
  FOR INSERT
  TO authenticated
  WITH CHECK (true);