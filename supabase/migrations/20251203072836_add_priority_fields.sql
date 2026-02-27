/*
  # Ajouter le champ priorité aux tables SAV et Maintenance
  
  1. Modifications
    - Ajouter le champ `priority` (boolean, default false) à `sav_requests`
    - Ajouter le champ `priority` (boolean, default false) à `maintenance_contracts`
    
  2. Description
    - Le champ `priority` permet de marquer certains dépannages/contrats comme prioritaires
    - Les éléments prioritaires seront affichés en rouge foncé et en tête de liste
    - Par défaut, tous les éléments sont non prioritaires (false)
    
  3. Notes
    - Utilise IF NOT EXISTS pour éviter les erreurs si la colonne existe déjà
    - Valeur par défaut: false
*/

-- Ajouter le champ priority à sav_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_requests' AND column_name = 'priority'
  ) THEN
    ALTER TABLE sav_requests ADD COLUMN priority boolean DEFAULT false;
  END IF;
END $$;

-- Ajouter le champ priority à maintenance_contracts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maintenance_contracts' AND column_name = 'priority'
  ) THEN
    ALTER TABLE maintenance_contracts ADD COLUMN priority boolean DEFAULT false;
  END IF;
END $$;

-- Créer un index pour améliorer les performances de tri
CREATE INDEX IF NOT EXISTS idx_sav_requests_priority ON sav_requests(priority DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_contracts_priority ON maintenance_contracts(priority DESC);
