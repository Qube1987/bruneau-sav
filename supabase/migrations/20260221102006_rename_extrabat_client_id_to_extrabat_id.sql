/*
  # Harmonisation du champ ID client Extrabat

  1. Modifications
    - Renommer `extrabat_client_id` en `extrabat_id` dans la table `sav_requests`
    - Renommer `extrabat_client_id` en `extrabat_id` dans la table `maintenance_contracts`
  
  2. Objectif
    - Standardiser le nom du champ d'identification client Extrabat à travers toute l'application
    - Le champ `extrabat_id` (integer) sera désormais le nom unifié pour l'ID client Extrabat
  
  3. Notes importantes
    - Les champs `extrabat_ouvrage_id` restent inchangés (ils identifient un ouvrage, pas un client)
    - Les champs `extrabat_intervention_id` restent inchangés (ils identifient une intervention)
    - Cette migration est non-destructive et préserve toutes les données existantes
*/

-- Renommer extrabat_client_id en extrabat_id dans sav_requests
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'sav_requests'
    AND column_name = 'extrabat_client_id'
  ) THEN
    ALTER TABLE sav_requests RENAME COLUMN extrabat_client_id TO extrabat_id;
  END IF;
END $$;

-- Renommer extrabat_client_id en extrabat_id dans maintenance_contracts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'maintenance_contracts'
    AND column_name = 'extrabat_client_id'
  ) THEN
    ALTER TABLE maintenance_contracts RENAME COLUMN extrabat_client_id TO extrabat_id;
  END IF;
END $$;