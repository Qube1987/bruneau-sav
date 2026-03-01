import React from 'react';
import { Bell, BellOff, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

interface PushSettingsProps {
    onClose: () => void;
}

export const PushSettings: React.FC<PushSettingsProps> = ({ onClose }) => {
    const { permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-100 rounded-lg">
                            <Bell className="h-5 w-5 text-primary-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Notifications Push</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <p className="text-gray-600">
                        Activez les notifications pour être informé en temps réel des nouveaux SAV, des clôtures et des réactivations.
                    </p>

                    {permission === 'denied' ? (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-800">Notifications bloquées</p>
                                <p className="text-xs text-red-700 mt-1">
                                    Veuillez autoriser les notifications dans les paramètres de votre navigateur pour cet appareil.
                                </p>
                            </div>
                        </div>
                    ) : isSubscribed ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-green-800">Notifications activées</p>
                                    <p className="text-xs text-green-700 mt-1">
                                        Cet appareil est prêt à recevoir des notifications push.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={unsubscribe}
                                disabled={loading}
                                className="w-full py-3 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
                                Désactiver sur cet appareil
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={subscribe}
                            disabled={loading}
                            className="w-full py-4 px-4 bg-primary-900 text-white font-bold rounded-xl hover:bg-primary-800 transition-all shadow-lg shadow-primary-900/10 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bell className="h-5 w-5" />}
                            Activer les notifications sur cet appareil
                        </button>
                    )}

                    <div className="pt-4 border-t border-gray-100">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Compatibilité</h4>
                        <ul className="space-y-2 text-xs text-gray-500">
                            <li className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                Android & Desktop : Fonctionne directement
                            </li>
                            <li className="flex items-center gap-2">
                                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                iOS : Nécessite iOS 16.4+ et l'installation via "Ajouter à l'écran d'accueil"
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
