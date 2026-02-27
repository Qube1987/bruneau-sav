import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { X, Save, Calendar, User as UserIcon, CheckCircle } from 'lucide-react';
import { format, setMinutes, setSeconds } from 'date-fns';
import { MaintenanceIntervention, InterventionPhoto } from '../../types';
import { TimeSelector } from '../common/TimeSelector';
import { PhotoUpload } from '../common/PhotoUpload';
import { BatterySelector } from '../common/BatterySelector';
import { supabase } from '../../lib/supabase';

const schema = yup.object({
  started_at: yup.string().required('La date de début est obligatoire'),
  ended_at: yup.string(),
  technician_ids: yup.array().of(yup.string().required()).default([]),
  notes: yup.string()
});

type FormData = yup.InferType<typeof schema>;

interface MaintenanceInterventionFormProps {
  contractId: string;
  clientName: string;
  intervention?: MaintenanceIntervention;
  users: Array<{ id: string; display_name: string | null; email: string; phone: string | null }>;
  onSubmit: (data: FormData & { technician_ids: string[] }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const MaintenanceInterventionForm: React.FC<MaintenanceInterventionFormProps> = ({
  contractId,
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
          .eq('intervention_type', 'maintenance');

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
      started_at: intervention?.started_at
        ? formatDateTimeForInput(intervention.started_at)
        : (intervention?.scheduled_at
          ? formatDateTimeForInput(intervention.scheduled_at)
          : format(roundToNearest15Minutes(new Date()), "yyyy-MM-dd'T'HH:mm")),
      ended_at: intervention?.ended_at
        ? formatDateTimeForInput(intervention.ended_at)
        : (intervention?.completed_at
          ? formatDateTimeForInput(intervention.completed_at)
          : ''),
      notes: intervention?.notes || ''
    }
  });

  // Watch for changes in started_at to auto-fill ended_at
  const startedAt = watch('started_at');

  React.useEffect(() => {
    if (startedAt && !intervention) {
      const startDate = new Date(startedAt);
      if (!isNaN(startDate.getTime())) {
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
      reset({
        started_at: intervention.started_at
          ? formatDateTimeForInput(intervention.started_at)
          : (intervention.scheduled_at
            ? formatDateTimeForInput(intervention.scheduled_at)
            : ''),
        ended_at: intervention.ended_at
          ? formatDateTimeForInput(intervention.ended_at)
          : (intervention.completed_at
            ? formatDateTimeForInput(intervention.completed_at)
            : ''),
        notes: intervention.notes || ''
      });
      setSelectedTechnicians(
        intervention.technicians?.map(t => t.id) ||
        (intervention.technician_id ? [intervention.technician_id] : [])
      );
      setPhotos(intervention?.photos || []);
    }
  }, [intervention, reset]);

  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      technician_ids: selectedTechnicians,
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full my-8 max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {intervention ? 'Modifier l\'intervention' : 'Ajouter une intervention'}
            </h2>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Client: <span className="font-medium">{clientName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">

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

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes d'intervention
            </label>
            <textarea
              {...register('notes')}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none"
              placeholder="Décrivez les actions réalisées, les observations, les pièces changées, etc."
            />
          </div>

          {/* Battery Selector */}
          <div>
            <BatterySelector
              selectedBatteries={selectedBatteries}
              onBatteriesChange={setSelectedBatteries}
            />
          </div>

          {/* Photos */}
          <div>
            <PhotoUpload
              interventionId={intervention?.id}
              interventionType="maintenance"
              photos={photos}
              onPhotosChange={setPhotos}
              disabled={loading}
            />
          </div>

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