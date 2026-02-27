# Guide d'Intégration - Gestion des Photos avec Supabase

Ce guide explique comment implémenter une fonctionnalité complète de gestion de photos (upload, stockage, affichage, suppression) en utilisant Supabase Storage et une base de données PostgreSQL.

## Table des matières

1. [Configuration de la base de données](#1-configuration-de-la-base-de-données)
2. [Configuration du Storage Supabase](#2-configuration-du-storage-supabase)
3. [Composant d'upload de photos](#3-composant-dupload-de-photos)
4. [Composant d'affichage des photos](#4-composant-daffichage-des-photos)
5. [Hook personnalisé pour la gestion des photos](#5-hook-personnalisé-pour-la-gestion-des-photos)
6. [Intégration dans votre application](#6-intégration-dans-votre-application)

---

## 1. Configuration de la base de données

### 1.1 Créer la table des photos

Créez une migration Supabase avec le SQL suivant :

```sql
/*
  # Ajout de la table pour les photos d'intervention

  1. Nouvelle table
    - `intervention_photos`
      - `id` (uuid, primary key)
      - `intervention_id` (uuid, foreign key vers votre table principale)
      - `url` (text, URL publique de la photo)
      - `storage_path` (text, chemin dans Supabase Storage)
      - `file_name` (text, nom du fichier)
      - `file_size` (bigint, taille en octets)
      - `mime_type` (text, type MIME)
      - `uploaded_at` (timestamptz, date d'upload)
      - `uploaded_by` (uuid, référence à auth.users)

  2. Sécurité
    - Enable RLS sur `intervention_photos`
    - Policies pour SELECT, INSERT, UPDATE, DELETE
*/

-- Créer la table
CREATE TABLE IF NOT EXISTS intervention_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid NOT NULL REFERENCES sav_interventions(id) ON DELETE CASCADE,
  url text,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id)
);

-- Activer Row Level Security
ALTER TABLE intervention_photos ENABLE ROW LEVEL SECURITY;

-- Policy SELECT : les utilisateurs authentifiés peuvent voir les photos
CREATE POLICY "Users can view intervention photos"
  ON intervention_photos
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy INSERT : les utilisateurs authentifiés peuvent ajouter des photos
CREATE POLICY "Users can upload intervention photos"
  ON intervention_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Policy UPDATE : les utilisateurs peuvent modifier leurs propres photos
CREATE POLICY "Users can update their own photos"
  ON intervention_photos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by)
  WITH CHECK (auth.uid() = uploaded_by);

-- Policy DELETE : les utilisateurs peuvent supprimer leurs propres photos
CREATE POLICY "Users can delete their own photos"
  ON intervention_photos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_intervention_photos_intervention_id
  ON intervention_photos(intervention_id);

CREATE INDEX IF NOT EXISTS idx_intervention_photos_uploaded_by
  ON intervention_photos(uploaded_by);
```

### 1.2 Ajouter le champ `include_in_pdf` (optionnel)

Si vous voulez permettre la sélection des photos pour inclusion dans des rapports :

```sql
-- Ajouter le champ include_in_pdf
ALTER TABLE intervention_photos
ADD COLUMN IF NOT EXISTS include_in_pdf boolean DEFAULT false;

-- Mettre à jour les valeurs NULL existantes
UPDATE intervention_photos
SET include_in_pdf = false
WHERE include_in_pdf IS NULL;
```

---

## 2. Configuration du Storage Supabase

### 2.1 Créer le bucket de stockage

Créez une migration pour configurer le storage :

```sql
/*
  # Configuration du Storage pour les photos

  1. Bucket
    - Créer le bucket `intervention-photos`
    - Configuration : public, taille max 10MB

  2. Policies
    - SELECT : tout le monde peut voir (photos publiques)
    - INSERT : utilisateurs authentifiés uniquement
    - UPDATE : propriétaire uniquement
    - DELETE : propriétaire uniquement
*/

-- Créer le bucket (public pour accès direct aux images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'intervention-photos',
  'intervention-photos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy SELECT : tout le monde peut voir les photos (bucket public)
CREATE POLICY "Public photos are viewable by everyone"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'intervention-photos');

-- Policy INSERT : utilisateurs authentifiés peuvent uploader
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'intervention-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy UPDATE : utilisateurs peuvent mettre à jour leurs propres photos
CREATE POLICY "Users can update their own photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'intervention-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'intervention-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy DELETE : utilisateurs peuvent supprimer leurs propres photos
CREATE POLICY "Users can delete their own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'intervention-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## 3. Composant d'upload de photos

### 3.1 Composant PhotoUpload.tsx

Ce composant gère l'ouverture de la galerie/appareil photo et l'upload.

```typescript
import { useState } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PhotoUploadProps {
  interventionId: string;
  onPhotoUploaded: () => void;
}

export function PhotoUpload({ interventionId, onPhotoUploaded }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = Array.from(files).map(file => uploadPhoto(file));
      await Promise.all(uploadPromises);

      onPhotoUploaded();

      // Réinitialiser l'input
      event.target.value = '';
    } catch (err) {
      console.error('Error uploading photos:', err);
      setError('Erreur lors de l\'upload des photos');
    } finally {
      setUploading(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    // 1. Obtenir l'utilisateur actuel
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 2. Créer un nom de fichier unique
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${user.id}/${interventionId}/${fileName}`;

    // 3. Upload vers Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('intervention-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 4. Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('intervention-photos')
      .getPublicUrl(filePath);

    // 5. Sauvegarder les métadonnées en base de données
    const { error: dbError } = await supabase
      .from('intervention_photos')
      .insert({
        intervention_id: interventionId,
        url: publicUrl,
        storage_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id
      });

    if (dbError) {
      // En cas d'erreur DB, nettoyer le fichier uploadé
      await supabase.storage
        .from('intervention-photos')
        .remove([filePath]);
      throw dbError;
    }
  };

  return (
    <div className="space-y-4">
      {/* Bouton pour ouvrir la galerie/appareil photo */}
      <div className="flex gap-2">
        <label className="flex-1 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Upload en cours...</span>
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                <span>Prendre une photo</span>
              </>
            )}
          </div>
        </label>

        <label className="flex-1 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Upload en cours...</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Choisir depuis la galerie</span>
              </>
            )}
          </div>
        </label>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Note d'information */}
      <p className="text-sm text-gray-500">
        Formats acceptés : JPG, PNG, GIF, WebP (max 10MB par photo)
      </p>
    </div>
  );
}
```

---

## 4. Composant d'affichage des photos

### 4.1 Composant PhotoGallery.tsx

Ce composant affiche les photos uploadées avec possibilité de supprimer.

```typescript
import { useState } from 'react';
import { X, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Photo {
  id: string;
  url: string;
  file_name: string;
  storage_path: string;
  uploaded_at: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onPhotoDeleted: () => void;
}

export function PhotoGallery({ photos, onPhotoDeleted }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (photo: Photo) => {
    if (!confirm('Voulez-vous vraiment supprimer cette photo ?')) return;

    setDeletingId(photo.id);

    try {
      // 1. Supprimer de la base de données
      const { error: dbError } = await supabase
        .from('intervention_photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;

      // 2. Supprimer du storage
      const { error: storageError } = await supabase.storage
        .from('intervention-photos')
        .remove([photo.storage_path]);

      if (storageError) {
        console.warn('Storage deletion failed:', storageError);
      }

      onPhotoDeleted();
    } catch (err) {
      console.error('Error deleting photo:', err);
      alert('Erreur lors de la suppression de la photo');
    } finally {
      setDeletingId(null);
    }
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucune photo pour le moment
      </div>
    );
  }

  return (
    <>
      {/* Grille de photos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative group aspect-square bg-gray-100 rounded-lg overflow-hidden"
          >
            {/* Image */}
            <img
              src={photo.url}
              alt={photo.file_name}
              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setSelectedPhoto(photo)}
              loading="lazy"
            />

            {/* Bouton de suppression */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(photo);
              }}
              disabled={deletingId === photo.id}
              className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:opacity-50"
            >
              {deletingId === photo.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>

            {/* Nom du fichier */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="truncate">{photo.file_name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de visualisation plein écran */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-white"
          >
            <X className="w-6 h-6" />
          </button>

          <img
            src={selectedPhoto.url}
            alt={selectedPhoto.file_name}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-4 right-4 text-white text-center">
            <p className="text-lg font-medium">{selectedPhoto.file_name}</p>
            <p className="text-sm text-gray-300">
              {new Date(selectedPhoto.uploaded_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## 5. Hook personnalisé pour la gestion des photos

### 5.1 Hook usePhotos.ts

Hook pour charger et gérer les photos d'une intervention.

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Photo {
  id: string;
  intervention_id: string;
  url: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  uploaded_by: string;
}

export function usePhotos(interventionId: string | null) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = async () => {
    if (!interventionId) {
      setPhotos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('intervention_photos')
        .select('*')
        .eq('intervention_id', interventionId)
        .order('uploaded_at', { ascending: false });

      if (fetchError) throw fetchError;

      setPhotos(data || []);
    } catch (err) {
      console.error('Error loading photos:', err);
      setError('Erreur lors du chargement des photos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [interventionId]);

  return {
    photos,
    loading,
    error,
    reload: loadPhotos
  };
}
```

---

## 6. Intégration dans votre application

### 6.1 Exemple d'utilisation complète

```typescript
import { PhotoUpload } from './components/PhotoUpload';
import { PhotoGallery } from './components/PhotoGallery';
import { usePhotos } from './hooks/usePhotos';

export function InterventionDetailsPage({ interventionId }: { interventionId: string }) {
  const { photos, loading, reload } = usePhotos(interventionId);

  return (
    <div className="space-y-6">
      {/* Section d'upload */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Ajouter des photos</h2>
        <PhotoUpload
          interventionId={interventionId}
          onPhotoUploaded={reload}
        />
      </div>

      {/* Section d'affichage */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">
          Photos de l'intervention ({photos.length})
        </h2>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <PhotoGallery
            photos={photos}
            onPhotoDeleted={reload}
          />
        )}
      </div>
    </div>
  );
}
```

---

## 7. Points importants

### 7.1 Sécurité

- ✅ Les photos sont stockées dans des dossiers organisés par `user_id/intervention_id/`
- ✅ Row Level Security (RLS) activé sur la table
- ✅ Storage policies pour restreindre l'accès
- ✅ Validation du type MIME côté serveur

### 7.2 Performance

- 📦 Limite de 10MB par photo
- 🖼️ Loading lazy pour les images
- 📱 Optimisation mobile avec `capture="environment"`
- 💾 Nettoyage automatique en cas d'erreur

### 7.3 UX Mobile

- 📸 Bouton "Prendre une photo" ouvre l'appareil photo
- 🖼️ Bouton "Galerie" ouvre le sélecteur de fichiers
- 🔄 Indicateurs de chargement clairs
- ✨ Prévisualisation en plein écran

### 7.4 Gestion des erreurs

- 🔄 Rollback automatique si l'upload échoue
- ⚠️ Messages d'erreur explicites
- 🗑️ Nettoyage du storage en cas d'échec DB

---

## 8. Checklist d'intégration

- [ ] Créer la migration de base de données
- [ ] Créer la migration du storage
- [ ] Vérifier les policies RLS
- [ ] Copier le composant `PhotoUpload`
- [ ] Copier le composant `PhotoGallery`
- [ ] Copier le hook `usePhotos`
- [ ] Adapter les noms de tables/buckets
- [ ] Tester l'upload depuis mobile
- [ ] Tester la suppression
- [ ] Tester les permissions

---

## 9. Personnalisations possibles

### Ajouter un champ de description

```sql
ALTER TABLE intervention_photos ADD COLUMN description text;
```

### Limiter le nombre de photos

```typescript
const MAX_PHOTOS = 10;

if (photos.length >= MAX_PHOTOS) {
  alert(`Vous ne pouvez pas ajouter plus de ${MAX_PHOTOS} photos`);
  return;
}
```

### Compression d'image côté client

```typescript
// Installer : npm install browser-image-compression
import imageCompression from 'browser-image-compression';

const compressImage = async (file: File) => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  };

  return await imageCompression(file, options);
};
```

### Support des vidéos

Modifiez les types MIME acceptés :

```sql
allowed_mime_types: ARRAY[
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime'
]
```

---

## Support

Pour toute question ou problème :
1. Vérifiez les logs de la console navigateur
2. Vérifiez les logs Supabase
3. Testez les policies RLS avec le SQL Editor
4. Consultez la documentation Supabase Storage

---

**Dernière mise à jour** : Janvier 2026
