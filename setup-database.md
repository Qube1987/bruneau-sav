# Database Setup Instructions

The application is trying to access tables that don't exist in your Supabase database yet. Follow these steps to set up the database:

## Step 1: Connect to Supabase
1. Click the "Connect to Supabase" button in the top right of the application
2. Follow the setup process to connect your Supabase project

## Step 2: Create the Database Tables
1. Go to your Supabase dashboard (https://supabase.com/dashboard)
2. Navigate to your project
3. Go to the "SQL Editor" section
4. Copy and paste the SQL from `supabase/migrations/create_sav_system.sql`
5. Click "Run" to execute the SQL

## Step 3: Verify Tables
After running the SQL, verify that these tables were created:
- `users`
- `sav_requests` 
- `sav_interventions`

You can check this in the "Database" > "Tables" section of your Supabase dashboard.

## Step 4: Test the Application
Once the tables are created, refresh your application and it should work properly.

## Alternative: Quick Setup SQL
If you prefer, you can run this simplified SQL directly in the Supabase SQL Editor:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  display_name text,
  phone text,
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
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id),
  extrabat_client_id integer,
  extrabat_ouvrage_id integer,
  billing_status text NOT NULL DEFAULT 'to_bill' CHECK (billing_status IN ('to_bill','billed')),
  billed_at timestamptz
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

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sav_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sav_interventions ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - you can restrict later)
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all operations on sav_requests" ON sav_requests FOR ALL USING (true);
CREATE POLICY "Allow all operations on sav_interventions" ON sav_interventions FOR ALL USING (true);

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Create explicit policies for announcements
CREATE POLICY "Allow select on announcements" ON announcements FOR SELECT USING (true);
CREATE POLICY "Allow insert on announcements" ON announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update on announcements" ON announcements FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete on announcements" ON announcements FOR DELETE USING (true);

-- Insert sample data
INSERT INTO users (email, display_name, role) VALUES
  ('admin@example.com', 'Admin User', 'admin'),
  ('manager@example.com', 'Manager User', 'manager'),
  ('tech1@example.com', 'Technicien 1', 'technicien'),
  ('tech2@example.com', 'Technicien 2', 'technicien')
ON CONFLICT (email) DO NOTHING;
```