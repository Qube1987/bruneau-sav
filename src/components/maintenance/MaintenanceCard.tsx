import React from 'react';
import { Clock, User, MapPin, Phone, AlertTriangle, CheckCircle, CreditCard as Edit, Calendar, FileText, Trash2, CreditCard as Edit3, X, Battery, Shield, Camera, Key, Flame, MessageCircle, Settings, Euro, CheckSquare, Square, Building2, Users, Landmark, Package, MessageSquare } from 'lucide-react';
import { MaintenanceContract, BILLING_MODE_LABELS, CLIENT_TYPE_LABELS } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { PhotoSelector } from '../common/PhotoSelector';
import { useSMS } from '../../hooks/useSMS';

interface MaintenanceCardProps {
  contract: MaintenanceContract;
  onAddIntervention: (id: string) => void;
  onMarkCompleted: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onEditIntervention: (interventionId: string, contractId: string) => void;
  onDeleteIntervention: (interventionId: string) => void;
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

export const MaintenanceCard: React.FC<MaintenanceCardProps> = ({
  contract,
  onAddIntervention,
  onMarkCompleted,
  onEdit,
  onDelete,
  onEditIntervention,
  onDeleteIntervention,
  onRefresh,
  onToggleInvoiceSent,
  onToggleInvoicePaid
}) => {
  const { canAccessBillingInfo } = useAuth();
  const [isSendingSMS, setIsSendingSMS] = React.useState(false);
  const { sendSMS } = useSMS();

  const handleDeleteIntervention = (interventionId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette intervention ?')) {
      onDeleteIntervention(interventionId);
    }
  };

  const handleDeleteContract = () => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le contrat de ${contract.client_name} ?`)) {
      onDelete(contract.id);
    }
  };

  const handleSendClientConfirmationSMS = async () => {
    if (!contract.phone) {
      alert('Aucun numéro de téléphone pour ce client');
      return;
    }

    setIsSendingSMS(true);
    try {
      const result = await sendSMS({
        to: contract.phone,
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

  return (
    <div
      data-maintenance-id={contract.id}
      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(contract.status)}`}>
              {getStatusLabel(contract.status)}
            </span>
            {contract.priority && (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onEdit(contract.id)}
              className="btn-icon text-gray-400 hover:text-primary-600 hover:bg-primary-50"
              title="Modifier le contrat"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={handleDeleteContract}
              className="btn-icon text-gray-400 hover:text-rose-600 hover:bg-rose-50"
              title="Supprimer le contrat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Client Info */}
        <div className="space-y-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{contract.client_name}</h3>
          
          {contract.site && (
            <div className="flex items-center text-gray-600">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{contract.site}</span>
            </div>
          )}

          {contract.phone && (
            <div className="flex items-center justify-between text-gray-600">
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="text-sm">{contract.phone}</span>
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

          {contract.address && (
            <div className="flex items-start text-gray-600">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{contract.address}</span>
            </div>
          )}
        </div>

        {/* System Information */}
        {(contract.system_brand || contract.system_model) && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center text-blue-800">
              <Package className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm font-medium">Système</span>
            </div>
            <div className="ml-6 text-sm text-gray-700">
              {contract.system_brand}{contract.system_brand && contract.system_model && ' '}{contract.system_model}
            </div>
          </div>
        )}

        {/* System & Battery Info */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Système:</span>
            <div className="flex items-center">
              {React.createElement(getSystemTypeIcon(contract.system_type), { 
                className: "h-4 w-4 mr-2 text-primary-600" 
              })}
              <span className="text-sm text-gray-900">{getSystemTypeLabel(contract.system_type)}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Batteries installées:</span>
            <div className="flex items-center">
              <Battery className="h-4 w-4 mr-1 text-gray-600" />
              <span className="text-sm text-gray-900">{contract.battery_installation_year}</span>
            </div>
          </div>
        </div>

        {/* Billing & Client Info - Only visible to authorized users */}
        {canAccessBillingInfo && (
          <div className="border-t border-gray-100 pt-4 mb-4 space-y-3">
            {/* Client Type */}
            {contract.client_type && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Type de client:</span>
                <div className="flex items-center">
                  {contract.client_type === 'particulier' && <Users className="h-4 w-4 mr-2 text-blue-600" />}
                  {contract.client_type === 'pro' && <Building2 className="h-4 w-4 mr-2 text-purple-600" />}
                  {contract.client_type === 'collectivite' && <Landmark className="h-4 w-4 mr-2 text-green-600" />}
                  <span className="text-sm text-gray-900">{CLIENT_TYPE_LABELS[contract.client_type]}</span>
                </div>
              </div>
            )}

            {/* Annual Amount */}
            {contract.annual_amount !== undefined && contract.annual_amount !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Montant annuel HT:</span>
                <div className="flex items-center">
                  <Euro className="h-4 w-4 mr-1 text-green-600" />
                  <span className="text-sm font-semibold text-gray-900">{contract.annual_amount.toFixed(2)} €</span>
                </div>
              </div>
            )}

            {/* Billing Mode */}
            {contract.billing_mode && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Mode de facturation:</span>
                <span className="text-sm text-gray-900">{BILLING_MODE_LABELS[contract.billing_mode]}</span>
              </div>
            )}

            {/* Last Year Visit */}
            {contract.last_year_visit_date && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Visite année précédente:</span>
                <span className="text-sm text-gray-900">
                  {new Date(contract.last_year_visit_date).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}

            {/* Invoice Status */}
            <div className="flex items-center justify-between">
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

            <div className="flex items-center justify-between">
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
        )}

        {/* Assignment */}
        {contract.assigned_user && (
          <div className="flex items-center text-gray-600 mb-4">
            <User className="h-4 w-4 mr-2" />
            <span className="text-sm">
              Assigné à: {contract.assigned_user.display_name || contract.assigned_user.email}
            </span>
          </div>
        )}

        {/* Interventions */}
        {contract.interventions && contract.interventions.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Interventions ({contract.interventions.length})
            </h4>
            <div className="space-y-3">
              {contract.interventions.map((intervention) => {
                const interventionDate = new Date(intervention.started_at || intervention.scheduled_at);
                const interventionYear = interventionDate.getFullYear();
                const currentYear = new Date().getFullYear();
                const isCurrentYear = interventionYear === currentYear;

                return (
                <div key={intervention.id} className="bg-gray-50 p-3 rounded-lg relative border border-gray-200">
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
                      className="btn-ghost text-slate-600 hover:bg-slate-50 btn-sm"
                      title="Modifier l'intervention"
                    >
                      <Edit3 className="h-3 w-3" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteIntervention(intervention.id)}
                      className="btn-ghost text-red-600 hover:bg-red-50 btn-sm"
                      title="Supprimer l'intervention"
                    >
                      <Trash2 className="h-3 w-3" />
                      Supprimer
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="text-xs text-gray-500 space-y-1 mb-4">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Créé le {formatDate(contract.created_at)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 mt-4">
          <button
            onClick={() => onAddIntervention(contract.id)}
            className="flex-1 btn-primary"
          >
            + Intervention
          </button>

          <button
            onClick={() => onMarkCompleted(contract.id)}
            className={contract.status === 'realisee' ? 'flex-1 btn-warning' : 'flex-1 btn-success'}
          >
            {contract.status === 'realisee' ? 'À faire' : 'Réalisé'}
          </button>
        </div>
      </div>
    </div>
  );
};