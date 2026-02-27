import { useState, useEffect } from 'react';
import { X, Plus, Save, User } from 'lucide-react';
import { CreateCallNoteData, CallNote } from '../../hooks/useCallNotes';
import { useSavRequests } from '../../hooks/useSavRequests';
import { useMaintenanceContracts } from '../../hooks/useMaintenanceContracts';
import { supabase } from '../../lib/supabase';

interface CallNoteFormProps {
  onSubmit: (data: CreateCallNoteData) => Promise<void>;
  onCancel: () => void;
  editingNote?: CallNote | null;
}

export function CallNoteForm({ onSubmit, onCancel, editingNote }: CallNoteFormProps) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [callSubject, setCallSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [submitting, setSubmitting] = useState(false);
  const [showExtrabatSearch, setShowExtrabatSearch] = useState(false);
  const [extrabatClients, setExtrabatClients] = useState<any[]>([]);
  const [loadingExtrabat, setLoadingExtrabat] = useState(false);
  const [clientSelected, setClientSelected] = useState(false);

  useEffect(() => {
    if (editingNote) {
      setClientName(editingNote.client_name || '');
      setClientPhone(editingNote.client_phone || '');
      setCallSubject(editingNote.call_subject || '');
      setNotes(editingNote.notes || '');
      setPriority(editingNote.priority);
    }
  }, [editingNote]);

  const searchExtrabatClients = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setExtrabatClients([]);
      return;
    }

    setLoadingExtrabat(true);
    try {
      const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
        body: {
          endpoint: 'clients',
          params: {
            q: query,
            include: 'telephone,adresse'
          }
        }
      });

      if (error) {
        console.error('Error searching Extrabat clients:', error);
        return;
      }

      if (data.success) {
        setExtrabatClients(data.data || []);
      } else {
        console.error('Extrabat search error:', data.error);
      }
    } catch (err) {
      console.error('Extrabat client search failed:', err);
    } finally {
      setLoadingExtrabat(false);
    }
  };

  useEffect(() => {
    if (clientSelected || editingNote) {
      return;
    }

    const timer = setTimeout(() => {
      if (clientName.length >= 3) {
        searchExtrabatClients(clientName);
        setShowExtrabatSearch(true);
      } else if (clientName.length < 3) {
        setExtrabatClients([]);
        setShowExtrabatSearch(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [clientName, editingNote, clientSelected]);

  const handleExtrabatClientSelect = (client: any) => {
    const fullName = `${client.civilite.libelle} ${client.prenom} ${client.nom}`;

    setClientSelected(true);
    setShowExtrabatSearch(false);
    setExtrabatClients([]);
    setClientName(fullName);

    if (client.telephones && client.telephones.length > 0) {
      setClientPhone(client.telephones[0].number);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        client_name: clientName || undefined,
        client_phone: clientPhone || undefined,
        call_subject: callSubject || undefined,
        notes: notes || undefined,
        priority,
      });

      if (!editingNote) {
        setClientName('');
        setClientPhone('');
        setCallSubject('');
        setNotes('');
        setPriority('normal');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-lg sm:rounded-lg shadow-xl flex flex-col max-h-screen">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white sm:rounded-t-lg">
          <h2 className="text-lg font-semibold">
            {editingNote ? 'Modifier la note' : 'Nouvelle note'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-gray-100"
            disabled={submitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du client
              {!editingNote && clientName.length > 0 && clientName.length < 3 && (
                <span className="ml-2 text-xs text-gray-500">
                  (tapez au moins 3 caractères pour rechercher)
                </span>
              )}
            </label>

            <div className="relative">
              <input
                type="text"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  if (clientSelected) {
                    setClientSelected(false);
                  }
                }}
                placeholder="Nom du client (optionnel)"
                className={`w-full px-4 py-3 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  showExtrabatSearch ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
                }`}
              />
              {loadingExtrabat && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              )}
            </div>

            {showExtrabatSearch && !editingNote && (
              <div className="mt-2 space-y-2">
                {extrabatClients.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border border-blue-200 rounded-lg divide-y bg-white shadow-sm">
                    {extrabatClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => handleExtrabatClientSelect(client)}
                        className="w-full text-left p-3 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              {client.civilite.libelle} {client.prenom} {client.nom}
                            </div>
                            {client.telephones && client.telephones.length > 0 && (
                              <div className="text-xs text-gray-600">
                                📞 {client.telephones[0].number}
                              </div>
                            )}
                            {client.adresses && client.adresses.length > 0 && (
                              <div className="text-xs text-gray-500">
                                📍 {client.adresses[0].codePostal} {client.adresses[0].ville}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {clientName.length >= 3 && extrabatClients.length === 0 && !loadingExtrabat && (
                  <div className="p-3 text-sm text-gray-500 text-center border border-gray-200 rounded-lg bg-gray-50">
                    Aucun client trouvé dans Extrabat
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Numéro de téléphone (optionnel)"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Objet de l'appel
            </label>
            <input
              type="text"
              value={callSubject}
              onChange={(e) => setCallSubject(e.target.value)}
              placeholder="Objet de l'appel (optionnel)"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Basse</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes additionnelles (optionnel)"
              rows={4}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </form>

        <div className="p-4 border-t bg-gray-50 sm:rounded-b-lg sticky bottom-0">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {editingNote ? (
              <>
                <Save className="w-5 h-5" />
                Enregistrer
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Ajouter la note
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
