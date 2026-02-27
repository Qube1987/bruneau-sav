import React from 'react';
import { X, Save, Sparkles } from 'lucide-react';
import { Intervention, InterventionPhoto } from '../../types';
import { useAIReformulation } from '../../hooks/useAIReformulation';
import { PhotoUpload } from '../common/PhotoUpload';
import { BatterySelector } from '../common/BatterySelector';
import { BatterySelection } from '../../hooks/useBatteries';

interface ReportFormProps {
  intervention: Intervention;
  interventionType?: 'sav' | 'maintenance';
  clientName: string;
  onSubmit: (data: { rapport_brut: string; rapport_reformule: string; batteries?: BatterySelection[]; has_battery_change?: boolean }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ReportForm: React.FC<ReportFormProps> = ({
  intervention,
  interventionType = 'sav',
  clientName,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [rapportBrut, setRapportBrut] = React.useState(intervention?.rapport_brut || '');
  const [rapportReformule, setRapportReformule] = React.useState(intervention?.rapport_reformule || '');
  const [rapportValidated, setRapportValidated] = React.useState(false);
  const [photos, setPhotos] = React.useState<InterventionPhoto[]>(intervention?.photos || []);
  const [batteries, setBatteries] = React.useState<BatterySelection[]>([]);
  const [hasBatteryChange, setHasBatteryChange] = React.useState(false);

  const { reformulateReport, loading: isReformulating, error: reformulationError } = useAIReformulation();

  // Update state when intervention changes
  React.useEffect(() => {
    console.log('ReportForm: intervention changed', intervention);
    setRapportBrut(intervention?.rapport_brut || '');
    setRapportReformule(intervention?.rapport_reformule || '');
    setPhotos(intervention?.photos || []);
  }, [intervention]);

  const handleReformulate = async () => {
    if (!rapportBrut.trim()) return;

    const result = await reformulateReport(rapportBrut);

    if (result) {
      setRapportReformule(result);
      setRapportValidated(false);
    }
  };

  const handleValidateReformulation = () => {
    if (rapportReformule?.trim()) {
      setRapportValidated(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    console.log('=== ReportForm handleSubmit ===');
    console.log('rapport_brut:', rapportBrut);
    console.log('rapport_reformule:', rapportReformule);
    console.log('batteries:', batteries);
    console.log('has_battery_change:', hasBatteryChange);
    e.preventDefault();
    onSubmit({
      rapport_brut: rapportBrut,
      rapport_reformule: rapportReformule,
      batteries,
      has_battery_change: hasBatteryChange
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 max-h-[calc(100vh-4rem)]">
        <div className="border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Saisir le rapport d'intervention
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Rapport d'intervention</h3>
          </div>

          {!rapportValidated ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rapport brut (dictée technicien)
                </label>
                <textarea
                  value={rapportBrut}
                  onChange={(e) => setRapportBrut(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none font-mono text-sm"
                  placeholder="Saisie libre ou dictée vocale du rapport d'intervention..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Ce rapport est conservé tel quel pour traçabilité
                </p>
              </div>

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

                {reformulationError && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {reformulationError}
                  </p>
                )}
              </div>

              {rapportReformule && rapportReformule.trim().length > 0 && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-purple-700">
                    Rapport reformulé (prévisualisation)
                  </label>
                  <textarea
                    value={rapportReformule}
                    onChange={(e) => setRapportReformule(e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none bg-purple-50"
                    placeholder="Le rapport reformulé apparaîtra ici. Vous pourrez le modifier manuellement si nécessaire."
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleValidateReformulation}
                      className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg text-sm"
                    >
                      <span className="mr-2">✓</span>
                      <span>Valider la reformulation</span>
                    </button>
                    <p className="text-xs text-gray-500">
                      Ce rapport sera utilisé comme document officiel
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-green-700">
                  Rapport reformulé validé
                </label>
                <button
                  type="button"
                  onClick={() => setRapportValidated(false)}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Modifier
                </button>
              </div>
              <textarea
                value={rapportReformule}
                onChange={(e) => setRapportReformule(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none bg-green-50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Ce rapport sera utilisé comme document officiel (client/facturation)
              </p>
            </div>
          )}

          {/* Batteries */}
          <div className="border-t border-gray-200 pt-6">
            <BatterySelector
              interventionId={intervention?.id}
              interventionType={interventionType}
              onBatteriesChange={(batteries, hasBatteryChange) => {
                setBatteries(batteries);
                setHasBatteryChange(hasBatteryChange);
              }}
              initialHasBatteryChange={intervention?.has_battery_change}
            />
          </div>

          {/* Photos */}
          <div className="border-t border-gray-200 pt-6">
            <PhotoUpload
              interventionId={intervention?.id}
              interventionType={interventionType}
              photos={photos}
              onPhotosChange={setPhotos}
              disabled={loading}
            />
          </div>

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
                  <span>Enregistrer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
