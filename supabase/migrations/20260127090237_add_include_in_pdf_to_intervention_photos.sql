/*
  # Ajouter la sélection des photos pour le PDF

  1. Changements
    - Ajouter la colonne `include_in_pdf` à la table intervention_photos
    - Par défaut, les photos ne sont pas incluses dans le PDF (false)
    - L'utilisateur pourra cocher les photos à inclure dans le rapport PDF
  
  2. Notes
    - Permet de contrôler quelles photos apparaissent dans le document client
    - Utile pour exclure les photos non pertinentes ou de mauvaise qualité
*/

-- Ajouter la colonne include_in_pdf
ALTER TABLE intervention_photos 
ADD COLUMN IF NOT EXISTS include_in_pdf boolean DEFAULT false;

-- Créer un index pour faciliter la recherche des photos à inclure dans le PDF
CREATE INDEX IF NOT EXISTS idx_intervention_photos_include_pdf 
  ON intervention_photos(intervention_id, intervention_type, include_in_pdf) 
  WHERE include_in_pdf = true;