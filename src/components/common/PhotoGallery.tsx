import React, { useState } from 'react';
import { X, ZoomIn } from 'lucide-react';
import { InterventionPhoto } from '../../types';
import { supabase } from '../../lib/supabase';

interface PhotoGalleryProps {
  photos: InterventionPhoto[];
  onClose?: () => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, onClose }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<InterventionPhoto | null>(null);

  if (photos.length === 0) {
    return null;
  }

  const getPhotoUrl = (photo: InterventionPhoto): string => {
    if (photo.url) return photo.url;

    const { data: { publicUrl } } = supabase.storage
      .from('intervention-photos')
      .getPublicUrl(photo.file_path);

    return publicUrl;
  };

  return (
    <>
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">
          Photos ({photos.length})
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 hover:border-primary-500 transition-all cursor-pointer"
            >
              <img
                src={getPhotoUrl(photo)}
                alt={photo.file_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 p-2 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <div
            className="relative max-w-5xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getPhotoUrl(selectedPhoto)}
              alt={selectedPhoto.file_name}
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
              <p className="text-white text-sm font-medium">{selectedPhoto.file_name}</p>
              <p className="text-gray-300 text-xs">
                {(selectedPhoto.file_size / 1024).toFixed(0)} KB • {new Date(selectedPhoto.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
