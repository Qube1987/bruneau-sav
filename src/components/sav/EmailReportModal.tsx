import React, { useState, useEffect } from 'react';
import { X, Send, Mail, Loader } from 'lucide-react';
import { SavRequest } from '../../types';
import { generateInterventionPDFBlob, generateSingleInterventionPDFBlob } from '../../lib/pdfGenerator';
import { supabase } from '../../lib/supabase';

interface EmailReportModalProps {
  request: SavRequest;
  interventionId?: string | null;
  onClose: () => void;
}

export const EmailReportModal: React.FC<EmailReportModalProps> = ({
  request,
  interventionId,
  onClose
}) => {
  const [clientEmail, setClientEmail] = useState('');
  const [subject, setSubject] = useState('Rapport d\'intervention');
  const [body, setBody] = useState(`Bonjour,

Je vous prie de bien vouloir trouver ci-joint le rapport de notre récente intervention sur votre système de sécurité.

Vous en souhaitant bonne réception et restant à votre disposition pour tout besoin ou renseignement complémentaire.

Bien cordialement,

Quentin Bruneau`);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (request.client_email) {
      setClientEmail(request.client_email);
    }
  }, [request]);

  const handleSendEmail = async () => {
    if (!clientEmail) {
      alert('Veuillez saisir une adresse email');
      return;
    }

    if (!subject || !body) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const updatedRequest = { ...request };

      if (updatedRequest.interventions) {
        updatedRequest.interventions = await Promise.all(
          updatedRequest.interventions.map(async (intervention) => {
            const { data: photosData } = await supabase
              .from('intervention_photos')
              .select('*')
              .eq('intervention_id', intervention.id)
              .eq('intervention_type', 'sav');

            const photosWithUrls = (photosData || []).map(photo => {
              const { data: { publicUrl } } = supabase.storage
                .from('intervention-photos')
                .getPublicUrl(photo.file_path);

              return {
                ...photo,
                url: publicUrl
              };
            });

            return {
              ...intervention,
              photos: photosWithUrls
            };
          })
        );
      }

      const pdfBlob = interventionId
        ? await generateSingleInterventionPDFBlob(updatedRequest, interventionId)
        : await generateInterventionPDFBlob(updatedRequest);
      const signatureBase64 = await loadSignatureImage();

      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      reader.onloadend = async () => {
        const base64PDF = reader.result?.toString().split(',')[1];

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

        const headers = {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        };

        const payload = {
          to: clientEmail,
          subject,
          body,
          attachmentBase64: base64PDF,
          attachmentName: `Rapport_${request.client_name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
          signatureBase64
        };

        console.log('Sending email with payload size:', JSON.stringify(payload).length, 'bytes');
        console.log('PDF size:', base64PDF?.length || 0, 'bytes');

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        const responseData = await response.json();
        console.log('Response data:', responseData);

        if (!response.ok) {
          let errorMessage = 'Erreur lors de l\'envoi de l\'email: ';

          if (responseData.error) {
            errorMessage += responseData.error;

            if (responseData.details) {
              console.error('Resend API details:', responseData.details);
              errorMessage += `\n\nDétails: ${JSON.stringify(responseData.details, null, 2)}`;
            }

            if (responseData.status) {
              errorMessage += `\n\nCode HTTP: ${responseData.status}`;
            }
          } else {
            errorMessage += `Erreur HTTP ${response.status}`;
          }

          setError(errorMessage);
          setIsSending(false);
          return;
        }

        alert('Email envoyé avec succès !');
        onClose();
        setIsSending(false);
      };
    } catch (err) {
      console.error('Error:', err);
      setError('Erreur lors de l\'envoi de l\'email: ' + (err instanceof Error ? err.message : 'Erreur inconnue'));
      setIsSending(false);
    }
  };

  const loadSignatureImage = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const base64 = canvas.toDataURL('image/png').split(',')[1];
            resolve(base64);
          } else {
            resolve('');
          }
        } catch (error) {
          console.warn('Failed to load signature:', error);
          resolve('');
        }
      };

      img.onerror = () => {
        console.warn('Failed to load signature image');
        resolve('');
      };

      img.src = '/image copy copy.png';
    });
  };

  const modalTitle = interventionId
    ? "Envoyer le rapport d'intervention au client"
    : "Envoyer le rapport complet au client";

  const pdfInfoMessage = interventionId
    ? "Le rapport de cette intervention sera automatiquement joint à cet email, ainsi que la signature de Quentin Bruneau."
    : "Le rapport complet de toutes les interventions sera automatiquement joint à cet email, ainsi que la signature de Quentin Bruneau.";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Mail className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">{modalTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 whitespace-pre-wrap font-mono">{error}</p>
            </div>
          )}

          {!clientEmail && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Aucun email n'a été enregistré pour ce client lors de la création de la demande SAV.
                Vous pouvez en saisir un manuellement ci-dessous.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email du client
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="client@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Objet
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              {pdfInfoMessage}
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSendEmail}
              disabled={isSending || !clientEmail}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Envoyer</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
