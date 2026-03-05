import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    User,
    Phone,
    MapPin,
    AlertTriangle,
    Wrench,
    ChevronRight,
    X,
    Loader2,
    Clock,
    CheckCircle2,
    Circle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SYSTEM_TYPES, STATUS_LABELS, MAINTENANCE_STATUS_LABELS } from '../../types';

interface ExtrabatClient {
    id: number;
    nom: string;
    prenom: string;
    civilite: { libelle: string } | string;
    email?: string;
    telephones?: Array<{ id: number; number: string; type: string | { id: number; libelle: string } }>;
    adresses?: Array<{ id: number; description: string; codePostal: string; ville: string }>;
}

interface SavResult {
    id: string;
    client_name: string;
    system_type: string;
    status: string;
    requested_at: string;
    urgent: boolean;
    city_derived?: string;
    address?: string;
}

interface MaintenanceResult {
    id: string;
    client_name: string;
    system_type: string;
    status: string;
    created_at: string;
    priority: boolean;
    city_derived?: string;
    address?: string;
}

type SearchStep = 'idle' | 'searching-clients' | 'client-selected' | 'loading-records';

export const GlobalSavSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [step, setStep] = useState<SearchStep>('idle');
    const [clients, setClients] = useState<ExtrabatClient[]>([]);
    const [selectedClient, setSelectedClient] = useState<ExtrabatClient | null>(null);
    const [savRecords, setSavRecords] = useState<SavResult[]>([]);
    const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceResult[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fermer au clic extérieur
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounce de la recherche client
    useEffect(() => {
        if (query.length < 2) {
            setClients([]);
            setShowDropdown(false);
            if (step === 'searching-clients') setStep('idle');
            return;
        }
        if (selectedClient) return; // ne pas re-chercher si un client est déjà sélectionné

        const timer = setTimeout(() => searchClients(query), 300);
        return () => clearTimeout(timer);
    }, [query, selectedClient]);

    const searchClients = async (q: string) => {
        setStep('searching-clients');
        setShowDropdown(true);
        try {
            const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
                body: { endpoint: 'clients', params: { q, include: 'telephone,adresse' } }
            });
            if (error) throw error;
            if (data.success) {
                setClients((data.data || []).slice(0, 10));
            }
        } catch (err) {
            console.error('Erreur recherche clients:', err);
            setClients([]);
        } finally {
            setStep('idle');
        }
    };

    const handleSelectClient = async (client: ExtrabatClient) => {
        setSelectedClient(client);
        setQuery(getClientLabel(client));
        setClients([]);
        setStep('loading-records');
        setShowDropdown(true);

        try {
            const [savRes, maintRes] = await Promise.all([
                supabase
                    .from('sav_requests')
                    .select('id, client_name, system_type, status, requested_at, urgent, city_derived, address')
                    .eq('extrabat_id', client.id)
                    .order('requested_at', { ascending: false })
                    .limit(20),
                supabase
                    .from('maintenance_contracts')
                    .select('id, client_name, system_type, status, created_at, priority, city_derived, address')
                    .eq('extrabat_id', client.id)
                    .order('created_at', { ascending: false })
                    .limit(20)
            ]);

            setSavRecords(savRes.data || []);
            setMaintenanceRecords(maintRes.data || []);
        } catch (err) {
            console.error('Erreur chargement dossiers:', err);
        } finally {
            setStep('client-selected');
        }
    };

    const handleClear = () => {
        setQuery('');
        setSelectedClient(null);
        setClients([]);
        setSavRecords([]);
        setMaintenanceRecords([]);
        setStep('idle');
        setShowDropdown(false);
        inputRef.current?.focus();
    };

    const getClientLabel = (client: ExtrabatClient) => {
        const civilite = typeof client.civilite === 'object' ? client.civilite.libelle : (client.civilite || '');
        return `${civilite ? civilite + ' ' : ''}${client.prenom} ${client.nom}`.trim();
    };

    const getSavStatusIcon = (status: string) => {
        if (status === 'terminee' || status === 'archivee') return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
        if (status === 'en_cours') return <Clock className="h-3.5 w-3.5 text-blue-500" />;
        return <Circle className="h-3.5 w-3.5 text-orange-400" />;
    };

    const getMaintStatusIcon = (status: string) => {
        if (status === 'realisee') return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
        if (status === 'prevue') return <Clock className="h-3.5 w-3.5 text-blue-500" />;
        return <Circle className="h-3.5 w-3.5 text-orange-400" />;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    const hasResults = savRecords.length > 0 || maintenanceRecords.length > 0;

    return (
        <div className="relative flex-1 min-w-0 max-w-2xl px-2 sm:px-4" ref={containerRef}>
            {/* Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (selectedClient) setSelectedClient(null);
                    }}
                    onFocus={() => {
                        if (clients.length > 0 || step === 'client-selected') setShowDropdown(true);
                    }}
                    placeholder="Rechercher un client (SAV & maintenance)..."
                    className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors bg-white"
                />
                {(step === 'searching-clients' || step === 'loading-records') && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                )}
                {query && step !== 'searching-clients' && step !== 'loading-records' && (
                    <button
                        onClick={handleClear}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {showDropdown && (
                <div className="absolute left-2 sm:left-4 right-2 sm:right-4 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] overflow-hidden">

                    {/* Liste clients Extrabat */}
                    {clients.length > 0 && !selectedClient && (
                        <div>
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                                Clients trouvés
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                                {clients.map((client) => {
                                    const phone = client.telephones?.[0]?.number;
                                    const ville = client.adresses?.[0]?.ville;
                                    return (
                                        <button
                                            key={client.id}
                                            onClick={() => handleSelectClient(client)}
                                            className="w-full px-4 py-3 text-left hover:bg-primary-50 border-b border-gray-100 last:border-0 transition-colors flex items-center justify-between group"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                                                    <User className="h-4 w-4 text-primary-600" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 text-sm">{getClientLabel(client)}</div>
                                                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                                                        {ville && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ville}</span>}
                                                        {phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{phone}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary-500 flex-shrink-0 transition-colors" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Aucun client */}
                    {step === 'idle' && query.length >= 2 && clients.length === 0 && !selectedClient && (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                            Aucun client trouvé pour « {query} »
                        </div>
                    )}

                    {/* Chargement des dossiers */}
                    {step === 'loading-records' && (
                        <div className="px-4 py-6 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                            Chargement des dossiers...
                        </div>
                    )}

                    {/* Résultats client sélectionné */}
                    {step === 'client-selected' && selectedClient && (
                        <div>
                            {/* En-tête client */}
                            <div className="px-4 py-3 bg-primary-50 border-b border-primary-100 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary-200 flex items-center justify-center flex-shrink-0">
                                    <User className="h-4 w-4 text-primary-700" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-primary-900 text-sm truncate">{getClientLabel(selectedClient)}</div>
                                    <div className="text-xs text-primary-600">{savRecords.length} SAV · {maintenanceRecords.length} maintenance</div>
                                </div>
                            </div>

                            <div className="max-h-[480px] overflow-y-auto">
                                {!hasResults && (
                                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                                        Aucun dossier SAV ni contrat de maintenance pour ce client
                                    </div>
                                )}

                                {/* SAV */}
                                {savRecords.length > 0 && (
                                    <div>
                                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
                                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                                            SAV ({savRecords.length})
                                        </div>
                                        {savRecords.map((sav) => (
                                            <a
                                                key={sav.id}
                                                href={`/?highlight=${sav.id}`}
                                                onClick={() => setShowDropdown(false)}
                                                className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                                            >
                                                <div className="mt-0.5 flex-shrink-0">
                                                    {getSavStatusIcon(sav.status)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-sm font-medium text-gray-900 truncate">
                                                            {SYSTEM_TYPES[sav.system_type as keyof typeof SYSTEM_TYPES] || sav.system_type}
                                                        </span>
                                                        <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(sav.requested_at)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-gray-500">
                                                            {STATUS_LABELS[sav.status as keyof typeof STATUS_LABELS] || sav.status}
                                                        </span>
                                                        {sav.city_derived && (
                                                            <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                                                <MapPin className="h-2.5 w-2.5" />{sav.city_derived}
                                                            </span>
                                                        )}
                                                        {sav.urgent && (
                                                            <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded font-medium">Urgent</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Maintenance */}
                                {maintenanceRecords.length > 0 && (
                                    <div>
                                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
                                            <Wrench className="h-3 w-3 text-blue-500" />
                                            Maintenance ({maintenanceRecords.length})
                                        </div>
                                        {maintenanceRecords.map((contract) => (
                                            <a
                                                key={contract.id}
                                                href={`/maintenance?highlight=${contract.id}`}
                                                onClick={() => setShowDropdown(false)}
                                                className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                                            >
                                                <div className="mt-0.5 flex-shrink-0">
                                                    {getMaintStatusIcon(contract.status)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-sm font-medium text-gray-900 truncate">
                                                            {SYSTEM_TYPES[contract.system_type as keyof typeof SYSTEM_TYPES] || contract.system_type}
                                                        </span>
                                                        <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(contract.created_at)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-gray-500">
                                                            {MAINTENANCE_STATUS_LABELS[contract.status as keyof typeof MAINTENANCE_STATUS_LABELS] || contract.status}
                                                        </span>
                                                        {contract.city_derived && (
                                                            <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                                                <MapPin className="h-2.5 w-2.5" />{contract.city_derived}
                                                            </span>
                                                        )}
                                                        {contract.priority && (
                                                            <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded font-medium">Prioritaire</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
