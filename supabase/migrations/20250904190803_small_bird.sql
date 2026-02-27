/*
  # Create maintenance system tables

  1. New Tables
    - `maintenance_contracts`
      - `id` (uuid, primary key)
      - `client_name` (text, required)
      - `site` (text, optional)
      - `phone` (text, optional)
      - `address` (text, optional)
      - `city_derived` (text, auto-extracted from address)
      - `system_type` (text, required - ssi, type4, intrusion, video, controle_acces, interphone, portail, autre)
      - `battery_installation_year` (integer, required)
      - `observations` (text, optional)
      - `assigned_user_id` (uuid, foreign key to users)
      - `priority` (boolean, default false)
      - `status` (text, default 'a_realiser' - a_realiser, prevue, realisee)
      - `extrabat_client_id` (integer, optional)
      - `extrabat_ouvrage_id` (integer, optional)
      - `created_by` (uuid, foreign key to users)
      - `created_at` (timestamp)

    - `maintenance_interventions`
      - `id` (uuid, primary key)
      - `contract_id` (uuid, foreign key to maintenance_contracts)
      - `scheduled_at` (timestamp, optional)
      - `completed_at` (timestamp, optional)
      - `technician_id` (uuid, foreign key to users)
      - `notes` (text, optional)
      - `status` (text, default 'prevue' - prevue, realisee)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage maintenance data

  3. Indexes
    - Add indexes for common query patterns (status, priority, assigned user, city)
*/

-- Create maintenance_contracts table
CREATE TABLE IF NOT EXISTS maintenance_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  site text,
  phone text,
  address text,
  city_derived text,
  system_type text NOT NULL DEFAULT 'autre' CHECK (system_type IN ('ssi','type4','intrusion','video','controle_acces','interphone','portail','autre')),
  battery_installation_year integer NOT NULL,
  observations text,
  assigned_user_id uuid REFERENCES users(id),
  priority boolean DEFAULT false,
  status text NOT NULL DEFAULT 'a_realiser' CHECK (status IN ('a_realiser','prevue','realisee')),
  extrabat_client_id integer,
  extrabat_ouvrage_id integer,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Create maintenance_interventions table
CREATE TABLE IF NOT EXISTS maintenance_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES maintenance_contracts(id) ON DELETE CASCADE,
  scheduled_at timestamptz,
  completed_at timestamptz,
  technician_id uuid REFERENCES users(id),
  notes text,
  status text NOT NULL DEFAULT 'prevue' CHECK (status IN ('prevue','realisee')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE maintenance_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_interventions ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - you can restrict later)
CREATE POLICY "Allow all operations on maintenance_contracts" 
  ON maintenance_contracts 
  FOR ALL 
  USING (true);

CREATE POLICY "Allow all operations on maintenance_interventions" 
  ON maintenance_interventions 
  FOR ALL 
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_status ON maintenance_contracts(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_priority ON maintenance_contracts(priority DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_assigned ON maintenance_contracts(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_city ON maintenance_contracts(city_derived);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_created_at ON maintenance_contracts(created_at);

CREATE INDEX IF NOT EXISTS idx_maintenance_interventions_contract ON maintenance_interventions(contract_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_interventions_status ON maintenance_interventions(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_interventions_scheduled ON maintenance_interventions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_interventions_technician ON maintenance_interventions(technician_id);