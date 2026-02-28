import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { X, Save, Calendar, User as UserIcon, Sparkles } from 'lucide-react';
import { format, setMinutes, setSeconds } from 'date-fns';
import { Intervention, InterventionPhoto } from '../../types';
import { TimeSelector } from '../common/TimeSelector';
import { PhotoUpload } from '../common/PhotoUpload';
import { useAIReformulation } from '../../hooks/useAIReformulation';
import { BatterySelector } from '../common/BatterySelector';
import { supabase } from '../../lib/supabase';

const schema = yup.object({
  started_at: yup.string().required('La date de début est obligatoire'),
  ended_at: yup.string(),
  technician_ids: yup.array().of(yup.string().required()).default([]),
  notes: yup.string(),
  rapport_brut: yup.string(),
  rapport_reformule: yup.string()
});

type FormData = yup.InferType<typeof schema>;

interface InterventionFormProps {
  savRequestId: string;
  clientName: string;
  intervention?: Intervention;
  users: Array<{ id: string; display_name: string | null; email: string; phone: string | null }>;
  onSubmit: (data: FormData & { technician_ids: string[] }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const InterventionForm: React.FC<InterventionFormProps> = ({
  savRequestId,
  clientName,
  intervention,
  users,
  onSubmit,
  onCancel,
  loading = false
}) => {
  // Helper function to round time to nearest 15 minutes
  const roundToNearest15Minutes = (date: Date) => {
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    return setSeconds(setMinutes(date, roundedMinutes), 0);
  };

  // Helper function to format datetime for input (rounded to 15min)
  const formatDateTimeForInput = (dateString: string) => {
    const date = new Date(dateString);
    const roundedDate = roundToNearest15Minutes(date);
    return format(roundedDate, "yyyy-MM-dd'T'HH:mm");
  };

  const [selectedTechnicians, setSelectedTechnicians] = React.useState<string[]>(
    intervention?.technicians?.map(t => t.id) ||
    (intervention?.technician_id ? [intervention.technician_id] : [])
  );

  const [rapportBrut, setRapportBrut] = React.useState(intervention?.rapport_brut || '');
  const [rapportReformule, setRapportReformule] = React.useState(intervention?.rapport_reformule || '');
  const [photos, setPhotos] = React.useState<InterventionPhoto[]>(intervention?.photos || []);
  const [selectedBatteries, setSelectedBatteries] = React.useState<Array<{
    battery_product_id: string;
    quantity: number;
  }>>([]);

  // Load existing batteries when intervention changes
  React.useEffect(() => {
    const loadBatteries = async () => {
      if (intervention?.id) {
        const { data } = await supabase
          .from('intervention_batteries')
          .select('battery_product_id, quantity')
          .eq('intervention_id', intervention.id)
          .eq('intervention_type', 'sav');

        if (data && data.length > 0) {
          setSelectedBatteries(data.map(b => ({
            battery_product_id: b.battery_product_id,
            quantity: b.quantity
          })));
        } else {
          setSelectedBatteries([]);
        }
      } else {
        setSelectedBatteries([]);
      }
    };

    loadBatteries();
  }, [intervention?.id]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      started_at: intervention
        ? formatDateTimeForInput(intervention.started_at)
        : format(roundToNearest15Minutes(new Date()), "yyyy-MM-dd'T'HH:mm"),
      ended_at: intervention?.ended_at
        ? formatDateTimeForInput(intervention.ended_at)
        : '',
      notes: intervention?.notes || '',
      rapport_brut: intervention?.rapport_brut || '',
      rapport_reformule: intervention?.rapport_reformule || ''
    }
  });

  const { reformulateReport, loading: isReformulating, error: reformulationError } = useAIReformulation();

  // Watch for changes in started_at to auto-fill ended_at
  const startedAt = watch('started_at');

  React.useEffect(() => {
    if (startedAt && !intervention) { // Only auto-fill for new interventions
      const startDate = new Date(startedAt);
      if (!isNaN(startDate.getTime())) {
        // Add 1 hour
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        const roundedEndDate = roundToNearest15Minutes(endDate);
        const formattedEndDate = format(roundedEndDate, "yyyy-MM-dd'T'HH:mm");
        setValue('ended_at', formattedEndDate);
      }
    }
  }, [startedAt, setValue, intervention]);

  // Reset form when intervention changes
  React.useEffect(() => {
    if (intervention) {
      const rapportBrutValue = intervention.rapport_brut || '';
      const rapportReformuleValue = intervention.rapport_reformule || '';

      reset({
        started_at: formatDateTimeForInput(intervention.started_at),
        ended_at: intervention.ended_at
          ? formatDateTimeForInput(intervention.ended_at)
          : '',
        notes: intervention.notes || '',
        rapport_brut: rapportBrutValue,
        rapport_reformule: rapportReformuleValue
      });
      setSelectedTechnicians(
        intervention.technicians?.map(t => t.id) ||
        (intervention.technician_id ? [intervention.technician_id] : [])
      );
      setRapportBrut(rapportBrutValue);
      setRapportReformule(rapportReformuleValue);
      setPhotos(intervention?.photos || []);
    }
  }, [intervention, reset]);

  const handleReformulate = async () => {
    if (!rapportBrut.trim()) return;

    const result = await reformulateReport(rapportBrut);

    if (result) {
      setRapportReformule(result);
      setValue('rapport_reformule', result);
    }
  };


  const handleFormSubmit = (data: FormData) => {
    console.log('=== InterventionForm handleFormSubmit ===');
    console.log('rapport_brut:', rapportBrut);
    console.log('rapport_reformule:', rapportReformule);
    onSubmit({
      ...data,
      technician_ids: selectedTechnicians,
      rapport_brut: rapportBrut,
      rapport_reformule: rapportReformule,
      batteries: selectedBatteries
    });
  };

  const toggleTechnician = (technicianId: string) => {
    setSelectedTechnicians(prev =>
      prev.includes(technicianId)
        ? prev.filter(id => id !== technicianId)
        : [...prev, technicianId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-3xl sm:rounded-2xl shadow-xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:rounded-t-2xl z-10 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 pr-4">
              {intervention ? 'Modifier l\'intervention' : 'Ajouter une intervention'}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Client: <span className="font-medium">{clientName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Technicians */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <UserIcon className="h-4 w-4 inline mr-2" />
              Intervenants
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedTechnicians.includes(user.id)}
                    onChange={() => toggleTechnician(user.id)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    {user.display_name || user.email}
                  </span>
                </label>
              ))}
            </div>
            {selectedTechnicians.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">Aucun intervenant sélectionné</p>
            )}
          </div>

          {/* Date and Time Fields */}
          <div className="space-y-6">
            <TimeSelector
              label="Date et heure de début"
              value={watch('started_at')}
              onChange={(value) => setValue('started_at', value)}
              required
              error={errors.started_at?.message}
              icon={<Calendar className="h-4 w-4 inline mr-2" />}
            />

            <TimeSelector
              label="Date et heure de fin"
              value={watch('ended_at')}
              onChange={(value) => setValue('ended_at', value)}
              icon={<Calendar className="h-4 w-4 inline mr-2" />}
            />
          </div>

          {/* AI Report Section */}
          <div className="border-t border-gray-200 pt-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Rapport d'intervention</h3>
            </div>

            {/* Rapport brut */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rapport brut (dictée technicien)
              </label>
              <textarea
                value={rapportBrut}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setRapportBrut(newValue);
                  setValue('rapport_brut', newValue);
                }}
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
                onClick={handleReformulate}
                disabled={isReformulating || !rapportBrut?.trim()}
                className="inline-flex items-center px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {isReformulating ? (
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
              {reformulationError && (
                <p className="mt-2 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {reformulationError}
                </p>
              )}
            </div>

            {/* Rapport reformulé */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rapport reformulé (officiel)
              </label>
              <textarea
                value={rapportReformule}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setRapportReformule(newValue);
                  setValue('rapport_reformule', newValue);
                }}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none bg-purple-50"
                placeholder="Le rapport reformulé apparaîtra ici. Vous pourrez le modifier manuellement si nécessaire."
              />
              <p className="mt-1 text-xs text-gray-500">
                Ce rapport sera utilisé comme document officiel (client/facturation)
              </p>
            </div>
          </div>

          {/* Battery Selector */}
          <div className="border-t border-gray-200 pt-6">
            <BatterySelector
              selectedBatteries={selectedBatteries}
              onBatteriesChange={setSelectedBatteries}
            />
          </div>

          {/* Photos */}
          <div className="border-t border-gray-200 pt-6">
            <PhotoUpload
              interventionId={intervention?.id}
              interventionType="sav"
              photos={photos}
              onPhotosChange={setPhotos}
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6 sticky bottom-0 bg-white pb-4 sm:pb-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] sm:shadow-none p-4 sm:p-0">
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
              className="w-full sm:w-auto px-6 py-3 bg-primary-900 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 min-h-[44px]"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>{intervention ? 'Mettre à jour' : 'Ajouter l\'intervention'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};