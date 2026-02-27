import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, FileText, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { InterventionPhoto } from '../../types';
import { PhotoGallery } from './PhotoGallery';

interface PhotoSelectorProps {
  photos: InterventionPhoto[];
  onPhotosUpdate?: () => void;
}

export const PhotoSelector: React.FC<PhotoSelectorProps> = ({
  photos,
  onPhotosUpdate
}) => {
  const [showGallery, setShowGallery] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [localPhotos, setLocalPhotos] = useState<InterventionPhoto[]>(photos);

  // Update local state when photos prop changes
  useEffect(() => {
    setLocalPhotos(photos);
  }, [photos]);

  const handleToggleIncludeInPdf = async (photo: InterventionPhoto, newValue: boolean, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setUpdating(photo.id);

      // Update local state immediately for instant feedback
      setLocalPhotos(prev => prev.map(p =>
        p.id === photo.id ? { ...p, include_in_pdf: newValue } : p
      ));

      console.log('Updating photo', photo.id, 'include_in_pdf to', newValue);

      const { data, error: dbError } = await supabase
        .from('intervention_photos')
        .update({ include_in_pdf: newValue })
        .eq('id', photo.id)
        .select();

      console.log('Update result:', data, 'error:', dbError);

      if (dbError) throw dbError;

      // Don't reload the entire list, just update was successful
    } catch (err) {
      console.error('Error updating photo:', err);
      // Revert local state on error
      setLocalPhotos(photos);
    } finally {
      setUpdating(null);
    }
  };

  if (!localPhotos || localPhotos.length === 0) {
    return null;
  }

  const selectedCount = localPhotos.filter(p => p.include_in_pdf).length;

  return (
    <>
      <div className="mt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">
            Photos ({localPhotos.length})
          </span>
          {selectedCount > 0 && (
            <span className="text-xs text-primary-600 font-medium">
              {selectedCount} sélectionnée{selectedCount > 1 ? 's' : ''} pour le PDF
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {localPhotos.map((photo) => (
            <div key={photo.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-primary-300 transition-colors">
                <img
                  src={photo.url}
                  alt={photo.file_name}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowGallery(true);
                  }}
                />
              </div>

              <div
                className="absolute top-1 right-1 cursor-pointer"
                onClick={(e) => handleToggleIncludeInPdf(photo, !photo.include_in_pdf, e)}
              >
                <div
                  className={`
                    w-6 h-6 rounded flex items-center justify-center transition-all shadow-sm
                    ${photo.include_in_pdf
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-400 hover:bg-gray-50'
                    }
                    ${updating === photo.id ? 'opacity-50' : ''}
                  `}
                  title={photo.include_in_pdf ? 'Inclure dans le PDF' : 'Exclure du PDF'}
                >
                  {updating === photo.id ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setShowGallery(true);
          }}
          className="mt-2 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <ImageIcon className="h-3 w-3" />
          Voir toutes les photos
        </button>
      </div>

      {showGallery && (
        <PhotoGallery
          photos={localPhotos}
          onClose={() => setShowGallery(false)}
        />
      )}
    </>
  );
};
