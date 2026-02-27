/*
  # Add Support for Multiple Technicians per Intervention

  1. New Tables
    - `sav_intervention_technicians`
      - Junction table linking interventions to multiple technicians
      - `id` (uuid, primary key)
      - `sav_intervention_id` (uuid, foreign key to sav_interventions)
      - `technician_id` (uuid, foreign key to users)
      - `created_at` (timestamp)
    
    - `maintenance_intervention_technicians`
      - Junction table linking maintenance interventions to multiple technicians
      - `id` (uuid, primary key)
      - `maintenance_intervention_id` (uuid, foreign key to maintenance_interventions)
      - `technician_id` (uuid, foreign key to users)
      - `created_at` (timestamp)

  2. Changes
    - Keep existing `technician_id` columns for backward compatibility
    - Add indexes for performance
    - Set up RLS policies for secure access

  3. Security
    - Enable RLS on both new tables
    - Add policies for authenticated users to manage their intervention assignments
*/

-- Create sav_intervention_technicians table
CREATE TABLE IF NOT EXISTS sav_intervention_technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sav_intervention_id uuid NOT NULL REFERENCES sav_interventions(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(sav_intervention_id, technician_id)
);

-- Create maintenance_intervention_technicians table
CREATE TABLE IF NOT EXISTS maintenance_intervention_technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_intervention_id uuid NOT NULL REFERENCES maintenance_interventions(id) ON DELETE CASCADE,
  technician_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(maintenance_intervention_id, technician_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sav_intervention_technicians_intervention 
  ON sav_intervention_technicians(sav_intervention_id);

CREATE INDEX IF NOT EXISTS idx_sav_intervention_technicians_technician 
  ON sav_intervention_technicians(technician_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_intervention_technicians_intervention 
  ON maintenance_intervention_technicians(maintenance_intervention_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_intervention_technicians_technician 
  ON maintenance_intervention_technicians(technician_id);

-- Enable RLS
ALTER TABLE sav_intervention_technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_intervention_technicians ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sav_intervention_technicians
CREATE POLICY "Users can view intervention technician assignments"
  ON sav_intervention_technicians FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert intervention technician assignments"
  ON sav_intervention_technicians FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete intervention technician assignments"
  ON sav_intervention_technicians FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for maintenance_intervention_technicians
CREATE POLICY "Users can view maintenance intervention technician assignments"
  ON maintenance_intervention_technicians FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert maintenance intervention technician assignments"
  ON maintenance_intervention_technicians FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete maintenance intervention technician assignments"
  ON maintenance_intervention_technicians FOR DELETE
  TO authenticated
  USING (true);