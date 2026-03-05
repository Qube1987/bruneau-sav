import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    User,
    Phone,
    MapPin,
    AlertTriangle,
    Wrench,
    CheckCircle2,
    Clock,
    Circle,
    Loader2,
    Calendar,
    Tag,
    FileWarning,
    ChevronRight,
    X,
    Plus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SYSTEM_TYPES, STATUS_LABELS, MAINTENANCE_STATUS_LABELS, SavRequest, MaintenanceContract } from '../../types';
import { SavCard } from '../sav/SavCard';
import { MaintenanceCard } from '../maintenance/MaintenanceCard';
import { SavForm } from '../sav/SavForm';
import { MaintenanceForm } from '../maintenance/MaintenanceForm';
import { useGeocoding } from '../../hooks/useGeocoding';

interface ClientInfo {
    nom: string;
    prenom: string;
    civilite: { libelle: string } | string;
    email?: string;
    telephones?: Array<{ id: number; number: string; type: string | { id: number; libelle: string } }>;
    adresses?: Array<{ id: number; description: string; codePostal: string; ville: string; pays: string }>;
}

interface SavRecord {
    id: string;
    client_name: string;
    site?: string;
    system_type: string;
    status: string;
    requested_at: string;
    urgent: boolean;
    priority?: boolean;
    city_derived?: string;
    address?: string;
    problem_desc: string;
    assigned_user?: { display_name: string | null; email: string }[];
}

interface MaintenanceRecord {
    id: string;
    client_name: string;
    site?: string;
    system_type: string;
    status: string;
    created_at: string;
    priority: boolean;
    city_derived?: string;
    address?: string;
    battery_installation_year?: number;
    annual_amount?: number;
    billing_mode?: string;
    assigned_user?: { display_name: string | null; email: string }[];
}

const SAV_STATUS_COLORS: Record<string, string> = {
    nouvelle: 'bg-orange-100 text-orange-800',
    en_cours: 'bg-blue-100 text-blue-800',
    terminee: 'bg-green-100 text-green-800',
    archivee: 'bg-gray-100 text-gray-600',
};

const MAINT_STATUS_COLORS: Record<string, string> = {
    a_realiser: 'bg-orange-100 text-orange-800',
    prevue: 'bg-blue-100 text-blue-800',
    realisee: 'bg-green-100 text-green-800',
};

const StatusIcon: React.FC<{ status: string; type: 'sav' | 'maint' }> = ({ status, type }) => {
    const isOk = type === 'sav' ? ['terminee', 'archivee'].includes(status) : status === 'realisee';
    const isProgress = type === 'sav' ? status === 'en_cours' : status === 'prevue';
    if (isOk) return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (isProgress) return <Clock className="h-5 w-5 text-blue-500" />;
    return <Circle className="h-5 w-5 text-orange-400" />;
};

const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

export const ClientRecordsPage: React.FC = () => {
    const { extrabatId } = useParams<{ extrabatId: string }>();
    const navigate = useNavigate();

    const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
    const [savRecords, setSavRecords] = useState<SavRecord[]>([]);
    const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'sav' | 'maintenance'>('sav');

    // Modal state
    const [modalSav, setModalSav] = useState<SavRequest | null>(null);
    const [modalMaintenance, setModalMaintenance] = useState<MaintenanceContract | null>(null);
    const [modalLoading, setModalLoading] = useState(false);

    // Form state
    const [showSavForm, setShowSavForm] = useState(false);
    const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);
    const [extrabatData, setExtrabatData] = useState<{ clientId?: number; ouvrageId?: number }>({});

    const { geocodeAddress } = useGeocoding();


    useEffect(() => {
        if (!extrabatId) return;
        loadData(Number(extrabatId));
        setExtrabatData({ clientId: Number(extrabatId) });
    }, [extrabatId]);

    // Fetch users for form dropdowns
    useEffect(() => {
        const fetchUsers = async () => {
            const { data } = await supabase
                .from('users')
                .select('id, display_name, email, phone, role, extrabat_code')
                .order('display_name');
            if (data) setUsers(data);
        };
        fetchUsers();
    }, []);

    const loadData = async (id: number) => {
        setLoading(true);
        try {
            const [clientRes, savRes, maintRes] = await Promise.all([
                supabase.functions.invoke('extrabat-proxy', {
                    body: { endpoint: `clients/${id}`, params: { include: 'telephone,adresse' } }
                }),
                supabase
                    .from('sav_requests')
                    .select('id, client_name, site, system_type, status, requested_at, urgent, priority, city_derived, address, problem_desc, assigned_user:assigned_user_id(display_name, email)')
                    .eq('extrabat_id', id)
                    .order('requested_at', { ascending: false }),
                supabase
                    .from('maintenance_contracts')
                    .select('id, client_name, site, system_type, status, created_at, priority, city_derived, address, battery_installation_year, annual_amount, billing_mode, assigned_user:assigned_user_id(display_name, email)')
                    .eq('extrabat_id', id)
                    .order('created_at', { ascending: false })
            ]);

            if (clientRes.data?.success) {
                setClientInfo(clientRes.data.data);
            }
            setSavRecords((savRes.data || []) as unknown as SavRecord[]);
            setMaintenanceRecords((maintRes.data || []) as unknown as MaintenanceRecord[]);
        } catch (err) {
            console.error('Erreur chargement données client:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch full SAV record for modal
    const openSavModal = async (savId: string) => {
        setModalLoading(true);
        try {
            const { data, error } = await supabase
                .from('sav_requests')
                .select(`
          *,
          assigned_user:assigned_user_id(id, display_name, email),
          interventions:sav_interventions(
            *,
            technician:technician_id(id, display_name, email)
          )
        `)
                .eq('id', savId)
                .single();

            if (error) throw error;

            // Check for maintenance contract
            const { data: contractData } = await supabase
                .from('maintenance_contracts')
                .select('id')
                .eq('client_name', data.client_name)
                .limit(1);

            // Load technicians and photos for each intervention
            const interventionsWithData = await Promise.all(
                (data.interventions || []).map(async (intervention: any) => {
                    const { data: techData } = await supabase
                        .from('sav_intervention_technicians')
                        .select('technician:technician_id(id, display_name, email)')
                        .eq('sav_intervention_id', intervention.id);

                    const { data: photosData } = await supabase
                        .from('intervention_photos')
                        .select('*')
                        .eq('intervention_id', intervention.id)
                        .eq('intervention_type', 'sav');

                    const photosWithUrls = (photosData || []).map((photo: any) => {
                        const { data: { publicUrl } } = supabase.storage
                            .from('intervention-photos')
                            .getPublicUrl(photo.file_path);
                        return { ...photo, url: publicUrl };
                    });

                    const { data: batteryData } = await supabase
                        .from('intervention_batteries')
                        .select('*, battery_product:battery_products(*)')
                        .eq('intervention_id', intervention.id)
                        .eq('intervention_type', 'sav');

                    return {
                        ...intervention,
                        technician_ids: techData?.map((t: any) => t.technician.id) || [],
                        technicians: techData?.map((t: any) => t.technician) || [],
                        photos: photosWithUrls,
                        batteries: batteryData || []
                    };
                })
            );

            setModalSav({
                ...data,
                has_maintenance_contract: contractData && contractData.length > 0,
                interventions: interventionsWithData
            } as SavRequest);
        } catch (err) {
            console.error('Erreur chargement SAV:', err);
            alert('Erreur lors du chargement du dossier SAV');
        } finally {
            setModalLoading(false);
        }
    };

    // Fetch full Maintenance record for modal
    const openMaintenanceModal = async (contractId: string) => {
        setModalLoading(true);
        try {
            const { data, error } = await supabase
                .from('maintenance_contracts')
                .select(`
          *,
          assigned_user:assigned_user_id(id, display_name, email),
          interventions:maintenance_interventions(
            *,
            technician:technician_id(id, display_name, email)
          )
        `)
                .eq('id', contractId)
                .single();

            if (error) throw error;

            // Load technicians and photos for each intervention
            const interventionsWithData = await Promise.all(
                (data.interventions || []).map(async (intervention: any) => {
                    const { data: techData } = await supabase
                        .from('maintenance_intervention_technicians')
                        .select('technician:technician_id(id, display_name, email)')
                        .eq('maintenance_intervention_id', intervention.id);

                    const { data: photosData } = await supabase
                        .from('intervention_photos')
                        .select('*')
                        .eq('intervention_id', intervention.id)
                        .eq('intervention_type', 'maintenance');

                    const photosWithUrls = (photosData || []).map((photo: any) => {
                        const { data: { publicUrl } } = supabase.storage
                            .from('intervention-photos')
                            .getPublicUrl(photo.file_path);
                        return { ...photo, url: publicUrl };
                    });

                    const { data: batteryData } = await supabase
                        .from('intervention_batteries')
                        .select('*, battery_product:battery_products(*)')
                        .eq('intervention_id', intervention.id)
                        .eq('intervention_type', 'maintenance');

                    return {
                        ...intervention,
                        technician_ids: techData?.map((t: any) => t.technician.id) || [],
                        technicians: techData?.map((t: any) => t.technician) || [],
                        photos: photosWithUrls,
                        batteries: batteryData || []
                    };
                })
            );

            setModalMaintenance({
                ...data,
                interventions: interventionsWithData
            } as MaintenanceContract);
        } catch (err) {
            console.error('Erreur chargement maintenance:', err);
            alert('Erreur lors du chargement du contrat de maintenance');
        } finally {
            setModalLoading(false);
        }
    };

    // SAV action handlers for modal
    const handleSavMarkComplete = async (id: string) => {
        await supabase.from('sav_requests').update({ status: 'terminee', resolved_at: new Date().toISOString() }).eq('id', id);
        openSavModal(id); // refresh modal
        loadData(Number(extrabatId)); // refresh list
    };

    const handleSavArchive = async (id: string) => {
        await supabase.from('sav_requests').update({ status: 'archivee', archived_at: new Date().toISOString() }).eq('id', id);
        openSavModal(id);
        loadData(Number(extrabatId));
    };

    const handleSavDelete = async (id: string) => {
        await supabase.from('sav_requests').delete().eq('id', id);
        setModalSav(null);
        loadData(Number(extrabatId));
    };

    const handleSavDeleteIntervention = async (interventionId: string) => {
        await supabase.from('sav_interventions').delete().eq('id', interventionId);
        if (modalSav) {
            openSavModal(modalSav.id);
            loadData(Number(extrabatId));
        }
    };

    const handleMaintenanceMarkCompleted = async (id: string) => {
        const current = maintenanceRecords.find(c => c.id === id);
        const newStatus = current?.status === 'realisee' ? 'a_realiser' : 'realisee';
        await supabase.from('maintenance_contracts').update({ status: newStatus }).eq('id', id);
        openMaintenanceModal(id);
        loadData(Number(extrabatId));
    };

    const handleMaintenanceDelete = async (id: string) => {
        await supabase.from('maintenance_contracts').delete().eq('id', id);
        setModalMaintenance(null);
        loadData(Number(extrabatId));
    };

    const handleMaintenanceDeleteIntervention = async (interventionId: string) => {
        await supabase.from('maintenance_interventions').delete().eq('id', interventionId);
        if (modalMaintenance) {
            openMaintenanceModal(modalMaintenance.id);
            loadData(Number(extrabatId));
        }
    };

    // Navigate to full page for complex actions
    const goToSavPage = (id: string) => navigate(`/?id=${id}`);
    const goToMaintenancePage = (id: string) => navigate(`/maintenance?id=${id}`);

    // Create SAV handler
    const handleCreateSav = async (data: any) => {
        try {
            setFormLoading(true);
            let city_derived = null;
            if (data.address) {
                const cityMatch = data.address.match(/\d{5}\s+([^,]+)/);
                if (cityMatch) city_derived = cityMatch[1].trim();
            }
            const cleanedData = {
                ...data,
                assigned_user_id: data.assigned_user_id === '' ? null : data.assigned_user_id,
                created_by: data.created_by === '' ? null : data.created_by
            };
            let latitude = null, longitude = null;
            if (data.address) {
                const geocoded = await geocodeAddress(data.address);
                if (geocoded) { latitude = geocoded.lat; longitude = geocoded.lng; }
            }
            const { error } = await supabase.from('sav_requests').insert({
                ...cleanedData,
                city_derived,
                system_type: data.system_type || 'autre',
                status: 'nouvelle',
                priority: data.urgent || false,
                extrabat_id: extrabatData?.clientId || null,
                extrabat_ouvrage_id: extrabatData?.ouvrageId || null,
                latitude, longitude
            });
            if (error) throw error;
            setShowSavForm(false);
            loadData(Number(extrabatId));
        } catch (err) {
            console.error('Error creating SAV:', err);
            alert('Erreur lors de la création du SAV');
        } finally {
            setFormLoading(false);
        }
    };

    // Create Maintenance handler
    const handleCreateMaintenance = async (data: any) => {
        try {
            setFormLoading(true);
            let city_derived = null;
            if (data.address) {
                const cityMatch = data.address.match(/\d{5}\s+([^,]+)/);
                if (cityMatch) city_derived = cityMatch[1].trim();
            }
            const cleanedData = {
                ...data,
                assigned_user_id: data.assigned_user_id === '' ? null : data.assigned_user_id,
                created_by: data.created_by === '' ? null : data.created_by,
                last_year_visit_date: data.last_year_visit_date === '' ? null : data.last_year_visit_date
            };
            let latitude = null, longitude = null;
            if (data.address) {
                const geocoded = await geocodeAddress(data.address);
                if (geocoded) { latitude = geocoded.lat; longitude = geocoded.lng; }
            }
            const { error } = await supabase.from('maintenance_contracts').insert({
                ...cleanedData,
                city_derived,
                system_type: data.system_type,
                status: 'a_realiser',
                extrabat_id: extrabatData?.clientId || null,
                extrabat_ouvrage_id: extrabatData?.ouvrageId || null,
                latitude, longitude
            });
            if (error) throw error;
            setShowMaintenanceForm(false);
            loadData(Number(extrabatId));
        } catch (err) {
            console.error('Error creating maintenance:', err);
            alert('Erreur lors de la création du contrat');
        } finally {
            setFormLoading(false);
        }
    };


    const getClientLabel = () => {
        if (clientInfo) {
            const civilite = typeof clientInfo.civilite === 'object'
                ? clientInfo.civilite.libelle
                : (clientInfo.civilite || '');
            return `${civilite ? civilite + ' ' : ''}${clientInfo.prenom} ${clientInfo.nom}`.trim();
        }
        // Fallback: use client_name from SAV or maintenance records
        const fallbackName = savRecords[0]?.client_name || maintenanceRecords[0]?.client_name;
        return fallbackName || `Client #${extrabatId}`;
    };

    const phone = clientInfo?.telephones?.[0]?.number;
    const address = clientInfo?.adresses?.[0];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Chargement du dossier client...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Loading overlay for modal */}
            {modalLoading && (
                <div className="fixed inset-0 bg-black/30 z-[200] flex items-center justify-center">
                    <div className="bg-white rounded-xl p-6 shadow-2xl flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                        <span className="text-sm text-gray-700">Chargement...</span>
                    </div>
                </div>
            )}

            {/* SAV Modal */}
            {modalSav && (
                <div className="fixed inset-0 bg-black/50 z-[150] flex items-start justify-center overflow-y-auto py-8 px-4" onClick={() => setModalSav(null)}>
                    <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end mb-2">
                            <button
                                onClick={() => setModalSav(null)}
                                className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-600" />
                            </button>
                        </div>
                        <SavCard
                            request={modalSav}
                            onAddIntervention={(id) => goToSavPage(id)}
                            onMarkComplete={handleSavMarkComplete}
                            onArchive={handleSavArchive}
                            onEdit={(id) => goToSavPage(id)}
                            onDelete={handleSavDelete}
                            onEditIntervention={(_iId, savId) => goToSavPage(savId)}
                            onEditReport={(_iId, savId) => goToSavPage(savId)}
                            onDeleteIntervention={handleSavDeleteIntervention}
                            onRefresh={() => modalSav && openSavModal(modalSav.id)}
                        />
                    </div>
                </div>
            )}

            {/* Maintenance Modal */}
            {modalMaintenance && (
                <div className="fixed inset-0 bg-black/50 z-[150] flex items-start justify-center overflow-y-auto py-8 px-4" onClick={() => setModalMaintenance(null)}>
                    <div className="w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end mb-2">
                            <button
                                onClick={() => setModalMaintenance(null)}
                                className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-600" />
                            </button>
                        </div>
                        <MaintenanceCard
                            contract={modalMaintenance}
                            onAddIntervention={(id) => goToMaintenancePage(id)}
                            onMarkCompleted={handleMaintenanceMarkCompleted}
                            onEdit={(id) => goToMaintenancePage(id)}
                            onDelete={handleMaintenanceDelete}
                            onEditIntervention={(_iId, cId) => goToMaintenancePage(cId)}
                            onDeleteIntervention={handleMaintenanceDeleteIntervention}
                            onRefresh={() => modalMaintenance && openMaintenanceModal(modalMaintenance.id)}
                        />
                    </div>
                </div>
            )}

            {/* Bouton retour */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors group"
            >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                Retour
            </button>

            {/* Fiche client */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-start gap-5">
                    <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-7 w-7 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-gray-900">{getClientLabel()}</h1>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm text-gray-600">
                            {clientInfo?.email && <span>{clientInfo.email}</span>}
                            {phone && (
                                <span className="flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5" />
                                    {phone}
                                </span>
                            )}
                            {address && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {address.description && `${address.description}, `}{address.codePostal} {address.ville}
                                </span>
                            )}
                        </div>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">ID Extrabat : {extrabatId}</span>
                </div>

                {/* Compteurs */}
                <div className="mt-5 flex gap-4">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 rounded-lg border border-orange-100">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-semibold text-orange-800">{savRecords.length} SAV</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 rounded-lg border border-blue-100">
                        <Wrench className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-semibold text-blue-800">{maintenanceRecords.length} Maintenance</span>
                    </div>
                </div>
            </div>

            {/* Onglets + bouton d'ajout */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
                    <button
                        onClick={() => setActiveTab('sav')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'sav' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        SAV
                        <span className={`px-1.5 py-0.5 rounded text-xs ${activeTab === 'sav' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'}`}>
                            {savRecords.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('maintenance')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'maintenance' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        <Wrench className="h-4 w-4 text-blue-500" />
                        Maintenance
                        <span className={`px-1.5 py-0.5 rounded text-xs ${activeTab === 'maintenance' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                            {maintenanceRecords.length}
                        </span>
                    </button>
                </div>

                <button
                    onClick={() => activeTab === 'sav' ? setShowSavForm(true) : setShowMaintenanceForm(true)}
                    className="inline-flex items-center px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    {activeTab === 'sav' ? 'Nouvelle demande SAV' : 'Nouveau contrat'}
                </button>
            </div>

            {/* SAV Form Modal */}
            {showSavForm && (
                <div className="fixed inset-0 bg-black/50 z-[150] flex items-start justify-center overflow-y-auto py-8 px-4" onClick={() => setShowSavForm(false)}>
                    <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <SavForm
                                users={users}
                                onSubmit={handleCreateSav}
                                onCancel={() => setShowSavForm(false)}
                                loading={formLoading}
                                extrabatData={extrabatData}
                                onExtrabatDataChange={setExtrabatData}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Maintenance Form Modal */}
            {showMaintenanceForm && (
                <div className="fixed inset-0 bg-black/50 z-[150] flex items-start justify-center overflow-y-auto py-8 px-4" onClick={() => setShowMaintenanceForm(false)}>
                    <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <MaintenanceForm
                                users={users}
                                onSubmit={handleCreateMaintenance}
                                onCancel={() => setShowMaintenanceForm(false)}
                                loading={formLoading}
                                extrabatData={extrabatData}
                                onExtrabatDataChange={setExtrabatData}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Contenu onglet SAV */}
            {activeTab === 'sav' && (
                <div className="space-y-3">
                    {savRecords.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <FileWarning className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Aucun dossier SAV pour ce client</p>
                        </div>
                    ) : (
                        savRecords.map((sav) => (
                            <div
                                key={sav.id}
                                onClick={() => openSavModal(sav.id)}
                                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-primary-300 transition-all cursor-pointer group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="mt-0.5">
                                        <StatusIcon status={sav.status} type="sav" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="font-semibold text-gray-900">
                                                {SYSTEM_TYPES[sav.system_type as keyof typeof SYSTEM_TYPES] || sav.system_type}
                                            </span>
                                            {sav.site && <span className="text-sm text-gray-500">— {sav.site}</span>}
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SAV_STATUS_COLORS[sav.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {STATUS_LABELS[sav.status as keyof typeof STATUS_LABELS] || sav.status}
                                            </span>
                                            {sav.urgent && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Urgent</span>
                                            )}
                                            {sav.priority && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Prioritaire</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{sav.problem_desc}</p>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {formatDate(sav.requested_at)}
                                            </span>
                                            {sav.city_derived && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {sav.city_derived}
                                                </span>
                                            )}
                                            {sav.assigned_user && sav.assigned_user.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3.5 w-3.5" />
                                                    {sav.assigned_user[0].display_name || sav.assigned_user[0].email}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary-500 flex-shrink-0 mt-1 transition-colors" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Contenu onglet Maintenance */}
            {activeTab === 'maintenance' && (
                <div className="space-y-3">
                    {maintenanceRecords.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <FileWarning className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">Aucun contrat de maintenance pour ce client</p>
                        </div>
                    ) : (
                        maintenanceRecords.map((contract) => (
                            <div
                                key={contract.id}
                                onClick={() => openMaintenanceModal(contract.id)}
                                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-primary-300 transition-all cursor-pointer group"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="mt-0.5">
                                        <StatusIcon status={contract.status} type="maint" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="font-semibold text-gray-900">
                                                {SYSTEM_TYPES[contract.system_type as keyof typeof SYSTEM_TYPES] || contract.system_type}
                                            </span>
                                            {contract.site && <span className="text-sm text-gray-500">— {contract.site}</span>}
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MAINT_STATUS_COLORS[contract.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {MAINTENANCE_STATUS_LABELS[contract.status as keyof typeof MAINTENANCE_STATUS_LABELS] || contract.status}
                                            </span>
                                            {contract.priority && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Prioritaire</span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                Créé le {formatDate(contract.created_at)}
                                            </span>
                                            {contract.battery_installation_year && (
                                                <span className="flex items-center gap-1">
                                                    <Tag className="h-3.5 w-3.5" />
                                                    Piles {contract.battery_installation_year}
                                                </span>
                                            )}
                                            {contract.city_derived && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {contract.city_derived}
                                                </span>
                                            )}
                                            {contract.assigned_user && contract.assigned_user.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3.5 w-3.5" />
                                                    {contract.assigned_user[0].display_name || contract.assigned_user[0].email}
                                                </span>
                                            )}
                                            {contract.annual_amount && (
                                                <span className="flex items-center gap-1 font-medium text-gray-700">
                                                    {contract.annual_amount.toLocaleString('fr-FR')} €/an
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary-500 flex-shrink-0 mt-1 transition-colors" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
