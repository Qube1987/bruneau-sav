import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Loader, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { InterventionPhoto } from '../../types';

interface PhotoUploadProps {
  interventionId?: string;
  interventionType: 'sav' | 'maintenance';
  photos: InterventionPhoto[];
  onPhotosChange: (photos: InterventionPhoto[]) => void;
  disabled?: boolean;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  interventionId,
  interventionType,
  photos,
  onPhotosChange,
  disabled = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = async (file: File) => {
    try {
      setUploading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const filePath = interventionId
        ? `${interventionType}/${interventionId}/${fileName}`
        : `temp/${interventionType}/${timestamp}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('intervention-photos')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('intervention-photos')
        .getPublicUrl(filePath);

      if (interventionId) {
        const { data: photoData, error: dbError } = await supabase
          .from('intervention_photos')
          .insert({
            intervention_id: interventionId,
            intervention_type: interventionType,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id,
            include_in_pdf: false
          })
          .select()
          .single();

        if (dbError) throw dbError;

        const newPhoto: InterventionPhoto = {
          ...photoData,
          url: publicUrl
        };

        onPhotosChange([...photos, newPhoto]);
      } else {
        const tempPhoto: InterventionPhoto = {
          id: `temp-${timestamp}`,
          intervention_id: '',
          intervention_type: interventionType,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
          created_at: new Date().toISOString(),
          include_in_pdf: false,
          url: publicUrl
        };

        onPhotosChange([...photos, tempPhoto]);
      }

    } catch (err) {
      console.error('Error uploading photo:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      await uploadPhoto(files[i]);
    }

    event.target.value = '';
  };

  const handleDeletePhoto = async (photo: InterventionPhoto) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('intervention-photos')
        .remove([photo.file_path]);

      if (storageError) throw storageError;

      if (photo.id && !photo.id.startsWith('temp-')) {
        const { error: dbError } = await supabase
          .from('intervention_photos')
          .delete()
          .eq('id', photo.id);

        if (dbError) throw dbError;
      }

      onPhotosChange(photos.filter(p => p.id !== photo.id));
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };


  const getPhotoUrl = (photo: InterventionPhoto): string => {
    if (photo.url) return photo.url;

    const { data: { publicUrl } } = supabase.storage
      .from('intervention-photos')
      .getPublicUrl(photo.file_path);

    return publicUrl;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Photos de l'intervention
        </label>
        <span className="text-xs text-gray-500">
          {photos.length} photo{photos.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Appareil photo</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ImageIcon className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Galerie</span>
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {uploading && (
        <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Loader className="h-5 w-5 text-blue-600 animate-spin" />
          <span className="text-sm text-blue-700">Upload en cours...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
            >
              <img
                src={getPhotoUrl(photo)}
                alt={photo.file_name}
                className="w-full h-full object-cover"
              />

              {/* Delete button on hover */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(photo)}
                  className="opacity-0 group-hover:opacity-100 p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all"
                  title="Supprimer la photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Photo info on hover */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white truncate">{photo.file_name}</p>
                <p className="text-xs text-gray-300">
                  {(photo.file_size / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && !uploading && (
        <div className="text-center py-8 text-gray-500 text-sm">
          Aucune photo ajoutée. Utilisez les boutons ci-dessus pour ajouter des photos.
        </div>
      )}
    </div>
  );
};
