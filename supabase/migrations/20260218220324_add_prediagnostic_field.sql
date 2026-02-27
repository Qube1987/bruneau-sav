/*
  # Ajout du champ prediagnostic à la table sav_requests

  1. Modifications
    - Ajout du champ `prediagnostic` (type text, nullable) à la table `sav_requests`
    - Ce champ stockera le résultat de l'analyse IA pré-diagnostic
  
  2. Notes
    - Le champ est nullable car le pré-diagnostic est optionnel
    - Le contenu sera structuré avec le diagnostic, les étapes de vérification et les codes utiles
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'prediagnostic'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN prediagnostic text;
  END IF;
END $$;
