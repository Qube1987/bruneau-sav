import React, { useState, useEffect } from 'react';
import { Megaphone, X, Edit, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface AnnouncementBannerProps {
  onClose?: () => void;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState<string>('');
  const [announcementId, setAnnouncementId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Check if user is admin
  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    fetchUserProfile();
    fetchAnnouncement();
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', user.email)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const fetchAnnouncement = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, message')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setAnnouncement(data.message);
        setAnnouncementId(data.id);
      }
    } catch (err) {
      console.error('Error fetching announcement:', err);
    }
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      if (announcementId) {
        // Update existing announcement
        const { error } = await supabase
          .from('announcements')
          .update({ 
            message: editText,
            updated_at: new Date().toISOString()
          })
          .eq('id', announcementId);

        if (error) throw error;
      } else {
        // Create new announcement
        const { data, error } = await supabase
          .from('announcements')
          .insert({
            message: editText,
            created_by: userProfile?.id || user?.id
          })
          .select('id')
          .single();

        if (error) throw error;
        setAnnouncementId(data.id);
      }

      setAnnouncement(editText);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving announcement:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || !announcementId) return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ active: false })
        .eq('id', announcementId);

      if (error) throw error;

      setAnnouncement('');
      setAnnouncementId(null);
      if (onClose) onClose();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      alert('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditText(announcement);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditText('');
    setIsEditing(false);
  };

  const handleDismiss = () => {
    // Hide announcement for current session
    sessionStorage.setItem(`announcement_dismissed_${announcementId}`, 'true');
    if (onClose) onClose();
  };

  // Don't show if dismissed in current session
  const isDismissed = announcementId && sessionStorage.getItem(`announcement_dismissed_${announcementId}`) === 'true';
  
  // Don't show if no announcement and not admin
  if ((!announcement && !isAdmin) || isDismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 sm:p-4 mb-6 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0 overflow-hidden">
          <div className="flex-shrink-0">
            <Megaphone className="h-5 w-5 text-blue-600 mt-0.5" />
          </div>
          
          <div className="flex-1 min-w-0 overflow-hidden">
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm min-h-[80px]"
                  rows={3}
                  placeholder="Saisissez votre message pour les techniciens..."
                />
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors disabled:opacity-50 w-full sm:w-auto"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Sauvegarder
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-xs sm:text-sm font-medium text-center w-full sm:w-auto"
                  >
                    Annuler
                  </button>
                  {announcementId && (
                    <button
                      onClick={handleDelete}
                      disabled={loading}
                      className="px-3 py-1.5 text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium text-center w-full sm:w-auto"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm sm:text-base font-medium text-blue-900 mb-1 break-words">
                  Message aux techniciens
                </div>
                {announcement ? (
                  <p className="text-sm text-blue-800 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                    {announcement}
                  </p>
                ) : isAdmin ? (
                  <p className="text-xs sm:text-sm text-blue-600 italic break-words">
                    Aucun message configuré. Cliquez sur "Modifier" pour ajouter un message.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 sm:ml-4 flex-shrink-0">
          {isAdmin && !isEditing && (
            <button
              onClick={handleEdit}
              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
              title="Modifier le message"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          
          {!isEditing && (
            <button
              onClick={handleDismiss}
              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0 min-w-[32px] min-h-[32px] flex items-center justify-center"
              title="Masquer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};