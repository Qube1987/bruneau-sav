/*
  # Synchronisation automatique des coordonnées depuis le cache
  
  1. Fonction
    - Crée une fonction qui synchronise automatiquement les coordonnées
    - Depuis geocode_cache vers maintenance_contracts et sav_requests
    
  2. Trigger
    - S'active lors de l'insertion ou mise à jour dans geocode_cache
    - Met à jour automatiquement les coordonnées dans les tables liées
    
  3. Notes
    - Synchronise uniquement si les coordonnées ne sont pas nulles
    - Évite les mises à jour inutiles
    - Améliore la performance en évitant les synchronisations manuelles
*/

-- Fonction de synchronisation automatique
CREATE OR REPLACE FUNCTION sync_coordinates_from_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour les contrats de maintenance si l'adresse correspond
  UPDATE maintenance_contracts
  SET 
    latitude = NEW.latitude,
    longitude = NEW.longitude
  WHERE 
    address = NEW.address
    AND NEW.latitude IS NOT NULL
    AND NEW.longitude IS NOT NULL;
  
  -- Mettre à jour les demandes SAV si l'adresse correspond
  UPDATE sav_requests
  SET 
    latitude = NEW.latitude,
    longitude = NEW.longitude
  WHERE 
    address = NEW.address
    AND NEW.latitude IS NOT NULL
    AND NEW.longitude IS NOT NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur geocode_cache
DROP TRIGGER IF EXISTS sync_coordinates_trigger ON geocode_cache;

CREATE TRIGGER sync_coordinates_trigger
AFTER INSERT OR UPDATE ON geocode_cache
FOR EACH ROW
WHEN (NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL)
EXECUTE FUNCTION sync_coordinates_from_cache();
