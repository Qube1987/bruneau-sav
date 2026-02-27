import React, { useState, useEffect } from 'react';
import { MessageSquare, Save, Phone } from 'lucide-react';

interface SMSSettingsProps {
  onClose: () => void;
}

export const SMSSettings: React.FC<SMSSettingsProps> = ({ onClose }) => {
  const [adminPhone, setAdminPhone] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // Load saved admin phone from localStorage
    const saved = localStorage.getItem('sav_admin_phone');
    if (saved) setAdminPhone(saved);
  }, []);

  const handleSave = () => {
    localStorage.setItem('sav_admin_phone', adminPhone);
    alert('Numéro administrateur sauvegardé');
    onClose();
  };

  const handleTest = async () => {
    if (!testPhone) {
      alert('Veuillez saisir un numéro de test');
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testPhone,
          message: 'Test SMS depuis l\'application SAV - Configuration réussie !',
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('SMS de test envoyé avec succès !');
      } else {
        alert(`Erreur: ${result.error}`);
      }
    } catch (error) {
      alert(`Erreur lors de l'envoi: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full my-8">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <MessageSquare className="h-6 w-6 mr-2 text-blue-600" />
              Configuration SMS
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Information</h3>
            <p className="text-sm text-blue-700">
              Les SMS sont envoyés automatiquement au client lors de la création d'une demande SAV 
              (si un numéro de téléphone est renseigné).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="h-4 w-4 inline mr-1" />
              Numéro administrateur (optionnel)
            </label>
            <input
              type="tel"
              value={adminPhone}
              onChange={(e) => setAdminPhone(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="+33123456789"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format international recommandé (ex: +33123456789)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test SMS
            </label>
            <div className="flex space-x-2">
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="+33123456789"
              />
              <button
                onClick={handleTest}
                disabled={testing}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {testing ? '...' : 'Test'}
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};