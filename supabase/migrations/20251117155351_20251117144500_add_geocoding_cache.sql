/*
  # Add Geocoding Cache and GPS Coordinates

  ## Overview
  This migration adds geocoding caching capabilities to improve map performance.

  ## Changes

  ### 1. New Table: `geocode_cache`
    - `address` (text, primary key) - The full address used as cache key
    - `latitude` (double precision) - GPS latitude coordinate
    - `longitude` (double precision) - GPS longitude coordinate
    - `display_name` (text) - Formatted address from geocoding service
    - `created_at` (timestamptz) - When the geocode was cached
    - `updated_at` (timestamptz) - Last time the cache was refreshed

  ### 2. Add GPS Columns to Existing Tables
    - Add `latitude` and `longitude` to `sav_requests`
    - Add `latitude` and `longitude` to `maintenance_contracts`

  ## Benefits
  - Dramatically faster map loading (no API calls for cached addresses)
  - Reduced API rate limiting issues
  - Persistent cache across sessions
  - Automatic geocoding when addresses are added/updated

  ## Security
  - Public read access for geocode_cache (maps need this data)
  - Authenticated users can insert/update cache entries
*/

-- Create geocode cache table
CREATE TABLE IF NOT EXISTS geocode_cache (
  address text PRIMARY KEY,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  display_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add GPS coordinates to sav_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN latitude double precision;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN longitude double precision;
  END IF;
END $$;

-- Add GPS coordinates to maintenance_contracts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_contracts' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE maintenance_contracts ADD COLUMN latitude double precision;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_contracts' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE maintenance_contracts ADD COLUMN longitude double precision;
  END IF;
END $$;

-- Enable RLS on geocode_cache
ALTER TABLE geocode_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access (needed for maps)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'geocode_cache' AND policyname = 'Anyone can read geocode cache'
  ) THEN
    CREATE POLICY "Anyone can read geocode cache"
      ON geocode_cache
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Allow authenticated users to insert and update cache
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'geocode_cache' AND policyname = 'Authenticated users can insert geocode cache'
  ) THEN
    CREATE POLICY "Authenticated users can insert geocode cache"
      ON geocode_cache
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'geocode_cache' AND policyname = 'Authenticated users can update geocode cache'
  ) THEN
    CREATE POLICY "Authenticated users can update geocode cache"
      ON geocode_cache
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_geocode_cache_address ON geocode_cache(address);

-- Create indexes on GPS coordinates for spatial queries (future use)
CREATE INDEX IF NOT EXISTS idx_sav_requests_location ON sav_requests(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_location ON maintenance_contracts(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
