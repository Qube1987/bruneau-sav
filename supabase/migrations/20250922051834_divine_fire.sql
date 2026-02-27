/*
  # Create announcements table for admin messages

  1. New Tables
    - `announcements`
      - `id` (uuid, primary key)
      - `message` (text, the announcement message)
      - `created_by` (uuid, foreign key to users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `active` (boolean, whether the announcement is active)

  2. Security
    - Enable RLS on `announcements` table
    - Add policy for all users to read active announcements
    - Add policy for admin users to manage announcements
*/

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read active announcements
CREATE POLICY "Users can read active announcements"
  ON announcements
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Allow admin users to manage announcements
CREATE POLICY "Admins can manage announcements"
  ON announcements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(active);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);