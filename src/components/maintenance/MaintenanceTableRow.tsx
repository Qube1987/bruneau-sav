import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Clock, User, MapPin, Phone, AlertTriangle, CheckCircle, CreditCard as Edit, Calendar, FileText, Trash2, CreditCard as Edit3, X, Battery, Shield, Camera, Key, Flame, MessageCircle, Settings, Star, Package, CheckSquare, Square } from 'lucide-react';
import { MaintenanceContract } from '../../types';
import { PhotoSelector } from '../common/PhotoSelector';
import { useAuth } from '../../hooks/useAuth';

interface MaintenanceTableRowProps {
  contract: MaintenanceContract;
  onAddIntervention: (id: string) => void;
  onMarkCompleted: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onEditIntervention: (interventionId: string, contractId: string) => void;
  onDeleteIntervention: (interventionId: string) => void;
  onTogglePriority?: (id: string) => void;
  onRefresh?: () => void;
  onToggleInvoiceSent?: (id: string) => void;
  onToggleInvoicePaid?: (id: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'a_realiser': return 'bg-red-100 text-red-800 border-red-200';
    case 'prevue': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'realisee': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'a_realiser': return 'À réaliser';
    case 'prevue': return 'Prévue';
    case 'realisee': return 'Réalisée';
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

const getSystemTypeIcon = (type: string) => {
  switch (type) {
    case 'intrusion': return Shield;
    case 'video': return Camera;
    case 'controle_acces': return Key;
    case 'ssi': return Flame;
    case 'interphone': return MessageCircle;
    case 'portail': return Settings;
    case 'autre': return Settings;
    default: return Settings;
  }
};

const formatDate = (dateString: string) => {
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

export const MaintenanceTableRow: React.FC<MaintenanceTableRowProps> = ({
  contract,
  onAddIntervention,
  onMarkCompleted,
  onEdit,
  onDelete,
  onEditIntervention,
  onDeleteIntervention,
  onTogglePriority,
  onRefresh,
  onToggleInvoiceSent,
  onToggleInvoicePaid
}) => {
  const [expanded, setExpanded] = useState(false);
  const { canAccessBillingInfo } = useAuth();

  const handleDeleteIntervention = (interventionId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette intervention ?')) {
      onDeleteIntervention(interventionId);
    }
  };

  const handleDeleteContract = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le contrat de ${contract.client_name} ?`)) {
      onDelete(contract.id);
    }
  };

  const getKizeoFormId = (systemType: string) => {
    switch (systemType) {
      case 'ssi':
      case 'type4':
        return '997108';
      case 'intrusion':
        return '995261';
      case 'video':
        return '995663';
      case 'controle_acces':
      case 'interphone':
      case 'portail':
        return '996739';
      default:
        return '997108';
    }
  };

  const handleOpenKizeo = (e: React.MouseEvent) => {
    e.stopPropagation();
    const clientName = encodeURIComponent(contract.client_name || '');
    const address = encodeURIComponent(contract.address || '');
    const site = encodeURIComponent(contract.site || '');
    const formId = getKizeoFormId(contract.system_type);

    const kizeoUrl = `kizeoforms://--/forms/${formId}?nom=${clientName}&adresse=${address}&site=${site}`;

    window.location.href = kizeoUrl;
  };

  const handleActionWithScrollPreservation = (action: () => void) => {
    return (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      action();
    };
  };

  return (
    <div
      data-maintenance-id={contract.id}
      className={`border rounded-lg overflow-hidden ${
      contract.priority
        ? 'bg-red-900 border-red-800'
        : 'bg-white border-gray-200'
    }`}>
      {/* Condensed Row */}
      <div className={`flex items-center p-3 sm:p-4 cursor-pointer ${
        contract.priority ? 'hover:bg-red-800' : 'hover:bg-gray-50'
      }`} onClick={() => setExpanded(!expanded)}>
        {/* Expand/Collapse Button */}
        <button className="hidden sm:block mr-2 sm:mr-3 p-1 hover:bg-gray-200 rounded flex-shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </button>

        {/* Status */}
        <div className="hidden sm:flex items-center mr-2 sm:mr-4 min-w-0 flex-shrink-0 w-20 sm:w-32">
          <span className={`px-1 sm:px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(contract.status)}`}>
            <span className="hidden sm:inline">{getStatusLabel(contract.status)}</span>
            <span className="sm:hidden w-2 h-2 rounded-full inline-block"></span>
          </span>
          <div className="hidden sm:flex ml-1 sm:ml-2 w-4 h-4 items-center justify-center">
            {contract.priority && (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>

        {/* Client Name */}
        <div className="flex-1 min-w-0 mr-2 sm:mr-4">
          <div className={`font-medium truncate text-sm sm:text-base ${
            contract.priority ? 'text-white' : 'text-gray-900'
          }`}>{contract.client_name}</div>
          {contract.site && (
            <div className={`text-xs sm:text-sm truncate ${
              contract.priority ? 'text-red-200' : 'text-gray-500'
            }`}>{contract.site}</div>
          )}
        </div>

        {/* System Type */}
        <div className="hidden sm:flex items-center w-32 mr-4 flex-shrink-0">
          {React.createElement(getSystemTypeIcon(contract.system_type), {
            className: contract.priority ? 'h-4 w-4 mr-2 text-red-200' : 'h-4 w-4 mr-2 text-primary-600'
          })}
          <span className={`text-sm ${
            contract.priority ? 'text-red-100' : 'text-gray-700'
          }`}>{getSystemTypeLabel(contract.system_type)}</span>
        </div>

        {/* Battery Year */}
        <div className="hidden md:flex items-center w-24 mr-4 flex-shrink-0">
          <Battery className={`h-4 w-4 mr-1 ${
            contract.priority ? 'text-red-200' : 'text-gray-600'
          }`} />
          <span className={`text-sm ${
            contract.priority ? 'text-red-100' : 'text-gray-700'
          }`}>{contract.battery_installation_year || 'N/A'}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {onTogglePriority && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePriority(contract.id);
              }}
              className={`hidden sm:flex p-1 sm:p-2 rounded-lg transition-colors ${
                contract.priority
                  ? 'text-yellow-300 hover:text-yellow-400 hover:bg-red-800'
                  : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
              }`}
              title={contract.priority ? 'Retirer de prioritaire' : 'Marquer comme prioritaire'}
            >
              <Star className={`h-4 w-4 ${contract.priority ? 'fill-yellow-300' : ''}`} />
            </button>
          )}
          <button
            onClick={handleDeleteContract}
            className={`hidden sm:flex p-1 sm:p-2 rounded-lg transition-colors ${
              contract.priority
                ? 'text-red-200 hover:text-white hover:bg-red-800'
                : 'text-gray-400 hover:text-accent-600 hover:bg-accent-50'
            }`}
            title="Supprimer le contrat"
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
              {contract.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  <span className="text-sm">{contract.phone}</span>
                </div>
              )}
              {contract.address && (
                <div className="flex items-start text-gray-600">
                  <MapPin className="h-4 w-4 mr-2 mt-0.5" />
                  <span className="text-sm">{contract.address}</span>
                </div>
              )}
            </div>

            {/* System Information */}
            {(contract.system_brand || contract.system_model) && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Système
                </h4>
                <div className="text-sm text-gray-700">
                  {contract.system_brand}{contract.system_brand && contract.system_model && ' '}{contract.system_model}
                </div>
              </div>
            )}

            {/* Assignment & System Info */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Détails du contrat</h4>
              {contract.assigned_user && (
                <div className="flex items-center text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  <span className="text-sm">
                    Assigné à: {contract.assigned_user.display_name || contract.assigned_user.email}
                  </span>
                </div>
              )}
              <div className="flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                <span className="text-sm">Créé le {formatDate(contract.created_at)}</span>
              </div>
              {contract.battery_installation_year && (
                <div className="flex items-center text-gray-600">
                  <Battery className="h-4 w-4 mr-2" />
                  <span className="text-sm">Batteries: {contract.battery_installation_year}</span>
                </div>
              )}
            </div>
          </div>

          {/* Billing Section - Only visible to authorized users */}
          {canAccessBillingInfo && (
            <div className="border-t border-gray-200 pt-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-3">Facturation</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Facture/devis envoyé(e):</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleInvoiceSent?.(contract.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title={contract.invoice_sent ? "Marquer comme non envoyée" : "Marquer comme envoyée"}
                  >
                    {contract.invoice_sent ? (
                      <CheckSquare className="h-5 w-5 text-green-600" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Facture réglée:</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleInvoicePaid?.(contract.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title={contract.invoice_paid ? "Marquer comme non réglée" : "Marquer comme réglée"}
                  >
                    {contract.invoice_paid ? (
                      <CheckSquare className="h-5 w-5 text-green-600" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Interventions */}
          {contract.interventions && contract.interventions.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Interventions ({contract.interventions.length})
              </h4>
              <div className="space-y-3">
                {contract.interventions.map((intervention) => {
                  const interventionDate = new Date(intervention.started_at || intervention.scheduled_at);
                  const interventionYear = interventionDate.getFullYear();
                  const currentYear = new Date().getFullYear();
                  const isCurrentYear = interventionYear === currentYear;

                  return (
                  <div key={intervention.id} className="bg-white p-3 rounded border relative">
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        isCurrentYear
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-400 text-white'
                      }`}>
                        {interventionYear}
                      </span>
                    </div>
                    <div className="mb-3 pr-16">
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        {(intervention.started_at || intervention.scheduled_at) &&
                          formatDate(intervention.started_at || intervention.scheduled_at)}
                        {(intervention.ended_at || intervention.completed_at) && (
                          <span className="ml-2">
                            → {formatDate(intervention.ended_at || intervention.completed_at)}
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
                    {intervention.photos && intervention.photos.length > 0 && (
                      <PhotoSelector
                        photos={intervention.photos}
                        onPhotosUpdate={onRefresh}
                      />
                    )}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={handleOpenKizeo}
                        className="p-2.5 rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#55C96B' }}
                        title="Ouvrir dans Kizeo Forms"
                      >
                        <img
                          src="/logokizeo.png"
                          alt="Kizeo"
                          className="h-5 w-5"
                        />
                      </button>
                      <button
                        onClick={() => onEditIntervention(intervention.id, contract.id)}
                        className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        title="Modifier l'intervention"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteIntervention(intervention.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Supprimer l'intervention"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Mobile-only priority and delete buttons */}
            <div className="sm:hidden flex gap-2">
              {onTogglePriority && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePriority(contract.id);
                  }}
                  className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    contract.priority
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  <Star className={`h-4 w-4 mr-1 ${contract.priority ? 'fill-white' : ''}`} />
                  {contract.priority ? 'Retirer priorité' : 'Prioritaire'}
                </button>
              )}
              <button
                onClick={handleDeleteContract}
                className="flex items-center justify-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer
              </button>
            </div>

            {/* Primary Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleActionWithScrollPreservation(() => onAddIntervention(contract.id))}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
              >
                Ajouter intervention
              </button>

              <button
                onClick={handleActionWithScrollPreservation(() => onMarkCompleted(contract.id))}
                className={`px-4 py-2.5 text-white text-sm font-medium rounded-lg transition-colors shadow-sm ${
                  contract.status === 'realisee'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {contract.status === 'realisee' ? 'Marquer à faire' : 'Marquer réalisé'}
              </button>
            </div>

            {/* Secondary Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(contract.id);
                }}
                className="flex-1 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-300"
              >
                Modifier
              </button>
              <button
                onClick={handleDeleteContract}
                className="px-4 py-2 bg-white hover:bg-red-50 text-red-600 text-sm font-medium rounded-lg transition-colors border border-red-300"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};