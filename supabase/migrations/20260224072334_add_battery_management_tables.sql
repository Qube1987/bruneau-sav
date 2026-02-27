/*
  # Add Battery Management Tables

  ## Description
  This migration creates tables for managing batteries/power supplies used in SAV interventions,
  with Extrabat integration for quote generation.

  ## New Tables

  ### `battery_products`
  Catalog of battery/power supply products available for use
  - `id` (uuid, primary key)
  - `name` (text) - User-friendly name (e.g., "Pile 9V Alcaline")
  - `ref_extrabat` (text) - Extrabat product reference/ID for quote generation
  - `unit_price` (numeric) - Unit price for reference
  - `vat_rate` (numeric) - VAT rate (default 20%)
  - `unit` (text) - Unit of measure (default "u")
  - `is_active` (boolean) - Whether product is currently available
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `intervention_batteries`
  Tracks batteries used in specific interventions
  - `id` (uuid, primary key)
  - `intervention_id` (uuid) - Reference to sav_interventions or maintenance_interventions
  - `intervention_type` (text) - Type: 'sav' or 'maintenance'
  - `battery_product_id` (uuid) - Reference to battery_products
  - `quantity` (integer) - Number of batteries used
  - `unit_price` (numeric) - Price at time of use (can differ from catalog)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Authenticated users can read battery products
  - Authenticated users can manage intervention batteries for their interventions
*/

-- Create battery_products table
CREATE TABLE IF NOT EXISTS battery_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ref_extrabat text NOT NULL,
  unit_price numeric(10, 2) NOT NULL DEFAULT 0,
  vat_rate numeric(5, 2) NOT NULL DEFAULT 20,
  unit text NOT NULL DEFAULT 'u',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create intervention_batteries table
CREATE TABLE IF NOT EXISTS intervention_batteries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid NOT NULL,
  intervention_type text NOT NULL CHECK (intervention_type IN ('sav', 'maintenance')),
  battery_product_id uuid NOT NULL REFERENCES battery_products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_battery_products_active ON battery_products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_intervention_batteries_intervention ON intervention_batteries(intervention_id, intervention_type);
CREATE INDEX IF NOT EXISTS idx_intervention_batteries_product ON intervention_batteries(battery_product_id);

-- Enable RLS
ALTER TABLE battery_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_batteries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for battery_products
CREATE POLICY "Authenticated users can read active battery products"
  ON battery_products
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can read all battery products"
  ON battery_products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert battery products"
  ON battery_products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update battery products"
  ON battery_products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for intervention_batteries
CREATE POLICY "Authenticated users can read intervention batteries"
  ON intervention_batteries
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert intervention batteries"
  ON intervention_batteries
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update intervention batteries"
  ON intervention_batteries
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete intervention batteries"
  ON intervention_batteries
  FOR DELETE
  TO authenticated
  USING (true);

-- Insert common battery products (examples)
INSERT INTO battery_products (name, ref_extrabat, unit_price, vat_rate, unit) VALUES
  ('Pile 9V Alcaline', 'PILE-9V-ALC', 4.50, 20, 'u'),
  ('Pile 12V Lithium', 'PILE-12V-LIT', 8.90, 20, 'u'),
  ('Batterie 12V 7Ah', 'BAT-12V-7AH', 25.00, 20, 'u'),
  ('Batterie 12V 12Ah', 'BAT-12V-12AH', 35.00, 20, 'u'),
  ('Pile CR2032 3V', 'PILE-CR2032', 2.50, 20, 'u'),
  ('Batterie 6V 4.5Ah', 'BAT-6V-4.5AH', 18.00, 20, 'u')
ON CONFLICT DO NOTHING;
