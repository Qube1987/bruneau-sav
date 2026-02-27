/*
  # Synchroniser les coordonnées du cache vers les tables principales
  
  Cette migration copie les coordonnées depuis geocode_cache vers les tables
  sav_requests et maintenance_contracts pour tous les enregistrements qui ont
  une adresse correspondante dans le cache mais pas de coordonnées dans la table.
*/

-- Mettre à jour les coordonnées de sav_requests depuis le cache
UPDATE sav_requests sr
SET 
  latitude = gc.latitude,
  longitude = gc.longitude
FROM geocode_cache gc
WHERE 
  sr.address = gc.address
  AND (sr.latitude IS NULL OR sr.longitude IS NULL)
  AND gc.latitude IS NOT NULL
  AND gc.longitude IS NOT NULL;

-- Mettre à jour les coordonnées de maintenance_contracts depuis le cache
UPDATE maintenance_contracts mc
SET 
  latitude = gc.latitude,
  longitude = gc.longitude
FROM geocode_cache gc
WHERE 
  mc.address = gc.address
  AND (mc.latitude IS NULL OR mc.longitude IS NULL)
  AND gc.latitude IS NOT NULL
  AND gc.longitude IS NOT NULL;
