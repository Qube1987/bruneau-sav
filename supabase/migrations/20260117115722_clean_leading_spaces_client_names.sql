/*
  # Clean Leading Spaces from Client Names

  1. Changes
    - Remove leading spaces from `client_name` in `sav_requests` table
    - Remove leading spaces from `client_name` in `maintenance_contracts` table
  
  2. Details
    - Uses LTRIM() function to remove leading whitespace
    - Only updates records where client_name has leading spaces
    - Preserves all other data integrity
*/

-- Clean leading spaces from sav_requests
UPDATE sav_requests
SET client_name = LTRIM(client_name)
WHERE client_name != LTRIM(client_name);

-- Clean leading spaces from maintenance_contracts
UPDATE maintenance_contracts
SET client_name = LTRIM(client_name)
WHERE client_name != LTRIM(client_name);
