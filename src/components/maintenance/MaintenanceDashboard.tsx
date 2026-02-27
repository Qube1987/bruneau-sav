import React, { useMemo, useState } from 'react';
import { ArrowLeft, Euro, TrendingUp, AlertCircle, CheckCircle, Users, Building2, Landmark, FileText, Calendar, X, Phone, MapPin } from 'lucide-react';
import { MaintenanceContract, BILLING_MODE_LABELS, CLIENT_TYPE_LABELS } from '../../types';

interface MaintenanceDashboardProps {
  contracts: MaintenanceContract[];
  onBack: () => void;
}

interface DashboardStats {
  totalAmount: number;
  januaryCollection: number;
  remainingToInvoice: number;
  remainingToCollect: number;
  totalContracts: number;
  byClientType: {
    particulier: number;
    pro: number;
    collectivite: number;
  };
  byBillingMode: {
    debut_annee: number;
    grenke: number;
    sur_devis: number;
    apres_visite: number;
  };
  invoicedCount: number;
  paidCount: number;
  completedVisits: number;
}

export const MaintenanceDashboard: React.FC<MaintenanceDashboardProps> = ({ contracts, onBack }) => {
  const [modalType, setModalType] = useState<'january' | 'to_invoice' | 'to_collect' | null>(null);

  const stats = useMemo<DashboardStats>(() => {
    const result: DashboardStats = {
      totalAmount: 0,
      januaryCollection: 0,
      remainingToInvoice: 0,
      remainingToCollect: 0,
      totalContracts: contracts.length,
      byClientType: {
        particulier: 0,
        pro: 0,
        collectivite: 0,
      },
      byBillingMode: {
        debut_annee: 0,
        grenke: 0,
        sur_devis: 0,
        apres_visite: 0,
      },
      invoicedCount: 0,
      paidCount: 0,
      completedVisits: 0,
    };

    contracts.forEach(contract => {
      const amount = contract.annual_amount || 0;

      result.totalAmount += amount;

      if (contract.billing_mode === 'debut_annee') {
        result.januaryCollection += amount;
      }

      if (contract.billing_mode === 'apres_visite' && !contract.invoice_sent) {
        result.remainingToInvoice += amount;
      }

      if (contract.invoice_sent && !contract.invoice_paid) {
        result.remainingToCollect += amount;
      }

      if (contract.client_type) {
        result.byClientType[contract.client_type]++;
      }

      if (contract.billing_mode) {
        result.byBillingMode[contract.billing_mode]++;
      }

      if (contract.invoice_sent) {
        result.invoicedCount++;
      }

      if (contract.invoice_paid) {
        result.paidCount++;
      }

      if (contract.status === 'realisee') {
        result.completedVisits++;
      }
    });

    return result;
  }, [contracts]);

  const getFilteredContracts = (type: 'january' | 'to_invoice' | 'to_collect'): MaintenanceContract[] => {
    switch (type) {
      case 'january':
        return contracts.filter(c => c.billing_mode === 'debut_annee');
      case 'to_invoice':
        return contracts.filter(c => c.billing_mode === 'apres_visite' && !c.invoice_sent);
      case 'to_collect':
        return contracts.filter(c => c.invoice_sent && !c.invoice_paid);
      default:
        return [];
    }
  };

  const getModalTitle = (type: 'january' | 'to_invoice' | 'to_collect'): string => {
    switch (type) {
      case 'january':
        return 'Contrats à collecter en janvier';
      case 'to_invoice':
        return 'Contrats à facturer';
      case 'to_collect':
        return 'Contrats à collecter';
      default:
        return '';
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ElementType;
    iconColor: string;
    bgColor: string;
    subtitle?: string;
    onClick?: () => void;
    clickable?: boolean;
  }> = ({ title, value, icon: Icon, iconColor, bgColor, subtitle, onClick, clickable = false }) => {
    const content = (
      <>
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${bgColor} ${clickable ? 'cursor-pointer group-hover:scale-110 transition-transform' : ''}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </>
    );

    if (clickable && onClick) {
      return (
        <button
          onClick={onClick}
          className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-primary-300 transition-all text-left w-full"
        >
          {content}
        </button>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        {content}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Retour à la liste"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Maintenance</h1>
            <p className="text-sm text-gray-600 mt-1">Vue d'ensemble des contrats et de la facturation</p>
          </div>
        </div>
      </div>

      {/* Main Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Montant total des contrats"
          value={`${stats.totalAmount.toFixed(2)} €`}
          icon={Euro}
          iconColor="text-green-600"
          bgColor="bg-green-50"
          subtitle="Chiffre d'affaires annuel total"
        />
        <StatCard
          title="À collecter en janvier"
          value={`${stats.januaryCollection.toFixed(2)} €`}
          icon={TrendingUp}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
          subtitle={`${stats.byBillingMode.debut_annee} contrats`}
          clickable={true}
          onClick={() => setModalType('january')}
        />
        <StatCard
          title="Reste à facturer"
          value={`${stats.remainingToInvoice.toFixed(2)} €`}
          icon={AlertCircle}
          iconColor="text-orange-600"
          bgColor="bg-orange-50"
          subtitle="Après la visite"
          clickable={true}
          onClick={() => setModalType('to_invoice')}
        />
        <StatCard
          title="Reste à collecter"
          value={`${stats.remainingToCollect.toFixed(2)} €`}
          icon={FileText}
          iconColor="text-purple-600"
          bgColor="bg-purple-50"
          subtitle="Factures envoyées non réglées"
          clickable={true}
          onClick={() => setModalType('to_collect')}
        />
      </div>

      {/* Contract Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total contrats"
          value={stats.totalContracts}
          icon={FileText}
          iconColor="text-gray-600"
          bgColor="bg-gray-50"
        />
        <StatCard
          title="Factures envoyées"
          value={stats.invoicedCount}
          icon={CheckCircle}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
          subtitle={`${((stats.invoicedCount / stats.totalContracts) * 100).toFixed(1)}% du total`}
        />
        <StatCard
          title="Factures réglées"
          value={stats.paidCount}
          icon={CheckCircle}
          iconColor="text-green-600"
          bgColor="bg-green-50"
          subtitle={`${((stats.paidCount / stats.totalContracts) * 100).toFixed(1)}% du total`}
        />
      </div>

      {/* Detailed Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Type Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-gray-600" />
            Répartition par type de client
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-blue-600 mr-3" />
                <span className="font-medium text-gray-900">{CLIENT_TYPE_LABELS.particulier}</span>
              </div>
              <span className="text-lg font-bold text-blue-600">{stats.byClientType.particulier}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <Building2 className="h-5 w-5 text-purple-600 mr-3" />
                <span className="font-medium text-gray-900">{CLIENT_TYPE_LABELS.pro}</span>
              </div>
              <span className="text-lg font-bold text-purple-600">{stats.byClientType.pro}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <Landmark className="h-5 w-5 text-green-600 mr-3" />
                <span className="font-medium text-gray-900">{CLIENT_TYPE_LABELS.collectivite}</span>
              </div>
              <span className="text-lg font-bold text-green-600">{stats.byClientType.collectivite}</span>
            </div>
          </div>
        </div>

        {/* Billing Mode Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Euro className="h-5 w-5 mr-2 text-gray-600" />
            Répartition par mode de facturation
          </h2>
          <div className="space-y-4">
            {Object.entries(stats.byBillingMode).map(([key, count]) => {
              const colors = {
                debut_annee: { bg: 'bg-blue-50', text: 'text-blue-600' },
                grenke: { bg: 'bg-purple-50', text: 'text-purple-600' },
                sur_devis: { bg: 'bg-orange-50', text: 'text-orange-600' },
                apres_visite: { bg: 'bg-green-50', text: 'text-green-600' },
              };
              const color = colors[key as keyof typeof colors];
              return (
                <div key={key} className={`flex items-center justify-between p-3 ${color.bg} rounded-lg`}>
                  <span className="font-medium text-gray-900">
                    {BILLING_MODE_LABELS[key as keyof typeof BILLING_MODE_LABELS]}
                  </span>
                  <span className={`text-lg font-bold ${color.text}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Visit Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-gray-600" />
          Progression des visites
        </h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Visites réalisées</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.completedVisits} / {stats.totalContracts} ({((stats.completedVisits / stats.totalContracts) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all"
                style={{ width: `${(stats.completedVisits / stats.totalContracts) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Factures réglées</span>
              <span className="text-sm font-semibold text-gray-900">
                {stats.paidCount} / {stats.totalContracts} ({((stats.paidCount / stats.totalContracts) * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{ width: `${(stats.paidCount / stats.totalContracts) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Contract List */}
      {modalType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{getModalTitle(modalType)}</h2>
              <button
                onClick={() => setModalType(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-6">
              {getFilteredContracts(modalType).length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">Aucun contrat trouvé</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredContracts(modalType).map((contract) => (
                    <div
                      key={contract.id}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {contract.client_name}
                          </h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {contract.site && (
                              <div className="flex items-center text-gray-600">
                                <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span>{contract.site}</span>
                              </div>
                            )}

                            {contract.phone && (
                              <div className="flex items-center text-gray-600">
                                <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span>{contract.phone}</span>
                              </div>
                            )}

                            {contract.address && (
                              <div className="flex items-start text-gray-600 md:col-span-2">
                                <MapPin className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                                <span>{contract.address}</span>
                              </div>
                            )}

                            {contract.client_type && (
                              <div className="flex items-center text-gray-600">
                                {contract.client_type === 'particulier' && <Users className="h-4 w-4 mr-2 text-blue-600" />}
                                {contract.client_type === 'pro' && <Building2 className="h-4 w-4 mr-2 text-purple-600" />}
                                {contract.client_type === 'collectivite' && <Landmark className="h-4 w-4 mr-2 text-green-600" />}
                                <span>{CLIENT_TYPE_LABELS[contract.client_type]}</span>
                              </div>
                            )}

                            {contract.billing_mode && (
                              <div className="flex items-center text-gray-600">
                                <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                                <span>{BILLING_MODE_LABELS[contract.billing_mode]}</span>
                              </div>
                            )}
                          </div>

                          {contract.observations && (
                            <div className="mt-3 text-sm">
                              <p className="text-gray-600 bg-white p-2 rounded border border-gray-200">
                                {contract.observations}
                              </p>
                            </div>
                          )}
                        </div>

                        {contract.annual_amount !== undefined && contract.annual_amount !== null && (
                          <div className="ml-4 text-right">
                            <div className="flex items-center justify-end mb-1">
                              <Euro className="h-5 w-5 mr-1 text-green-600" />
                              <span className="text-2xl font-bold text-gray-900">
                                {contract.annual_amount.toFixed(2)} €
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">HT</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer with Total */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  Total: {getFilteredContracts(modalType).length} contrat(s)
                </span>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-600 mr-2">Montant total:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {getFilteredContracts(modalType)
                      .reduce((sum, c) => sum + (c.annual_amount || 0), 0)
                      .toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
