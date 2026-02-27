import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { X, Save, AlertTriangle, Battery, Euro, Building2, Users, Landmark, Calendar } from 'lucide-react';
import { MaintenanceContract, SYSTEM_TYPES, BILLING_MODE_LABELS, CLIENT_TYPE_LABELS } from '../../types';
import { ClientSearch } from '../sav/ClientSearch';
import { useAuth } from '../../hooks/useAuth';
import { useSystemBrands } from '../../hooks/useSystemBrands';
import { BrandModelSelector } from '../common/BrandModelSelector';

const schema = yup.object({
  client_name: yup.string().required('Le nom du client est obligatoire'),
  site: yup.string(),
  phone: yup.string(),
  address: yup.string(),
  system_brand: yup.string(),
  system_model: yup.string(),
  system_type: yup.string().required('Le type de système est obligatoire'),
  battery_installation_year: yup.number().nullable().transform((value, originalValue) => {
    return originalValue === '' ? null : value;
  }).min(1990, 'L\'année doit être supérieure à 1990').max(new Date().getFullYear(), 'L\'année ne peut pas être dans le futur'),
  observations: yup.string(),
  assigned_user_id: yup.string(),
  priority: yup.boolean(),
  annual_amount: yup.number().min(0, 'Le montant doit être positif').nullable().transform((value, originalValue) => originalValue === '' ? null : value),
  billing_mode: yup.string(),
  invoice_sent: yup.boolean(),
  invoice_paid: yup.boolean(),
  client_type: yup.string(),
  last_year_visit_date: yup.string()
});

type FormData = yup.InferType<typeof schema>;

interface MaintenanceFormProps {
  contract?: MaintenanceContract;
  users: Array<{ id: string; display_name: string | null; email: string; phone: string | null }>;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  loading?: boolean;
  extrabatData?: {
    clientId?: number;
    ouvrageId?: number;
  };
  onExtrabatDataChange?: (data: { clientId?: number; ouvrageId?: number }) => void;
}

export const MaintenanceForm: React.FC<MaintenanceFormProps> = ({
  contract,
  users,
  onSubmit,
  onCancel,
  loading = false,
  extrabatData,
  onExtrabatDataChange
}) => {
  const { canAccessBillingInfo } = useAuth();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: contract ? {
      client_name: contract.client_name,
      site: contract.site || '',
      phone: contract.phone || '',
      address: contract.address || '',
      system_brand: contract.system_brand || '',
      system_model: contract.system_model || '',
      system_type: contract.system_type || '',
      battery_installation_year: contract.battery_installation_year || '',
      observations: contract.observations || '',
      assigned_user_id: contract.assigned_user_id || '',
      priority: contract.priority,
      annual_amount: contract.annual_amount || undefined,
      billing_mode: contract.billing_mode || 'debut_annee',
      invoice_sent: contract.invoice_sent || false,
      invoice_paid: contract.invoice_paid || false,
      client_type: contract.client_type || 'particulier',
      last_year_visit_date: contract.last_year_visit_date || ''
    } : {
      system_brand: '',
      system_model: '',
      billing_mode: 'debut_annee',
      invoice_sent: false,
      invoice_paid: false,
      client_type: 'particulier'
    }
  });

  const { fetchSystemInfoForClient } = useSystemBrands();

  const isPriority = watch('priority');
  const systemBrand = watch('system_brand');
  const systemModel = watch('system_model');
  const clientName = watch('client_name');
  const systemType = watch('system_type');

  useEffect(() => {
    if (!contract && clientName && systemType) {
      const loadSystemInfo = async () => {
        const systemInfo = await fetchSystemInfoForClient(clientName, systemType);
        if (systemInfo) {
          setValue('system_brand', systemInfo.system_brand);
          if (systemInfo.system_model) {
            setValue('system_model', systemInfo.system_model);
          }
        }
      };
      loadSystemInfo();
    }
  }, [clientName, systemType, contract, fetchSystemInfoForClient, setValue]);

  const handleClientSelect = (clientData: {
    clientName: string;
    phone?: string;
    address?: string;
    ouvrageId?: number;
    extrabatClientId: number;
  }) => {
    // Fill form fields
    setValue('client_name', clientData.clientName);
    if (clientData.phone) {
      setValue('phone', clientData.phone);
    }
    if (clientData.address) {
      setValue('address', clientData.address);
    }

    // Update Extrabat data
    if (onExtrabatDataChange) {
      onExtrabatDataChange({
        clientId: clientData.extrabatClientId,
        ouvrageId: clientData.ouvrageId
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] my-8 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {contract ? 'Modifier le contrat de maintenance' : 'Nouveau contrat de maintenance'}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Extrabat Client Search - Only for new contracts */}
        {!contract && (
          <div className="px-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recherche client Extrabat
            </label>
            <ClientSearch onClientSelect={handleClientSelect} />
            <p className="text-xs text-gray-500 mt-1">
              Recherchez un client existant dans Extrabat pour pré-remplir les informations
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Priority Toggle */}
          <div className={`p-4 rounded-lg border-2 ${isPriority ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-accent-500 focus:ring-accent-500 h-5 w-5"
                {...register('priority')}
              />
              <div className="ml-3 flex items-center">
                <AlertTriangle className={`h-5 w-5 mr-2 ${isPriority ? 'text-accent-600' : 'text-gray-400'}`} />
                <span className={`font-medium ${isPriority ? 'text-accent-800' : 'text-gray-700'}`}>
                  Contrat prioritaire
                </span>
              </div>
            </label>
            {isPriority && (
              <p className="mt-2 text-sm text-accent-700">
                Les contrats prioritaires apparaissent en tête de liste.
              </p>
            )}
          </div>

          {/* Client Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du client *
              </label>
              <input
                type="text"
                {...register('client_name')}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors ${
                  errors.client_name ? 'border-accent-300 focus:border-accent-500' : 'border-gray-300 focus:border-primary-500'
                }`}
                placeholder="Nom du client ou de la société"
              />
              {errors.client_name && (
                <p className="mt-1 text-sm text-accent-600">{errors.client_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Site
              </label>
              <input
                type="text"
                {...register('site')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="Nom du site ou bâtiment"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                {...register('phone')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="+33123456789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse complète
              </label>
              <input
                type="text"
                {...register('address')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                placeholder="Adresse complète avec ville"
              />
            </div>
          </div>

          {/* System Information */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations système</h3>
            <BrandModelSelector
              brandValue={systemBrand || ''}
              modelValue={systemModel || ''}
              onBrandChange={(value) => setValue('system_brand', value)}
              onModelChange={(value) => setValue('system_model', value)}
              brandError={errors.system_brand?.message}
              modelError={errors.system_model?.message}
            />
          </div>

          {/* System Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de système *
            </label>
            <select
              {...register('system_type')}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors ${
                errors.system_type ? 'border-accent-300 focus:border-accent-500' : 'border-gray-300 focus:border-primary-500'
              }`}
            >
              <option value="">Sélectionner un type</option>
              {Object.entries(SYSTEM_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            {errors.system_type && (
              <p className="mt-1 text-sm text-accent-600">{errors.system_type.message}</p>
            )}
          </div>

          {/* Battery Installation Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Battery className="h-4 w-4 inline mr-2" />
                Année d'installation des batteries
              </label>
              <input
                type="number"
                min="1990"
                max={new Date().getFullYear()}
                {...register('battery_installation_year')}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors ${
                  errors.battery_installation_year ? 'border-accent-300 focus:border-accent-500' : 'border-gray-300 focus:border-primary-500'
                }`}
                placeholder="Optionnel - ex: 2020"
              />
              {errors.battery_installation_year && (
                <p className="mt-1 text-sm text-accent-600">{errors.battery_installation_year.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigner à
              </label>
              <select
                {...register('assigned_user_id')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              >
                <option value="">Non assigné</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.display_name || user.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Billing Information - Only visible to authorized users */}
          {canAccessBillingInfo && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Euro className="h-5 w-5 mr-2 text-green-600" />
                Informations de facturation
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de client
                  </label>
                  <select
                    {...register('client_type')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  >
                    {Object.entries(CLIENT_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Annual Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant annuel HT (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('annual_amount')}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors ${
                      errors.annual_amount ? 'border-accent-300 focus:border-accent-500' : 'border-gray-300 focus:border-primary-500'
                    }`}
                    placeholder="Ex: 250.00"
                  />
                  {errors.annual_amount && (
                    <p className="mt-1 text-sm text-accent-600">{errors.annual_amount.message}</p>
                  )}
                </div>

                {/* Billing Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mode de facturation
                  </label>
                  <select
                    {...register('billing_mode')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  >
                    {Object.entries(BILLING_MODE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Last Year Visit Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Date de visite année précédente
                  </label>
                  <input
                    type="date"
                    {...register('last_year_visit_date')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  />
                </div>
              </div>

              {/* Invoice Status Checkboxes */}
              <div className="mt-6 space-y-4">
                <label className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-5 w-5"
                    {...register('invoice_sent')}
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Facture/devis envoyé(e)
                  </span>
                </label>

                <label className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-5 w-5"
                    {...register('invoice_paid')}
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700">
                    Facture réglée
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-primary-900 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>{contract ? 'Mettre à jour' : 'Créer le contrat'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};