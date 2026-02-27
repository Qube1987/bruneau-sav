/*
  # Add description column to battery_products

  1. Changes
    - Add `description` column to `battery_products` table
      - This field will be used for the text sent to Extrabat in quotes
      - The existing `name` field will continue to be used for display in the battery selector
    - Set default value to match the name for existing products
    - Make the column nullable to allow gradual migration

  2. Notes
    - The `name` field remains unchanged and is used for UI display
    - The `description` field will be used in Extrabat quote generation
*/

-- Add description column to battery_products
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'battery_products' AND column_name = 'description'
  ) THEN
    ALTER TABLE battery_products ADD COLUMN description text;
    
    -- Initialize description with the name value for existing products
    UPDATE battery_products SET description = name WHERE description IS NULL;
  END IF;
END $$;
