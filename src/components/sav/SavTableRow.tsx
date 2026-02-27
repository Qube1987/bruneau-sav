import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, User, MapPin, Phone, AlertTriangle, CheckCircle, Archive, CreditCard as Edit, Calendar, FileText, Trash2, CreditCard as Edit3, X, Star, Package, Download, Mail, Zap, MessageSquare, History, List, Receipt } from 'lucide-react';
import { SavRequest } from '../../types';
import { generateInterventionPDF } from '../../lib/pdfGenerator';
import { EmailReportModal } from './EmailReportModal';
import { PhotoGallery } from '../common/PhotoGallery';
import { PhotoSelector } from '../common/PhotoSelector';
import { supabase } from '../../lib/supabase';
import { useSMS } from '../../hooks/useSMS';
import { useBatteries } from '../../hooks/useBatteries';
import { SavHistoryModal } from './SavHistoryModal';
import { NomenclatureModal } from './NomenclatureModal';

interface SavTableRowProps {
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

export const SavTableRow: React.FC<SavTableRowProps> = ({
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
  const [expanded, setExpanded] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | undefined>(undefined);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [nomenclatureModalOpen, setNomenclatureModalOpen] = useState(false);
  const [creatingQuote, setCreatingQuote] = useState(false);
  const { sendSMS } = useSMS();
  const { createExtrabatQuote, fetchInterventionBatteries } = useBatteries();

  const handleDeleteIntervention = (interventionId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette intervention ?')) {
      onDeleteIntervention(interventionId);
    }
  };

  const handleDeleteSav = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement la demande SAV de ${request.client_name} ?`)) {
      onDelete(request.id);
    }
  };

  const handleActionWithScrollPreservation = (action: () => void) => {
    return (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      action();
    };
  };

  const handleSendClientConfirmationSMS = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!request.phone) {
      alert('Aucun numéro de téléphone disponible');
      return;
    }

    if (!confirm(`Envoyer un SMS de confirmation à ${request.client_name} ?`)) {
      return;
    }

    setSendingSMS(true);
    try {
      const message = `Bruneau Protection : bonjour, nous avons bien pris connaissance de votre demande d'intervention. Merci d'enregistrer le numéro suivant comme "technicien Bruneau Protection" afin d'être sûr de ne pas manquer notre appel : 0681082597`;

      const result = await sendSMS({
        to: request.phone,
        message,
        type: 'client_confirmation'
      });

      if (result.success) {
        alert('SMS envoyé avec succès !');
      } else {
        alert(`Erreur lors de l'envoi du SMS: ${result.error || 'Erreur inconnue'}`);
      }
    } catch (error: any) {
      console.error('SMS Error:', error);
      alert(`Erreur lors de l'envoi du SMS: ${error.message || 'Erreur inconnue'}`);
    } finally {
      setSendingSMS(false);
    }
  };

  const handleCreateExtrabatQuote = async (interventionId: string) => {
    if (!request.extrabat_id) {
      alert('Ce client n\'a pas d\'ID Extrabat associé. Veuillez d\'abord lier ce client à Extrabat.');
      return;
    }

    try {
      setCreatingQuote(true);

      // Check if batteries are selected
      const batteries = await fetchInterventionBatteries(interventionId, 'sav');
      if (batteries.length === 0) {
        alert('Aucune pile/batterie sélectionnée pour cette intervention. Veuillez d\'abord saisir le rapport et sélectionner des piles.');
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

  const handleExportPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
      className={`relative rounded-lg overflow-hidden transition-all duration-200 ${
      request.priority
        ? 'bg-white border-l-4 border-blue-500 shadow-md'
        : 'bg-white border border-gray-200 hover:shadow-sm'
    }`}>
      {/* Condensed Row */}
      <div className="flex items-center p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpanded(!expanded)}>
        {/* Expand/Collapse Button */}
        <button className="hidden sm:block mr-2 sm:mr-3 p-1 hover:bg-gray-100 rounded flex-shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </button>

        {/* Status & Badges */}
        <div className="hidden sm:flex flex-col items-start gap-1 mr-3 flex-shrink-0 min-w-[100px]">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
            {getStatusLabel(request.status)}
          </span>
          <div className="flex items-center gap-1">
            {request.has_maintenance_contract && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 whitespace-nowrap">
                Contrat
              </span>
            )}
          </div>
        </div>

        {/* Client Name */}
        <div className="flex-1 min-w-0 mr-2 sm:mr-4">
          <div className="font-medium truncate text-sm sm:text-base text-gray-900">
            {request.client_name}
          </div>
          {request.site && (
            <div className="text-xs sm:text-sm truncate text-gray-500">
              {request.site}
            </div>
          )}
        </div>

        {/* Problem Description */}
        <div className="hidden md:block flex-1 min-w-0 mr-4">
          <p className="text-sm truncate text-gray-600">
            {request.problem_desc_reformule || request.problem_desc}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {onTogglePriority && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePriority(request.id);
              }}
              className={`flex p-1.5 sm:p-2 rounded-lg transition-colors ${
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
              onClick={(e) => {
                e.stopPropagation();
                onToggleQuickIntervention(request.id);
              }}
              className={`flex p-1.5 sm:p-2 rounded-lg transition-colors ${
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
              onClick={(e) => {
                e.stopPropagation();
                onToggleLongIntervention(request.id);
              }}
              className={`flex p-1.5 sm:p-2 rounded-lg transition-colors ${
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
            onClick={handleDeleteSav}
            className="hidden sm:flex p-1.5 sm:p-2 rounded-lg transition-colors text-gray-400 hover:text-red-600 hover:bg-red-50"
            title="Supprimer la demande"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Contact Info */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Informations de contact</h4>
              {request.phone && (
                <div className="flex items-center justify-between text-gray-600">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    <span className="text-sm">{request.phone}</span>
                  </div>
                  <button
                    onClick={handleSendClientConfirmationSMS}
                    disabled={sendingSMS}
                    className="ml-2 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-xs"
                    title="Envoyer SMS au client : Bruneau Protection : bonjour, nous avons bien pris connaissance de votre demande d'intervention. Merci d'enregistrer le numéro suivant comme 'technicien Bruneau Protection' afin d'être sûr de ne pas manquer notre appel : 0681082597"
                  >
                    {sendingSMS ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent" />
                        <span>Envoi...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-3 w-3" />
                        <span>SMS</span>
                      </>
                    )}
                  </button>
                </div>
              )}
              {request.address && (
                <div className="flex items-start text-gray-600">
                  <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                  <span className="text-sm">{request.address}</span>
                </div>
              )}
            </div>

            {/* System Information */}
            {(request.system_type || request.system_brand || request.system_model) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <Package className="h-4 w-4 mr-2" />
                    Système
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setHistoryModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      title="Voir l'historique SAV"
                    >
                      <History className="h-3 w-3" />
                      Historique
                    </button>
                    {request.extrabat_id && request.extrabat_ouvrage_id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNomenclatureModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Voir la nomenclature Extrabat"
                      >
                        <List className="h-3 w-3" />
                        Nomenclature
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
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

            {/* Assignment & Dates */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Suivi</h4>
              {request.assigned_user && (
                <div className="flex items-center text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  <span className="text-sm">
                    Assigné à: {request.assigned_user.display_name || request.assigned_user.email}
                  </span>
                </div>
              )}
              <div className="flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                <span className="text-sm">Demandé le {formatDate(request.requested_at)}</span>
              </div>
              {request.resolved_at && (
                <div className="flex items-center text-gray-600">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">Résolu le {formatDate(request.resolved_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Full Problem Description */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Description du problème</h4>
            <p className="text-sm text-gray-700 bg-white p-3 rounded border">{request.problem_desc_reformule || request.problem_desc}</p>
          </div>

          {/* Interventions */}
          {request.interventions && request.interventions.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Interventions ({request.interventions.length})
              </h4>
              <div className="space-y-3">
                {request.interventions.map((intervention) => (
                  <div key={intervention.id} className="bg-white p-3 rounded border">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(intervention.started_at)}
                          {intervention.ended_at && (
                            <span className="ml-2 text-gray-500">
                              → {formatDate(intervention.ended_at)}
                            </span>
                          )}
                        </div>
                        {(intervention.technicians && intervention.technicians.length > 0) ? (
                          <div className="flex items-center text-sm text-gray-600 mb-1">
                            <User className="h-4 w-4 mr-1" />
                            {intervention.technicians.map((tech: any) => tech.display_name || tech.email).join(', ')}
                          </div>
                        ) : intervention.technician && (
                          <div className="flex items-center text-sm text-gray-600 mb-1">
                            <User className="h-4 w-4 mr-1" />
                            {intervention.technician.display_name || intervention.technician.email}
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
                      <div className="mb-3">
                        <span className="text-xs font-medium text-gray-700 block mb-1">Rapport:</span>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg break-words border border-gray-200">
                          {intervention.rapport_reformule || intervention.rapport_brut}
                        </p>
                      </div>
                    )}
                    {intervention.photos && intervention.photos.length > 0 && (
                      <div className="mb-3">
                        <PhotoSelector
                          photos={intervention.photos}
                          onPhotosUpdate={onRefresh}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
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

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* PDF Export and Email Buttons */}
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
                {request.phone && (
                  <button
                    onClick={handleSendClientConfirmationSMS}
                    disabled={sendingSMS}
                    className="flex-1 btn bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500"
                    title="Envoyer SMS au client : Bruneau Protection : bonjour, nous avons bien pris connaissance de votre demande d'intervention. Merci d'enregistrer le numéro suivant comme 'technicien Bruneau Protection' afin d'être sûr de ne pas manquer notre appel : 0681082597"
                  >
                    {sendingSMS ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent" />
                        <span>Envoi...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>SMS</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Primary Actions */}
            <div className="flex flex-wrap gap-1.5">
              {!showBillingActions && request.status !== 'archivee' && (
                <>
                  {(!request.interventions || request.interventions.length === 0) && (
                    <button
                      onClick={handleActionWithScrollPreservation(() => onAddIntervention(request.id))}
                      className="flex-1 btn-success"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Saisir rapport</span>
                    </button>
                  )}
                </>
              )}

              {!showBillingActions && (request.status === 'nouvelle' || request.status === 'en_cours') && (
                <button
                  onClick={handleActionWithScrollPreservation(() => onMarkComplete(request.id))}
                  className="flex-1 btn bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500"
                >
                  SAV terminé
                </button>
              )}

              {!showBillingActions && request.status === 'terminee' && (
                <button
                  onClick={handleActionWithScrollPreservation(() => onArchive(request.id))}
                  className="flex-1 btn-secondary"
                >
                  Archiver
                </button>
              )}

              {showBillingActions && (
                <>
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
                </>
              )}
            </div>

            {/* Secondary Actions */}
            <div className="flex gap-1.5 pt-2 border-t border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(request.id);
                }}
                className="flex-1 btn-ghost"
              >
                Modifier
              </button>
              <button
                onClick={handleActionWithScrollPreservation(() => onAddIntervention(request.id))}
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
          </div>
        </div>
      )}

      {emailModalOpen && (
        <EmailReportModal
          request={request}
          interventionId={selectedInterventionId}
          onClose={() => {
            setEmailModalOpen(false);
            setSelectedInterventionId(undefined);
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
          clientName={request.client_name}
          ouvrageLibelle={request.site}
          onClose={() => setNomenclatureModalOpen(false)}
        />
      )}
    </div>
  );
};