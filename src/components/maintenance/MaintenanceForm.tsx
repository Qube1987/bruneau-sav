import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { X, Save, AlertTriangle, Battery, Euro, Building2, Users, Landmark, Calendar, User, Search } from 'lucide-react';
import { MaintenanceContract, SYSTEM_TYPES, BILLING_MODE_LABELS, CLIENT_TYPE_LABELS } from '../../types';
import { ClientSearch } from '../sav/ClientSearch';
import { useAuth } from '../../hooks/useAuth';
import { useSystemBrands } from '../../hooks/useSystemBrands';
import { BrandModelSelector } from '../common/BrandModelSelector';
import { supabase } from '../../lib/supabase';

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
  initialClientData?: {
    client_name?: string;
    phone?: string;
    address?: string;
  };
}

export const MaintenanceForm: React.FC<MaintenanceFormProps> = ({
  contract,
  users,
  onSubmit,
  onCancel,
  loading = false,
  extrabatData,
  onExtrabatDataChange,
  initialClientData
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

  // Inline Extrabat search states
  const [inlineExtrabatResults, setInlineExtrabatResults] = useState<any[]>([]);
  const [inlineSearchLoading, setInlineSearchLoading] = useState(false);
  const [showInlineResults, setShowInlineResults] = useState(false);
  const [inlineClientSelected, setInlineClientSelected] = useState(false);
  const inlineSearchRef = useRef<HTMLDivElement>(null);

  // Prefill client data when provided (from client records page)
  useEffect(() => {
    if (!contract && initialClientData) {
      if (initialClientData.client_name) {
        setValue('client_name', initialClientData.client_name);
        setInlineClientSelected(true);
      }
      if (initialClientData.phone) setValue('phone', initialClientData.phone);
      if (initialClientData.address) setValue('address', initialClientData.address);
    }
  }, [initialClientData, contract, setValue]);

  // Close inline results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inlineSearchRef.current && !inlineSearchRef.current.contains(event.target as Node)) {
        setShowInlineResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Inline Extrabat search when typing in client_name field
  useEffect(() => {
    if (inlineClientSelected || contract) return;

    const currentName = clientName || '';
    if (currentName.length < 3) {
      setInlineExtrabatResults([]);
      setShowInlineResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setInlineSearchLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
          body: {
            endpoint: 'clients',
            params: {
              q: currentName,
              include: 'telephone,adresse,adresse.interlocuteur'
            }
          }
        });

        if (!error && data?.success) {
          setInlineExtrabatResults(data.data || []);
          setShowInlineResults(true);
        }
      } catch (err) {
        console.error('Inline Extrabat search failed:', err);
      } finally {
        setInlineSearchLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [clientName, inlineClientSelected, contract]);

  const handleInlineClientSelect = (client: any) => {
    const fullName = `${client.civilite?.libelle || ''} ${client.prenom || ''} ${client.nom || ''}`.trim();
    setValue('client_name', fullName);
    setInlineClientSelected(true);
    setShowInlineResults(false);
    setInlineExtrabatResults([]);

    // Fill phone - check client first, then interlocuteurs
    let phoneSet = false;
    if (client.telephones && client.telephones.length > 0) {
      setValue('phone', client.telephones[0].number);
      phoneSet = true;
    }
    if (!phoneSet && client.adresses) {
      for (const addr of client.adresses) {
        if (addr.interlocuteur && Array.isArray(addr.interlocuteur)) {
          for (const interloc of addr.interlocuteur) {
            if (interloc.telephones?.length > 0) {
              setValue('phone', interloc.telephones[0].number);
              phoneSet = true;
              break;
            }
          }
        }
        if (phoneSet) break;
      }
    }

    // Fill address
    if (client.adresses && client.adresses.length > 0) {
      const addr = client.adresses[0];
      setValue('address', `${addr.description || ''}, ${addr.codePostal || ''} ${addr.ville || ''}`.trim());
    }

    // Update Extrabat data
    if (onExtrabatDataChange) {
      onExtrabatDataChange({
        clientId: client.id,
        ouvrageId: undefined
      });
    }
  };

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto pt-4 pb-4">
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl shadow-xl flex flex-col my-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:rounded-t-2xl z-10 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate pr-4">
              {contract ? 'Modifier le contrat de maintenance' : 'Nouveau contrat de maintenance'}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Extrabat Client Search - Only for new contracts */}
          {!contract && (
            <div className="px-4 sm:px-6 pt-4 sm:pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recherche client Extrabat
              </label>
              <ClientSearch onClientSelect={handleClientSelect} />
              <p className="text-xs text-gray-500 mt-1">
                Recherchez un client existant dans Extrabat pour pré-remplir les informations
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-6 flex flex-col min-h-full">
            <div className="flex-1 space-y-6">
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
                <div ref={inlineSearchRef}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du client *
                    {!contract && clientName && clientName.length > 0 && clientName.length < 3 && (
                      <span className="ml-2 text-xs text-gray-500 font-normal">
                        (tapez au moins 3 caractères pour rechercher)
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      {...register('client_name')}
                      onChange={(e) => {
                        setValue('client_name', e.target.value);
                        if (inlineClientSelected) {
                          setInlineClientSelected(false);
                        }
                      }}
                      className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors ${errors.client_name ? 'border-accent-300 focus:border-accent-500' : showInlineResults ? 'border-blue-400 bg-blue-50' : 'border-gray-300 focus:border-primary-500'
                        }`}
                      placeholder="Rechercher un client (nom ou société)..."
                      autoComplete="off"
                    />
                    {inlineSearchLoading && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                  {errors.client_name && (
                    <p className="mt-1 text-sm text-accent-600">{errors.client_name.message}</p>
                  )}

                  {/* Inline Extrabat search results */}
                  {showInlineResults && !contract && (
                    <div className="mt-1 relative z-20">
                      {inlineExtrabatResults.length > 0 ? (
                        <div className="absolute w-full bg-white border border-blue-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-700 font-medium">
                            {inlineExtrabatResults.length} résultat{inlineExtrabatResults.length > 1 ? 's' : ''} Extrabat
                          </div>
                          {inlineExtrabatResults.map((client: any) => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => handleInlineClientSelect(client)}
                              className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-gray-900">
                                    {client.civilite?.libelle || ''} {client.prenom} {client.nom}
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
                      ) : (clientName || '').length >= 3 && !inlineSearchLoading ? (
                        <div className="absolute w-full p-3 text-sm text-gray-500 text-center border border-gray-200 rounded-lg bg-gray-50">
                          Aucun client trouvé dans Extrabat pour "{clientName}"
                        </div>
                      ) : null}
                    </div>
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
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors ${errors.system_type ? 'border-accent-300 focus:border-accent-500' : 'border-gray-300 focus:border-primary-500'
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
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors ${errors.battery_installation_year ? 'border-accent-300 focus:border-accent-500' : 'border-gray-300 focus:border-primary-500'
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
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors ${errors.annual_amount ? 'border-accent-300 focus:border-accent-500' : 'border-gray-300 focus:border-primary-500'
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

            </div>

            {/* Actions */}
            <div className="sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-6 p-4 sm:p-6 bg-white border-t border-gray-200 mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sm:shadow-none z-10">
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium min-h-[44px]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 bg-primary-900 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
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
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};