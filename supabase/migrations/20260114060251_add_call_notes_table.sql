/*
  # Create call_notes table for quick phone call reminders
  
  1. New Tables
    - `call_notes`
      - `id` (uuid, primary key) - Unique identifier
      - `client_name` (text, nullable) - Quick entry client name
      - `client_phone` (text, nullable) - Quick entry phone number
      - `sav_request_id` (uuid, nullable, foreign key) - Link to SAV request if searched
      - `maintenance_contract_id` (uuid, nullable, foreign key) - Link to maintenance contract if searched
      - `call_subject` (text, nullable) - Subject/reason for call
      - `notes` (text, nullable) - Additional notes
      - `is_completed` (boolean, default false) - Mark as done
      - `priority` (text, default 'normal') - Priority level (low, normal, high, urgent)
      - `created_by` (uuid, foreign key) - User who created the note
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      
  2. Security
    - Enable RLS on `call_notes` table
    - Add policy for authenticated users to manage their own notes
    - Add policy for authenticated users to view all notes (team collaboration)
*/

-- Create call_notes table
CREATE TABLE IF NOT EXISTS call_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text,
  client_phone text,
  sav_request_id uuid REFERENCES sav_requests(id) ON DELETE SET NULL,
  maintenance_contract_id uuid REFERENCES maintenance_contracts(id) ON DELETE SET NULL,
  call_subject text,
  notes text,
  is_completed boolean DEFAULT false,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE call_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all call notes"
  ON call_notes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own call notes"
  ON call_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own call notes"
  ON call_notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own call notes"
  ON call_notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_call_notes_created_by ON call_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_call_notes_is_completed ON call_notes(is_completed);
CREATE INDEX IF NOT EXISTS idx_call_notes_created_at ON call_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_notes_sav_request_id ON call_notes(sav_request_id);
CREATE INDEX IF NOT EXISTS idx_call_notes_maintenance_contract_id ON call_notes(maintenance_contract_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_call_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS call_notes_updated_at ON call_notes;
CREATE TRIGGER call_notes_updated_at
  BEFORE UPDATE ON call_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_call_notes_updated_at();