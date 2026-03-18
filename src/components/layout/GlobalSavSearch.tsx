import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Phone, MapPin, ChevronRight, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface ExtrabatClient {
    id: number;
    nom: string;
    prenom: string;
    civilite: { libelle: string } | string;
    email?: string;
    telephones?: Array<{ id: number; number: string; type: string | { id: number; libelle: string } }>;
    adresses?: Array<{ id: number; description: string; codePostal: string; ville: string }>;
}

export const GlobalSavSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [clients, setClients] = useState<ExtrabatClient[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

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

    // Debounce recherche
    useEffect(() => {
        if (query.length < 2) {
            setClients([]);
            setShowDropdown(false);
            return;
        }
        const timer = setTimeout(() => searchClients(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    const searchClients = async (q: string) => {
        setLoading(true);
        setShowDropdown(true);
        try {
            const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
                body: { endpoint: 'clients', params: { q, include: 'telephone,adresse,adresse.interlocuteur' } }
            });
            if (error) throw error;
            if (data.success) setClients((data.data || []).slice(0, 10));
        } catch (err) {
            console.error('Erreur recherche clients:', err);
            setClients([]);
        } finally {
            setLoading(false);
        }
    };

    const getClientLabel = (client: ExtrabatClient) => {
        const civilite = typeof client.civilite === 'object' ? client.civilite.libelle : (client.civilite || '');
        return `${civilite ? civilite + ' ' : ''}${client.prenom} ${client.nom}`.trim();
    };

    const handleSelectClient = (client: ExtrabatClient) => {
        setQuery('');
        setClients([]);
        setShowDropdown(false);
        navigate(`/client/${client.id}`);
    };

    const handleClear = () => {
        setQuery('');
        setClients([]);
        setShowDropdown(false);
        inputRef.current?.focus();
    };

    return (
        <div className="relative flex-1 min-w-0 max-w-2xl px-2 sm:px-4" ref={containerRef}>
            {/* Input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => clients.length > 0 && setShowDropdown(true)}
                    placeholder="Rechercher un client (SAV & maintenance)..."
                    className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors bg-white"
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                )}
                {query && !loading && (
                    <button
                        onClick={handleClear}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>

            {/* Dropdown clients */}
            {showDropdown && (
                <div className="absolute left-2 sm:left-4 right-2 sm:right-4 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] overflow-hidden">
                    {clients.length > 0 ? (
                        <>
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                                Sélectionnez un client
                            </div>
                            <div className="max-h-72 overflow-y-auto">
                                {clients.map((client) => {
                                    const phone = client.telephones?.[0]?.number;
                                    const ville = client.adresses?.[0]?.ville;
                                    return (
                                        <button
                                            key={client.id}
                                            onClick={() => handleSelectClient(client)}
                                            className="w-full px-4 py-3 text-left hover:bg-primary-50 border-b border-gray-100 last:border-0 transition-colors flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
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
                                            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-primary-500 flex-shrink-0 transition-colors" />
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    ) : !loading && query.length >= 2 ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                            Aucun client trouvé pour « {query} »
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};
