/*
  # Fix battery installation year to allow null values

  1. Changes
    - Make battery_installation_year column nullable in maintenance_contracts table
    - This allows the field to be truly optional as intended in the UI

  2. Security
    - No changes to RLS policies needed
*/

-- Make battery_installation_year nullable
ALTER TABLE maintenance_contracts 
ALTER COLUMN battery_installation_year DROP NOT NULL;