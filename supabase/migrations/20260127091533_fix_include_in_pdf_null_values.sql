/*
  # Corriger les valeurs NULL pour include_in_pdf

  1. Changements
    - Mettre à jour toutes les photos existantes avec include_in_pdf NULL à false
    - Ajouter la contrainte NOT NULL sur la colonne include_in_pdf
  
  2. Notes
    - Garantit que toutes les photos ont une valeur définie pour include_in_pdf
    - Évite les problèmes d'affichage dans l'interface
*/

-- Mettre à jour les photos existantes qui ont include_in_pdf à NULL
UPDATE intervention_photos 
SET include_in_pdf = false 
WHERE include_in_pdf IS NULL;

-- Ajouter la contrainte NOT NULL
ALTER TABLE intervention_photos 
ALTER COLUMN include_in_pdf SET NOT NULL;