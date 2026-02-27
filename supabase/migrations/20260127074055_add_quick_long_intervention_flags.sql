/*
  # Ajouter les indicateurs d'intervention rapide et longue

  1. Modifications
    - Ajouter le champ `is_quick_intervention` (boolean, default false) à `sav_requests`
    - Ajouter le champ `is_long_intervention` (boolean, default false) à `sav_requests`
  
  2. Description
    - `is_quick_intervention` : Marque une intervention comme rapide (pictogramme éclair)
    - `is_long_intervention` : Marque une intervention comme potentiellement longue (pictogramme horloge)
    - Ces champs sont purement informatifs et n'influencent pas le classement (contrairement à `priority`)
    - Les deux champs peuvent être utilisés indépendamment
  
  3. Notes importantes
    - Ces indicateurs sont visuels uniquement
    - Pas d'index nécessaire car pas utilisés pour le tri
    - Pas de contrainte d'exclusivité (une intervention peut être à la fois rapide ET longue si besoin)
*/

-- Ajouter is_quick_intervention à sav_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'is_quick_intervention'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN is_quick_intervention boolean DEFAULT false;
  END IF;
END $$;

-- Ajouter is_long_intervention à sav_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'is_long_intervention'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN is_long_intervention boolean DEFAULT false;
  END IF;
END $$;