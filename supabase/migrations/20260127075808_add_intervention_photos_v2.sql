/*
  # Ajouter la gestion des photos d'intervention

  1. Nouvelles tables
    - `intervention_photos`
      - `id` (uuid, primary key)
      - `intervention_id` (uuid, référence vers sav_interventions ou maintenance_interventions)
      - `intervention_type` (text, 'sav' ou 'maintenance')
      - `file_path` (text) - Chemin dans Supabase Storage
      - `file_name` (text) - Nom original du fichier
      - `file_size` (integer) - Taille en bytes
      - `mime_type` (text) - Type MIME (image/jpeg, image/png, etc.)
      - `uploaded_by` (uuid, référence vers auth.users)
      - `created_at` (timestamptz)
  
  2. Storage
    - Créer un bucket 'intervention-photos' pour stocker les images
  
  3. Security
    - Enable RLS sur intervention_photos
    - Politique de lecture : Tous les utilisateurs authentifiés peuvent voir les photos
    - Politique d'insertion : Tous les utilisateurs authentifiés peuvent ajouter des photos
    - Politique de suppression : Tous les utilisateurs authentifiés peuvent supprimer des photos
  
  4. Notes importantes
    - Les photos sont stockées dans Supabase Storage
    - Format du path : {intervention_type}/{intervention_id}/{timestamp}_{filename}
    - Les storage policies doivent être configurées manuellement via l'interface Supabase
*/

-- Créer la table intervention_photos
CREATE TABLE IF NOT EXISTS intervention_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid NOT NULL,
  intervention_type text NOT NULL CHECK (intervention_type IN ('sav', 'maintenance')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE intervention_photos ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : Tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can view photos"
  ON intervention_photos FOR SELECT
  TO authenticated
  USING (true);

-- Politique d'insertion : Tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload photos"
  ON intervention_photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Politique de suppression : Tous les utilisateurs authentifiés peuvent supprimer
CREATE POLICY "Authenticated users can delete photos"
  ON intervention_photos FOR DELETE
  TO authenticated
  USING (true);

-- Créer un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_intervention_photos_intervention 
  ON intervention_photos(intervention_id, intervention_type);

-- Créer le bucket de storage (note: ceci peut échouer si le bucket existe déjà, c'est normal)
INSERT INTO storage.buckets (id, name, public)
VALUES ('intervention-photos', 'intervention-photos', false)
ON CONFLICT (id) DO NOTHING;