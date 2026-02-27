import React from 'react';
import { Clock, User, MapPin, Phone, AlertTriangle, CheckCircle, Archive, CreditCard as Edit, Calendar, FileText, Trash2, CreditCard as Edit3, X, Package, Download, Mail, Star, Zap, MessageSquare, History, List, Receipt } from 'lucide-react';
import { SavRequest } from '../../types';
import { generateInterventionPDF } from '../../lib/pdfGenerator';
import { EmailReportModal } from './EmailReportModal';
import { PhotoSelector } from '../common/PhotoSelector';
import { supabase } from '../../lib/supabase';
import { useSMS } from '../../hooks/useSMS';
import { useBatteries } from '../../hooks/useBatteries';
import { SavHistoryModal } from './SavHistoryModal';
import { NomenclatureModal } from './NomenclatureModal';

interface SavCardProps {
  request: SavRequest;
  onAddIntervention: (id: string) => void;
  onMarkComplete: (id: string) => void;
  onArchive: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onEditIntervention: (interventionId: string, savRequestId: string) => void;
  onEditReport: (interventionId: string, savRequestId: string) => void;
  onDeleteIntervention: (interventionId: string) => void;
  showBillingActions?: boolean;
  onMarkBilled?: (id: string) => void;
  onReactivate?: (id: string) => void;
  onTogglePriority?: (id: string) => void;
  onToggleQuickIntervention?: (id: string) => void;
  onToggleLongIntervention?: (id: string) => void;
  onRefresh?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'nouvelle': return 'bg-primary-100 text-primary-800';
    case 'en_cours': return 'bg-accent-100 text-accent-800';
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

const getSystemTypeLabel = (type: string) => {
  switch (type) {
    case 'ssi': return 'SSI';
    case 'type4': return 'Type 4';
    case 'intrusion': return 'Intrusion';
    case 'video': return 'Vidéo';
    case 'controle_acces': return 'Contrôle d\'accès';
    case 'interphone': return 'Interphone';
    case 'portail': return 'Portail';
    case 'autre': return 'Autre';
    default: return type;
  }
};

const formatDate = (dateString: string) => {
  // Parse the date and adjust for timezone display
  const date = new Date(dateString);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  });
};

export const SavCard: React.FC<SavCardProps> = ({
  request,
  onAddIntervention,
  onMarkComplete,
  onArchive,
  onEdit,
  onDelete,
  onEditIntervention,
  onEditReport,
  onDeleteIntervention,
  showBillingActions = false,
  onMarkBilled,
  onReactivate,
  onTogglePriority,
  onToggleQuickIntervention,
  onToggleLongIntervention,
  onRefresh
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);
  const [emailModalOpen, setEmailModalOpen] = React.useState(false);
  const [selectedInterventionId, setSelectedInterventionId] = React.useState<string | null | undefined>(null);
  const [isSendingSMS, setIsSendingSMS] = React.useState(false);
  const [creatingQuote, setCreatingQuote] = React.useState(false);
  const [historyModalOpen, setHistoryModalOpen] = React.useState(false);
  const [nomenclatureModalOpen, setNomenclatureModalOpen] = React.useState(false);
  const { sendSMS } = useSMS();
  const { createExtrabatQuote } = useBatteries();

  const handleDeleteIntervention = (interventionId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette intervention ?')) {
      onDeleteIntervention(interventionId);
    }
  };

  const handleDeleteSav = () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement la demande SAV de ${request.client_name} ?`)) {
      onDelete(request.id);
    }
  };

  const handleSendClientConfirmationSMS = async () => {
    if (!request.phone) {
      alert('Aucun numéro de téléphone pour ce client');
      return;
    }

    setIsSendingSMS(true);
    try {
      const result = await sendSMS({
        to: request.phone,
        message: 'Bruneau Protection : bonjour, nous avons bien pris connaissance de votre demande d\'intervention. Merci d\'enregistrer le numéro suivant comme "technicien Bruneau Protection" afin d\'être sûr de ne pas manquer notre appel : 0681082597',
        type: 'client_confirmation'
      });

      if (result.success) {
        alert('SMS envoyé avec succès au client');
      } else {
        alert('Erreur lors de l\'envoi du SMS : ' + result.error);
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      alert('Erreur lors de l\'envoi du SMS');
    } finally {
      setIsSendingSMS(false);
    }
  };

  const handleCreateExtrabatQuote = async (interventionId: string) => {
    setCreatingQuote(true);
    try {
      if (!request.extrabat_id) {
        alert('Aucun ID client Extrabat associé à cette demande SAV');
        return;
      }

      const result = await createExtrabatQuote(
        request.extrabat_id,
        interventionId,
        'sav',
        request.client_name
      );

      if (result.success) {
        alert(`Devis Extrabat créé avec succès !\nID du devis: ${result.devisId}`);
      } else {
        alert(`Erreur lors de la création du devis: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error creating quote:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setCreatingQuote(false);
    }
  };

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
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

            console.log('Photos loaded from DB for intervention', intervention.id, ':', photosData);

            const photosWithUrls = (photosData || []).map(photo => {
              const { data: { publicUrl } } = supabase.storage
                .from('intervention-photos')
                .getPublicUrl(photo.file_path);

              return {
                ...photo,
                url: publicUrl
              };
            });

            console.log('Photos with URLs:', photosWithUrls.map(p => ({ name: p.file_name, include: p.include_in_pdf })));

            return {
              ...intervention,
              photos: photosWithUrls
            };
          })
        );
      }

      await generateInterventionPDF(updatedRequest);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  return (
    <div
      data-sav-id={request.id}
      className={`relative rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden ${
      request.priority
        ? 'border-l-4 border-blue-500 bg-white'
        : 'border border-gray-200 bg-white'
    }`}>
      <div className="p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
              {getStatusLabel(request.status)}
            </span>
            {request.has_maintenance_contract && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 whitespace-nowrap">
                Contrat
              </span>
            )}
            {request.urgent && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Urgent
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {onTogglePriority && (
              <button
                onClick={() => onTogglePriority(request.id)}
                className={`btn-icon transition-colors ${
                  request.priority
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                }`}
                title={request.priority ? 'Retirer de prioritaire' : 'Marquer comme prioritaire'}
              >
                <Star className={`h-4 w-4 ${request.priority ? 'fill-blue-600' : ''}`} />
              </button>
            )}
            {onToggleQuickIntervention && (
              <button
                onClick={() => onToggleQuickIntervention(request.id)}
                className={`btn-icon transition-colors ${
                  request.is_quick_intervention
                    ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                    : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
                title={request.is_quick_intervention ? 'Retirer intervention rapide' : 'Marquer comme intervention rapide'}
              >
                <Zap className={`h-4 w-4 ${request.is_quick_intervention ? 'fill-emerald-600' : ''}`} />
              </button>
            )}
            {onToggleLongIntervention && (
              <button
                onClick={() => onToggleLongIntervention(request.id)}
                className={`btn-icon transition-colors ${
                  request.is_long_intervention
                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                    : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                }`}
                title={request.is_long_intervention ? 'Retirer intervention longue' : 'Marquer comme intervention longue'}
              >
                <Clock className={`h-4 w-4 ${request.is_long_intervention ? 'fill-amber-600' : ''}`} />
              </button>
            )}
            <button
              onClick={() => onEdit(request.id)}
              className="btn-icon text-gray-400 hover:text-primary-600 hover:bg-primary-50"
              title="Modifier la demande"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={handleDeleteSav}
              className="btn-icon text-gray-400 hover:text-rose-600 hover:bg-rose-50"
              title="Supprimer la demande"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Client Info */}
        <div className="space-y-2 mb-3 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 break-words">{request.client_name}</h3>
          
          {request.site && (
            <div className="flex items-center text-gray-600">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm break-words">{request.site}</span>
            </div>
          )}

          {request.phone && (
            <div className="flex items-center justify-between text-gray-600">
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-sm break-all">{request.phone}</span>
              </div>
              <button
                onClick={handleSendClientConfirmationSMS}
                disabled={isSendingSMS}
                className="btn-icon text-gray-400 hover:text-green-600 hover:bg-green-50"
                title="Envoyer SMS de confirmation au client"
              >
                {isSendingSMS ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
              </button>
            </div>
          )}

          {request.address && (
            <div className="flex items-start text-gray-600">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm break-words">{request.address}</span>
            </div>
          )}
        </div>

        {/* System Information */}
        {(request.system_type || request.system_brand || request.system_model) && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center justify-between text-blue-800">
              <div className="flex items-center">
                <Package className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-sm font-medium">Système</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setHistoryModalOpen(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                  title="Voir l'historique SAV complet"
                >
                  <History className="h-3.5 w-3.5" />
                  <span>Historique</span>
                </button>
                {request.extrabat_ouvrage_id && (
                  <button
                    onClick={() => setNomenclatureModalOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                    title="Voir la nomenclature"
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>Nomenclature</span>
                  </button>
                )}
              </div>
            </div>
            <div className="ml-6 text-sm text-gray-700 space-y-1">
              {request.system_type && (
                <div className="font-medium text-blue-900">{getSystemTypeLabel(request.system_type)}</div>
              )}
              {(request.system_brand || request.system_model) && (
                <div>
                  {request.system_brand}{request.system_brand && request.system_model && ' '}{request.system_model}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Problem */}
        <div className="space-y-3 mb-4">
          <div>
            <span className="text-sm font-medium text-gray-700 block mb-1">Problème:</span>
            <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg break-words">{request.problem_desc_reformule || request.problem_desc}</p>
          </div>
        </div>

        {/* Assignment */}
        {request.assigned_user && (
          <div className="flex items-center text-gray-600 mb-4">
            <User className="h-4 w-4 mr-2" />
            <span className="text-sm break-words">
              Assigné à: {request.assigned_user.display_name || request.assigned_user.email}
            </span>
          </div>
        )}

        {/* Interventions */}
        {request.interventions && request.interventions.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-600 mb-2">
              Interventions ({request.interventions.length})
            </h4>
            <div className="space-y-2">
              {request.interventions.map((intervention) => (
                <div key={intervention.id} className="bg-gray-50 p-2 rounded border border-gray-200 overflow-hidden">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center text-xs text-gray-600 mb-0.5">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(intervention.started_at)}
                        {intervention.ended_at && (
                          <span className="ml-2 text-gray-500">
                            → {formatDate(intervention.ended_at)}
                          </span>
                        )}
                      </div>
                      {(intervention.technicians && intervention.technicians.length > 0) ? (
                        <div className="flex items-center text-xs text-gray-600">
                          <User className="h-3 w-3 mr-1" />
                          <span className="break-words">
                            {intervention.technicians.map((tech: any) => tech.display_name || tech.email).join(', ')}
                          </span>
                        </div>
                      ) : intervention.technician && (
                        <div className="flex items-center text-xs text-gray-600">
                          <User className="h-3 w-3 mr-1" />
                          <span className="break-words">{intervention.technician.display_name || intervention.technician.email}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => onEditIntervention(intervention.id, request.id)}
                        className="btn-icon text-gray-400 hover:text-primary-600 hover:bg-primary-50"
                        title="Modifier l'intervention"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteIntervention(intervention.id)}
                        className="btn-icon text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Supprimer l'intervention"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {(intervention.rapport_reformule || intervention.rapport_brut) && (
                    <div className="mb-2">
                      <span className="text-xs font-medium text-gray-600 block mb-1">Rapport:</span>
                      <p className="text-xs text-gray-900 bg-white p-2 rounded break-words border border-gray-200">
                        {intervention.rapport_reformule || intervention.rapport_brut}
                      </p>
                    </div>
                  )}
                  {intervention.photos && intervention.photos.length > 0 && (
                    <PhotoSelector
                      photos={intervention.photos}
                      onPhotosUpdate={onRefresh}
                    />
                  )}
                  <div className="space-y-1.5">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => onEditReport(intervention.id, request.id)}
                        className="flex-1 btn-success"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>{(intervention.rapport_reformule || intervention.rapport_brut) ? 'Modifier rapport' : 'Saisir rapport'}</span>
                      </button>
                      {(intervention.rapport_reformule || intervention.rapport_brut) && (
                        <button
                          onClick={() => {
                            setSelectedInterventionId(intervention.id);
                            setEmailModalOpen(true);
                          }}
                          className="btn-ghost"
                          title="Envoyer le rapport au client"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {(intervention.rapport_reformule || intervention.rapport_brut) && (
                      <button
                        onClick={() => handleCreateExtrabatQuote(intervention.id)}
                        disabled={creatingQuote}
                        className="w-full btn-primary text-xs"
                        title="Créer un devis Extrabat avec les piles/batteries sélectionnées"
                      >
                        {creatingQuote ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent" />
                            <span>Création en cours...</span>
                          </>
                        ) : (
                          <>
                            <Receipt className="h-3.5 w-3.5" />
                            <span>Créer devis Extrabat</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="text-xs text-gray-500 space-y-1 mb-4">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            <span className="break-words">Demandé le {formatDate(request.requested_at)}</span>
          </div>
          {request.resolved_at && (
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" />
              <span className="break-words">Résolu le {formatDate(request.resolved_at)}</span>
            </div>
          )}
          {request.archived_at && (
            <div className="flex items-center">
              <Archive className="h-3 w-3 mr-1" />
              <span className="break-words">Archivé le {formatDate(request.archived_at)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 mt-3">
          {request.interventions && request.interventions.length > 0 && (
            <div className="flex gap-1.5">
              <button
                onClick={handleExportPDF}
                disabled={isGeneratingPDF}
                className="flex-1 btn-primary"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border border-slate-600 border-t-transparent" />
                    <span>Export...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    <span>PDF</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setSelectedInterventionId(undefined);
                  setEmailModalOpen(true);
                }}
                className="flex-1 btn-success"
                title="Envoyer le rapport global au client"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Email</span>
              </button>
            </div>
          )}

          {showBillingActions && (
            <div className="flex gap-1.5">
              <button
                onClick={() => onReactivate && onReactivate(request.id)}
                className="flex-1 btn-primary"
              >
                Réactiver
              </button>
              {request.status === 'terminee' && (
                <button
                  onClick={() => onMarkBilled && onMarkBilled(request.id)}
                  className="flex-1 btn-success"
                >
                  Facturé
                </button>
              )}
            </div>
          )}

          {!showBillingActions && request.status !== 'archivee' && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {(!request.interventions || request.interventions.length === 0) && (
                  <button
                    onClick={() => onAddIntervention(request.id)}
                    className="flex-1 btn-success"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Saisir rapport</span>
                  </button>
                )}

                {(request.status === 'nouvelle' || request.status === 'en_cours') && (
                  <button
                    onClick={() => onMarkComplete(request.id)}
                    className="flex-1 btn bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500"
                  >
                    SAV terminé
                  </button>
                )}

                {request.status === 'terminee' && (
                  <button
                    onClick={() => onArchive(request.id)}
                    className="flex-1 btn-secondary"
                  >
                    Archiver
                  </button>
                )}
              </div>

              <div className="flex gap-1.5 pt-2 border-t border-gray-100">
                <button
                  onClick={() => onEdit(request.id)}
                  className="flex-1 btn-ghost"
                >
                  Modifier
                </button>
                <button
                  onClick={() => onAddIntervention(request.id)}
                  className="flex-1 btn-ghost"
                >
                  + Intervention
                </button>
                <button
                  onClick={handleDeleteSav}
                  className="btn-ghost text-red-600 hover:bg-red-50"
                >
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {emailModalOpen && (
        <EmailReportModal
          request={request}
          interventionId={selectedInterventionId}
          onClose={() => {
            setEmailModalOpen(false);
            setSelectedInterventionId(null);
          }}
        />
      )}

      {historyModalOpen && (
        <SavHistoryModal
          savRequest={{
            id: request.id,
            client_name: request.client_name,
            extrabat_id: request.extrabat_id,
            extrabat_ouvrage_id: request.extrabat_ouvrage_id,
            site: request.site
          }}
          onClose={() => setHistoryModalOpen(false)}
        />
      )}

      {nomenclatureModalOpen && request.extrabat_id && request.extrabat_ouvrage_id && (
        <NomenclatureModal
          extrabatId={request.extrabat_id}
          ouvrageId={request.extrabat_ouvrage_id}
          onClose={() => setNomenclatureModalOpen(false)}
        />
      )}
    </div>
  );
};