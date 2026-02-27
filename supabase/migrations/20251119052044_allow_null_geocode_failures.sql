/*
  # Autoriser les valeurs NULL dans geocode_cache pour les échecs de géocodage
  
  Cette migration permet de stocker les échecs de géocodage dans le cache
  afin d'éviter de réessayer indéfiniment de géocoder des adresses invalides.
  
  1. Changements
    - Modifier les colonnes latitude et longitude pour accepter NULL
    - Les valeurs NULL indiqueront qu'une tentative de géocodage a échoué
*/

-- Permettre les valeurs NULL pour latitude et longitude
ALTER TABLE geocode_cache 
  ALTER COLUMN latitude DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL;
