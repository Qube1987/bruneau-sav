import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { X, Save, AlertTriangle, Sparkles, Zap, Clock, MessageSquare } from 'lucide-react';
import { SavRequest, SYSTEM_TYPES } from '../../types';
import { ClientSearch } from './ClientSearch';
import { useAIReformulation } from '../../hooks/useAIReformulation';
import { useSystemBrands } from '../../hooks/useSystemBrands';
import { BrandModelSelector } from '../common/BrandModelSelector';
import { useSMS } from '../../hooks/useSMS';

const schema = yup.object({
  client_name: yup.string().required('Le nom du client est obligatoire'),
  site: yup.string(),
  client_email: yup.string().email('Email invalide'),
  phone: yup.string(),
  address: yup.string(),
  system_type: yup.string().required('Le type de système est obligatoire'),
  system_brand: yup.string(),
  system_model: yup.string(),
  problem_desc: yup.string().required('La description du problème est obligatoire'),
  problem_desc_reformule: yup.string(),
  observations: yup.string(),
  rapport_brut: yup.string(),
  rapport_reformule: yup.string(),
  assigned_user_id: yup.string(),
  urgent: yup.boolean(),
  is_quick_intervention: yup.boolean(),
  is_long_intervention: yup.boolean()
});

type FormData = yup.InferType<typeof schema>;

interface SavFormProps {
  request?: SavRequest;
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

export const SavForm: React.FC<SavFormProps> = ({
  request,
  users,
  onSubmit,
  onCancel,
  loading = false,
  extrabatData,
  onExtrabatDataChange
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: request ? {
      client_name: request.client_name,
      site: request.site || '',
      client_email: request.client_email || '',
      phone: request.phone || '',
      address: request.address || '',
      system_type: request.system_type || '',
      system_brand: request.system_brand || '',
      system_model: request.system_model || '',
      problem_desc: request.problem_desc,
      problem_desc_reformule: request.problem_desc_reformule || '',
      observations: request.observations || '',
      rapport_brut: request.rapport_brut || '',
      rapport_reformule: request.rapport_reformule || '',
      assigned_user_id: request.assigned_user_id || '',
      urgent: request.urgent,
      is_quick_intervention: request.is_quick_intervention || false,
      is_long_intervention: request.is_long_intervention || false
    } : {
      client_name: '',
      site: '',
      client_email: '',
      phone: '',
      address: '',
      system_type: '',
      system_brand: '',
      system_model: '',
      problem_desc: '',
      problem_desc_reformule: '',
      observations: '',
      rapport_brut: '',
      rapport_reformule: '',
      assigned_user_id: '',
      urgent: false,
      is_quick_intervention: false,
      is_long_intervention: false
    }
  });

  const { reformulateReport, reformulateDescription, loading: aiLoading, error: aiError } = useAIReformulation();
  const { fetchSystemInfoForClient } = useSystemBrands();
  const { sendSMS } = useSMS();
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [problemDescAiMessage, setProblemDescAiMessage] = useState<string | null>(null);
  const [problemDescValidated, setProblemDescValidated] = useState(
    request?.problem_desc_reformule ? true : false
  );
  const [rapportValidated, setRapportValidated] = useState(
    request?.rapport_reformule ? true : false
  );
  const [sendingSMS, setSendingSMS] = useState(false);

  const isUrgent = watch('urgent');
  const isQuickIntervention = watch('is_quick_intervention');
  const isLongIntervention = watch('is_long_intervention');
  const rapportBrut = watch('rapport_brut');
  const rapportReformule = watch('rapport_reformule');
  const problemDesc = watch('problem_desc');
  const problemDescReformule = watch('problem_desc_reformule');
  const systemBrand = watch('system_brand');
  const systemModel = watch('system_model');
  const clientName = watch('client_name');
  const systemType = watch('system_type');
  const phone = watch('phone');
  const assignedUserId = watch('assigned_user_id');

  const handleProblemDescReformulation = async () => {
    const currentProblemDesc = problemDesc || '';

    if (!currentProblemDesc.trim()) {
      setProblemDescAiMessage('La description du problème est vide');
      return;
    }

    setProblemDescValidated(false);
    setProblemDescAiMessage(null);
    const result = await reformulateDescription(currentProblemDesc);

    if (result) {
      setValue('problem_desc_reformule', result);
      setProblemDescAiMessage('Description reformulée avec succès !');
      setTimeout(() => setProblemDescAiMessage(null), 3000);
    }
  };

  const handleProblemDescValidation = () => {
    if (problemDescReformule?.trim()) {
      setProblemDescValidated(true);
      setProblemDescAiMessage('Reformulation validée !');
      setTimeout(() => setProblemDescAiMessage(null), 3000);
    }
  };

  const handleRapportValidation = () => {
    if (rapportReformule?.trim()) {
      setRapportValidated(true);
      setAiMessage('Reformulation validée !');
      setTimeout(() => setAiMessage(null), 3000);
    }
  };

  const handleAIReformulation = async () => {
    const currentRapportBrut = rapportBrut || '';

    if (!currentRapportBrut.trim()) {
      setAiMessage('Le rapport brut est vide');
      return;
    }

    setRapportValidated(false);
    setAiMessage(null);
    const result = await reformulateReport(currentRapportBrut);

    if (result) {
      setValue('rapport_reformule', result);
      setAiMessage('Rapport reformulé avec succès !');
      setTimeout(() => setAiMessage(null), 3000);
    }
  };

  useEffect(() => {
    if (!request && clientName && systemType) {
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
  }, [clientName, systemType, request, fetchSystemInfoForClient, setValue]);

  const handleClientSelect = (clientData: {
    clientName: string;
    email?: string;
    phone?: string;
    address?: string;
    ouvrageId?: number;
    extrabatClientId: number;
  }) => {
    setValue('client_name', clientData.clientName);
    if (clientData.email) {
      setValue('client_email', clientData.email);
    }
    if (clientData.phone) {
      setValue('phone', clientData.phone);
    }
    if (clientData.address) {
      setValue('address', clientData.address);
    }

    if (onExtrabatDataChange) {
      onExtrabatDataChange({
        clientId: clientData.extrabatClientId,
        ouvrageId: clientData.ouvrageId
      });
    }
  };

  const handleFormSubmit = (data: FormData) => {
    onSubmit(data);
  };

  const handleSendTestSMS = async () => {
    if (!phone) {
      alert('Veuillez saisir un numéro de téléphone');
      return;
    }

    if (!clientName) {
      alert('Veuillez saisir un nom de client');
      return;
    }

    if (!confirm(`Envoyer un SMS de confirmation à ${phone} ?`)) {
      return;
    }

    setSendingSMS(true);
    try {
      const message = `Bruneau Protection : bonjour, nous avons bien pris connaissance de votre demande d'intervention. Merci d'enregistrer le numéro suivant comme "technicien Bruneau Protection" afin d'être sûr de ne pas manquer notre appel : 0681082597`;

      const result = await sendSMS({
        to: phone,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] my-8 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {request ? 'Modifier la demande SAV' : 'Nouvelle demande SAV'}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Extrabat Client Search - Only for new requests */}
        {!request && (
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

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
          {/* Priority Toggle */}
          <div className={`p-4 rounded-lg border-2 ${isUrgent ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 h-5 w-5"
                {...register('urgent')}
              />
              <div className="ml-3 flex items-center">
                <AlertTriangle className={`h-5 w-5 mr-2 ${isUrgent ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`font-medium ${isUrgent ? 'text-blue-800' : 'text-gray-700'}`}>
                  Demande prioritaire
                </span>
              </div>
            </label>
            {isUrgent && (
              <p className="mt-2 text-sm text-blue-700">
                Les demandes prioritaires apparaissent en tête de liste et sont marquées d'une étoile bleue.
              </p>
            )}
          </div>

          {/* Quick/Long Intervention Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quick Intervention */}
            <div className={`p-4 rounded-lg border-2 ${isQuickIntervention ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-500 focus:ring-blue-500 h-5 w-5"
                  {...register('is_quick_intervention')}
                />
                <div className="ml-3 flex items-center">
                  <Zap className={`h-5 w-5 mr-2 ${isQuickIntervention ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`font-medium ${isQuickIntervention ? 'text-blue-800' : 'text-gray-700'}`}>
                    Intervention rapide
                  </span>
                </div>
              </label>
              {isQuickIntervention && (
                <p className="mt-2 text-sm text-blue-700">
                  Indicateur visuel uniquement (n'affecte pas le classement).
                </p>
              )}
            </div>

            {/* Long Intervention */}
            <div className={`p-4 rounded-lg border-2 ${isLongIntervention ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-purple-500 focus:ring-purple-500 h-5 w-5"
                  {...register('is_long_intervention')}
                />
                <div className="ml-3 flex items-center">
                  <Clock className={`h-5 w-5 mr-2 ${isLongIntervention ? 'text-purple-600' : 'text-gray-400'}`} />
                  <span className={`font-medium ${isLongIntervention ? 'text-purple-800' : 'text-gray-700'}`}>
                    Intervention longue
                  </span>
                </div>
              </label>
              {isLongIntervention && (
                <p className="mt-2 text-sm text-purple-700">
                  Indicateur visuel uniquement (n'affecte pas le classement).
                </p>
              )}
            </div>
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
                Email
              </label>
              <input
                type="email"
                {...register('client_email')}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors ${
                  errors.client_email ? 'border-accent-300 focus:border-accent-500' : 'border-gray-300 focus:border-primary-500'
                }`}
                placeholder="email@example.com"
              />
              {errors.client_email && (
                <p className="mt-1 text-sm text-accent-600">{errors.client_email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  {...register('phone')}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="+33123456789"
                />
                {phone && (
                  <button
                    type="button"
                    onClick={handleSendTestSMS}
                    disabled={sendingSMS}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    title="Envoyer SMS de confirmation"
                  >
                    {sendingSMS ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
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

            <div className="mb-6">
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
                {Object.entries(SYSTEM_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.system_type && (
                <p className="mt-1 text-sm text-accent-600">{errors.system_type.message}</p>
              )}
            </div>

            <BrandModelSelector
              brandValue={systemBrand || ''}
              modelValue={systemModel || ''}
              onBrandChange={(value) => setValue('system_brand', value)}
              onModelChange={(value) => setValue('system_model', value)}
              brandError={errors.system_brand?.message}
              modelError={errors.system_model?.message}
            />
          </div>

          {/* Assignment */}
          <div className="grid grid-cols-1 gap-6">
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

          {/* Problem Description with AI */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Description du problème *
              </label>
              {!problemDescValidated && (
                <div className="flex items-center gap-2 text-sm text-purple-600">
                  <Sparkles className="h-4 w-4" />
                  <span>IA disponible</span>
                </div>
              )}
            </div>

            {!problemDescValidated ? (
              <>
                <textarea
                  {...register('problem_desc')}
                  rows={4}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors resize-none ${
                    errors.problem_desc ? 'border-accent-300 focus:border-accent-500' : 'border-gray-300 focus:border-primary-500'
                  }`}
                  placeholder="Décrivez le problème rencontré en détail..."
                />
                {errors.problem_desc && (
                  <p className="mt-1 text-sm text-accent-600">{errors.problem_desc.message}</p>
                )}

                {/* AI Reformulation Button */}
                <button
                  type="button"
                  onClick={handleProblemDescReformulation}
                  disabled={aiLoading || !problemDesc?.trim()}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg text-sm"
                >
                  {aiLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      <span>Reformulation en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      <span>Reformuler avec l'IA</span>
                    </>
                  )}
                </button>

                {/* Reformulated Description */}
                {problemDescReformule && problemDescReformule.trim().length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-purple-700">
                      Description reformulée (prévisualisation)
                    </label>
                    <textarea
                      {...register('problem_desc_reformule')}
                      rows={4}
                      className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none bg-purple-50"
                      placeholder="La description reformulée apparaîtra ici..."
                    />
                    <button
                      type="button"
                      onClick={handleProblemDescValidation}
                      className="btn-success"
                    >
                      <span>✓</span>
                      <span>Valider la reformulation</span>
                    </button>
                  </div>
                )}

                {/* AI Messages */}
                {aiError && (
                  <p className="text-sm text-red-600 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    {aiError}
                  </p>
                )}
                {problemDescAiMessage && (
                  <p className="text-sm text-green-600 flex items-center">
                    <span className="mr-1">✓</span>
                    {problemDescAiMessage}
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-green-700">
                    Description validée (officielle)
                  </label>
                  <button
                    type="button"
                    onClick={() => setProblemDescValidated(false)}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Modifier
                  </button>
                </div>
                <textarea
                  {...register('problem_desc_reformule')}
                  rows={4}
                  className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none bg-green-50"
                />
                <p className="text-xs text-green-600">
                  Cette description sera utilisée comme version officielle
                </p>
              </div>
            )}
          </div>

          {/* AI Report Section */}
          <div className="border-t border-gray-200 pt-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Rapport technique</h3>
              </div>
              {!rapportValidated && (
                <div className="flex items-center gap-2 text-sm text-purple-600">
                  <Sparkles className="h-4 w-4" />
                  <span>IA disponible</span>
                </div>
              )}
            </div>

            {!rapportValidated ? (
              <>
                {/* Rapport brut */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rapport brut (dictée technicien)
                  </label>
                  <textarea
                    {...register('rapport_brut')}
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none font-mono text-sm"
                    placeholder="Saisie libre ou dictée vocale du rapport d'intervention..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Ce rapport est conservé tel quel pour traçabilité
                  </p>
                </div>

                {/* AI Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleAIReformulation}
                    disabled={aiLoading || !rapportBrut?.trim()}
                    className="inline-flex items-center px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {aiLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                        <span>Analyse et reformulation en cours...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        <span>Améliorer le rapport avec l'IA</span>
                      </>
                    )}
                  </button>

                  {/* AI Messages */}
                  {aiError && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {aiError}
                    </p>
                  )}
                  {aiMessage && (
                    <p className="mt-2 text-sm text-green-600 flex items-center">
                      <span className="mr-1">✓</span>
                      {aiMessage}
                    </p>
                  )}
                </div>

                {/* Rapport reformulé - Preview */}
                {rapportReformule && rapportReformule.trim().length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-purple-700">
                      Rapport reformulé (prévisualisation)
                    </label>
                    <textarea
                      {...register('rapport_reformule')}
                      rows={6}
                      className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none bg-purple-50"
                      placeholder="Le rapport reformulé apparaîtra ici. Vous pourrez le modifier manuellement si nécessaire."
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRapportValidation}
                        className="btn-success"
                      >
                        <span>✓</span>
                        <span>Valider la reformulation</span>
                      </button>
                      <p className="text-xs text-gray-500">
                        Ce rapport sera utilisé comme document officiel (client/facturation)
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-green-700">
                    Rapport validé (officiel)
                  </label>
                  <button
                    type="button"
                    onClick={() => setRapportValidated(false)}
                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                  >
                    Modifier
                  </button>
                </div>
                <textarea
                  {...register('rapport_reformule')}
                  rows={6}
                  className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none bg-green-50"
                />
                <p className="text-xs text-green-600">
                  Ce rapport est utilisé comme document officiel (client/facturation)
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-1.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              className="btn-ghost"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary btn-lg"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-3 w-3 border border-slate-600 border-t-transparent" />
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>{request ? 'Mettre à jour' : 'Créer'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};