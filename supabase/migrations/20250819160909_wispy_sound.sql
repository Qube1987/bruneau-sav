/*
  # SAV Management System Database Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `display_name` (text, optional)
      - `role` (text, check constraint for admin/manager/technicien)
      - `created_at` (timestamp)
    
    - `sav_requests`
      - `id` (uuid, primary key)
      - `client_name` (text, required)
      - `site` (text, optional)
      - `phone` (text, optional)
      - `address` (text, optional)
      - `city_derived` (text, extracted from address)
      - `system_type` (text, check constraint for system types)
      - `problem_desc` (text, required)
      - `observations` (text, optional)
      - `assigned_user_id` (uuid, foreign key to users)
      - `urgent` (boolean, default false)
      - `status` (text, check constraint for status values)
      - `requested_at` (timestamp, default now)
      - `resolved_at` (timestamp, optional)
      - `archived_at` (timestamp, optional)
      - `created_by` (uuid, foreign key to users)
      - `created_at` (timestamp, default now)
    
    - `sav_interventions`
      - `id` (uuid, primary key)
      - `sav_request_id` (uuid, foreign key to sav_requests)
      - `occurred_at` (timestamp, required)
      - `technician_id` (uuid, foreign key to users)
      - `notes` (text, optional)
      - `created_at` (timestamp, default now)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data
    - Allow all operations for now (can be restricted later)

  3. Sample Data
    - Create sample users with different roles
    - Add demo SAV requests for testing
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text,
  role text NOT NULL DEFAULT 'technicien' CHECK (role IN ('admin','manager','technicien')),
  created_at timestamptz DEFAULT now()
);

-- Create SAV requests table
CREATE TABLE IF NOT EXISTS sav_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  site text,
  phone text,
  address text,
  city_derived text,
  system_type text NOT NULL CHECK (system_type IN ('ssi','type4','intrusion','video','controle_acces','interphone','portail','autre')),
  problem_desc text NOT NULL,
  observations text,
  assigned_user_id uuid REFERENCES users(id),
  urgent boolean DEFAULT false,
  status text NOT NULL DEFAULT 'nouvelle' CHECK (status IN ('nouvelle','en_cours','terminee','archivee')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  archived_at timestamptz,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- Create interventions table
CREATE TABLE IF NOT EXISTS sav_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sav_request_id uuid NOT NULL REFERENCES sav_requests(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL,
  technician_id uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sav_requests_requested_at ON sav_requests (requested_at ASC);
CREATE INDEX IF NOT EXISTS idx_sav_requests_status ON sav_requests (status);
CREATE INDEX IF NOT EXISTS idx_sav_requests_urgent ON sav_requests (urgent DESC);
CREATE INDEX IF NOT EXISTS idx_sav_requests_city ON sav_requests (city_derived);
CREATE INDEX IF NOT EXISTS idx_sav_requests_assigned ON sav_requests (assigned_user_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sav_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sav_interventions ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - can be restricted later)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on sav_requests" ON sav_requests FOR ALL USING (true);
CREATE POLICY "Allow all operations on sav_interventions" ON sav_interventions FOR ALL USING (true);

-- Insert sample users
INSERT INTO users (email, display_name, role) VALUES
  ('admin@example.com', 'Admin User', 'admin'),
  ('manager@example.com', 'Manager User', 'manager'),
  ('tech1@example.com', 'Technicien 1', 'technicien'),
  ('tech2@example.com', 'Technicien 2', 'technicien')
ON CONFLICT (email) DO NOTHING;

-- Insert sample SAV requests
DO $$
DECLARE
  admin_id uuid;
  tech1_id uuid;
  tech2_id uuid;
BEGIN
  -- Get user IDs
  SELECT id INTO admin_id FROM users WHERE email = 'admin@example.com';
  SELECT id INTO tech1_id FROM users WHERE email = 'tech1@example.com';
  SELECT id INTO tech2_id FROM users WHERE email = 'tech2@example.com';

  -- Insert sample requests
  INSERT INTO sav_requests (
    client_name, site, phone, address, city_derived, system_type, 
    problem_desc, observations, assigned_user_id, urgent, status, 
    created_by, requested_at
  ) VALUES
  (
    'Copropriété Les Tilleuls', 
    'Bâtiment A', 
    '01 23 45 67 89', 
    '123 Rue de la Paix, 27200 Vernon', 
    'Vernon',
    'video', 
    'Caméra de surveillance défaillante dans le hall d''entrée. Plus d''image depuis ce matin.',
    'Client signale que le problème est apparu après une coupure électrique.',
    tech1_id,
    true,
    'nouvelle',
    admin_id,
    now() - interval '2 hours'
  ),
  (
    'Entreprise Martin & Fils', 
    'Entrepôt principal', 
    '01 34 56 78 90', 
    '456 Avenue du Commerce, 78000 Versailles', 
    'Versailles',
    'intrusion', 
    'Alarme intrusion se déclenche de manière intempestive la nuit.',
    'Problème récurrent depuis 3 jours. Détecteur de mouvement suspect.',
    tech2_id,
    false,
    'en_cours',
    admin_id,
    now() - interval '1 day'
  ),
  (
    'Résidence du Parc', 
    'Hall principal', 
    '01 45 67 89 01', 
    '789 Boulevard des Jardins, 92100 Boulogne-Billancourt', 
    'Boulogne-Billancourt',
    'interphone', 
    'Interphone ne fonctionne plus. Impossible d''ouvrir la porte depuis les appartements.',
    NULL,
    NULL,
    false,
    'nouvelle',
    admin_id,
    now() - interval '30 minutes'
  ),
  (
    'Lycée Jean Moulin', 
    'Bâtiment administratif', 
    '01 56 78 90 12', 
    '321 Rue de l''Education, 95000 Cergy', 
    'Cergy',
    'ssi', 
    'Système SSI en défaut. Voyant rouge allumé sur le tableau de signalisation.',
    'Urgent - établissement recevant du public. Intervention requise rapidement.',
    tech1_id,
    true,
    'nouvelle',
    admin_id,
    now() - interval '4 hours'
  );

  -- Insert sample interventions
  INSERT INTO sav_interventions (sav_request_id, occurred_at, technician_id, notes) 
  SELECT 
    sr.id,
    now() - interval '2 hours',
    tech2_id,
    'Diagnostic effectué. Détecteur de mouvement défaillant identifié. Pièce commandée.'
  FROM sav_requests sr 
  WHERE sr.client_name = 'Entreprise Martin & Fils';

END $$;