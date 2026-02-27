/*
  # Corriger la configuration du storage pour les photos d'intervention

  1. Changements
    - Rendre le bucket 'intervention-photos' public pour permettre l'accès aux URLs publiques
    - Ajouter les storage policies pour permettre l'upload, la lecture et la suppression
    - Supprimer toutes les limites de taille de fichier
  
  2. Storage Policies
    - SELECT : Tous les utilisateurs authentifiés peuvent voir les photos
    - INSERT : Tous les utilisateurs authentifiés peuvent uploader des photos
    - DELETE : Tous les utilisateurs authentifiés peuvent supprimer des photos
  
  3. Notes importantes
    - Les smartphones modernes génèrent des photos très volumineuses (10-20 MB)
    - Pas de limite de taille imposée côté base de données
*/

-- Rendre le bucket public pour permettre les URLs publiques
UPDATE storage.buckets
SET public = true
WHERE id = 'intervention-photos';

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Authenticated users can view photos in storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos to storage" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos from storage" ON storage.objects;

-- Policy de lecture : Tous les utilisateurs authentifiés peuvent voir les photos
CREATE POLICY "Authenticated users can view photos in storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'intervention-photos');

-- Policy d'upload : Tous les utilisateurs authentifiés peuvent uploader
CREATE POLICY "Authenticated users can upload photos to storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'intervention-photos' 
    AND (storage.foldername(name))[1] IN ('sav', 'maintenance', 'temp')
  );

-- Policy de suppression : Tous les utilisateurs authentifiés peuvent supprimer
CREATE POLICY "Authenticated users can delete photos from storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'intervention-photos');