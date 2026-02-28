import React, { useState, useEffect } from 'react';
import { X, Loader, History, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SavHistoryModalProps {
  savRequest: {
    id: string;
    client_name: string;
    extrabat_id?: number;
    extrabat_ouvrage_id?: number;
    site?: string;
  };
  onClose: () => void;
}

interface LocalSavHistory {
  id: string;
  requested_at: string;
  problem_desc: string;
  status: string;
  system_type: string;
  observations?: string;
}

interface ExtrabatRdv {
  id: number;
  debut: string;
  fin?: string;
  notes?: string;
  observation?: string;
  titre?: string;
  categorie?: string;
}

interface ExtrabatSav {
  id: number;
  dateCreation: string;
  observation?: string;
  rubrique?: {
    libelle: string;
  };
  etat?: {
    libelle: string;
  };
  rdv?: ExtrabatRdv[];
}

interface ExtrabatOuvrage {
  id: number;
  libelle: string;
  sav: ExtrabatSav[];
}

export const SavHistoryModal: React.FC<SavHistoryModalProps> = ({ savRequest, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [localHistory, setLocalHistory] = useState<LocalSavHistory[]>([]);
  const [extrabatHistory, setExtrabatHistory] = useState<ExtrabatOuvrage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        loadLocalHistory(),
        loadExtrabatHistory()
      ]);
    } catch (err) {
      console.error('Error loading history:', err);
      setError('Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const loadLocalHistory = async () => {
    if (!savRequest.extrabat_ouvrage_id) return;

    const { data, error } = await supabase
      .from('sav_requests')
      .select('id, requested_at, problem_desc, status, system_type, observations')
      .eq('extrabat_ouvrage_id', savRequest.extrabat_ouvrage_id)
      .neq('id', savRequest.id)
      .order('requested_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading local history:', error);
      return;
    }

    setLocalHistory(data || []);
  };

  const loadExtrabatHistory = async () => {
    if (!savRequest.extrabat_id || !savRequest.extrabat_ouvrage_id) {
      setError('Aucun ID client ou ouvrage Extrabat associé à cette demande');
      return;
    }

    const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
      body: {
        endpoint: `client/${savRequest.extrabat_id}`,
        params: {
          include: 'ouvrage,ouvrage.sav,ouvrage.sav.rdv'
        },
        apiVersion: 'v3'
      }
    });

    if (error) {
      console.error('Extrabat error:', error);
      setError('Erreur lors de la récupération des données Extrabat');
      return;
    }

    if (!data.success) {
      console.error('Extrabat API error:', data.error);
      setError('Erreur API Extrabat: ' + data.error);
      return;
    }

    const clientData = data.data;

    // Trouver l'ouvrage correspondant à l'ID
    if (clientData && clientData.ouvrage && Array.isArray(clientData.ouvrage)) {
      const targetOuvrage = clientData.ouvrage.find(
        (o: any) => o.id === savRequest.extrabat_ouvrage_id
      );

      if (targetOuvrage && targetOuvrage.sav && targetOuvrage.sav.length > 0) {
        // Wrap the single ouvrage in an array for consistent display logic
        setExtrabatHistory([targetOuvrage]);
      } else {
        setExtrabatHistory([]);
      }
    } else {
      setExtrabatHistory([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'nouvelle': return 'bg-blue-100 text-blue-800';
      case 'en_cours': return 'bg-yellow-100 text-yellow-800';
      case 'terminee': return 'bg-green-100 text-green-800';
      case 'archivee': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'nouvelle': return 'Nouvelle';
      case 'en_cours': return 'En cours';
      case 'terminee': return 'Terminée';
      case 'archivee': return 'Archivée';
      default: return status;
    }
  };

  const currentOuvrageData = extrabatHistory.length > 0 ? extrabatHistory[0] : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full h-full sm:h-auto sm:rounded-lg shadow-xl sm:max-w-4xl sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <History className="h-6 w-6" />
              Historique SAV
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {savRequest.client_name}
              {savRequest.site && ` - ${savRequest.site}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-primary-600" />
              <span className="ml-3 text-gray-600">Chargement de l'historique...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Erreur</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {currentOuvrageData && currentOuvrageData.sav.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Interventions Extrabat - {currentOuvrageData.libelle}
                  </h3>
                  <div className="space-y-3">
                    {currentOuvrageData.sav
                      .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())
                      .map((sav) => (
                        <div
                          key={sav.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900">
                              {format(new Date(sav.dateCreation), 'dd MMMM yyyy', { locale: fr })}
                            </span>
                          </div>

                          {sav.rubrique && (
                            <p className="text-sm font-medium text-gray-800 mb-1">
                              {sav.rubrique.libelle}
                            </p>
                          )}

                          {sav.observation && (
                            <p className="text-sm text-gray-700 mb-2">
                              {sav.observation}
                            </p>
                          )}

                          {sav.etat && (
                            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              {sav.etat.libelle}
                            </span>
                          )}

                          {sav.rdvs && sav.rdvs.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Interventions ({sav.rdvs.length})
                              </p>
                              <div className="space-y-2">
                                {sav.rdvs
                                  .sort((a, b) => {
                                    const rdvA = a.rdv || a;
                                    const rdvB = b.rdv || b;
                                    return new Date(rdvB.debut).getTime() - new Date(rdvA.debut).getTime();
                                  })
                                  .map((rdvWrapper, rdvIdx) => {
                                    const rdv = rdvWrapper.rdv || rdvWrapper;
                                    const hasReport = rdv.notes && rdv.notes.trim();

                                    return (
                                      <div key={rdv.id || rdvIdx} className="bg-gray-50 rounded p-2 border border-gray-200">
                                        {/* En-tête avec date et badge rapport */}
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-xs font-medium text-gray-900">
                                            {rdv.debut ? format(new Date(rdv.debut), 'dd MMM yyyy', { locale: fr }) : 'Date non définie'}
                                          </span>
                                          {rdv.debut && (
                                            <span className="text-xs text-gray-500">
                                              {format(new Date(rdv.debut), 'HH:mm', { locale: fr })}
                                              {rdv.fin && ` - ${format(new Date(rdv.fin), 'HH:mm', { locale: fr })}`}
                                            </span>
                                          )}
                                          {hasReport && (
                                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                              ✓ Rapport
                                            </span>
                                          )}
                                        </div>

                                        {/* Titre */}
                                        {rdv.titre && (
                                          <p className="text-xs text-gray-600 mb-1">{rdv.titre}</p>
                                        )}

                                        {/* Rapport d'intervention */}
                                        {hasReport && (
                                          <div className="mt-2 pt-2 border-t border-gray-200 bg-white rounded p-2">
                                            <div className="flex items-start gap-2">
                                              <div className="flex-shrink-0 mt-0.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                              </div>
                                              <div className="flex-1">
                                                <p className="text-xs font-medium text-gray-700 mb-1">
                                                  Rapport d'intervention :
                                                </p>
                                                <p className="text-xs text-gray-900 whitespace-pre-wrap">
                                                  {rdv.notes}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {localHistory.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Historique local ({localHistory.length})
                  </h3>
                  <div className="space-y-3">
                    {localHistory.map((sav) => (
                      <div
                        key={sav.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900">
                              {format(new Date(sav.requested_at), 'dd MMMM yyyy', { locale: fr })}
                            </span>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(sav.status)}`}>
                            {getStatusLabel(sav.status)}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-gray-800 mb-1">
                          {sav.system_type}
                        </p>

                        <p className="text-sm text-gray-700 mb-2">
                          {sav.problem_desc}
                        </p>

                        {sav.observations && (
                          <p className="text-sm text-gray-600 italic">
                            {sav.observations}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!loading && localHistory.length === 0 && extrabatHistory.length === 0 && (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-lg">Aucun historique disponible</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {!savRequest.extrabat_ouvrage_id && 'Aucun ID ouvrage Extrabat associé'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50 shrink-0 sticky bottom-0 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto sm:px-8 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors min-h-[44px]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
