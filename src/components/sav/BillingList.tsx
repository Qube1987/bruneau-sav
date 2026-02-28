import React, { useState, useEffect } from 'react';
import { SavCard } from './SavCard';
import { SavTableRow } from './SavTableRow';
import { SavFilters } from './SavFilters';
import { InterventionForm } from './InterventionForm';
import { SavForm } from './SavForm';
import { ReportForm } from './ReportForm';
import { useSavRequests } from '../../hooks/useSavRequests';
import { useBatteries } from '../../hooks/useBatteries';
import { supabase } from '../../lib/supabase';
import { LayoutGrid, List, Loader, AlertTriangle, Database, Receipt, CheckCircle, ArrowLeft } from 'lucide-react';
import { SavFilters as SavFiltersType } from '../../types';

export const BillingList: React.FC = () => {
  const [filters, setFilters] = useState<SavFiltersType>({
    billing_status: 'to_bill',
    sort: 'resolved_at',
    order: 'desc'
  });
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showInterventionForm, setShowInterventionForm] = useState(false);
  const [selectedSavId, setSelectedSavId] = useState<string | null>(null);
  const [editingIntervention, setEditingIntervention] = useState(null);
  const [editingSav, setEditingSav] = useState(null);
  const [showSavForm, setShowSavForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [users, setUsers] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [extrabatData, setExtrabatData] = useState({});

  const { requests, loading: requestsLoading, error, tablesExist, refetch } = useSavRequests(filters);
  const { saveInterventionBatteries } = useBatteries();

  // Fetch users and cities for filters
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users
        const { data: usersData } = await supabase
          .from('users')
          .select('id, display_name, email, phone, role, extrabat_code')
          .order('display_name');

        if (usersData) setUsers(usersData);

        // Fetch unique cities
        const { data: citiesData } = await supabase
          .from('sav_requests')
          .select('city_derived')
          .not('city_derived', 'is', null)
          .neq('city_derived', '');

        if (citiesData) {
          const uniqueCities = [...new Set(citiesData.map(item => item.city_derived))];
          setCities(uniqueCities.sort());
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, []);

  const handleAddIntervention = async (data: any) => {
    try {
      setLoading(true);

      if (editingIntervention) {
        // Update existing intervention
        const { error } = await supabase
          .from('sav_interventions')
          .update({
            started_at: data.started_at,
            ended_at: data.ended_at || null,
            technician_id: data.technician_ids?.[0] || null,
            notes: data.notes || null
          })
          .eq('id', editingIntervention.id);

        if (error) throw error;

        // Update technicians for the intervention
        // Delete existing technician assignments
        await supabase
          .from('sav_intervention_technicians')
          .delete()
          .eq('sav_intervention_id', editingIntervention.id);

        // Insert new technician assignments
        if (data.technician_ids && data.technician_ids.length > 0) {
          const { error: techError } = await supabase
            .from('sav_intervention_technicians')
            .insert(
              data.technician_ids.map((techId: string) => ({
                sav_intervention_id: editingIntervention.id,
                technician_id: techId
              }))
            );

          if (techError) throw techError;
        }
      } else {
        // Insert new intervention
        const { data: newIntervention, error } = await supabase
          .from('sav_interventions')
          .insert({
            sav_request_id: selectedSavId,
            started_at: data.started_at,
            ended_at: data.ended_at || null,
            technician_id: data.technician_ids?.[0] || null,
            notes: data.notes || null
          })
          .select()
          .single();

        if (error) throw error;

        // Insert technician assignments
        if (data.technician_ids && data.technician_ids.length > 0) {
          const { error: techError } = await supabase
            .from('sav_intervention_technicians')
            .insert(
              data.technician_ids.map((techId: string) => ({
                sav_intervention_id: newIntervention.id,
                technician_id: techId
              }))
            );

          if (techError) throw techError;
        }
      }

      setShowInterventionForm(false);
      setSelectedSavId(null);
      setEditingIntervention(null);

      refetch();
    } catch (err) {
      console.error('Error adding intervention:', err);
      alert(editingIntervention ? 'Erreur lors de la modification de l\'intervention' : 'Erreur lors de l\'ajout de l\'intervention');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkBilled = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sav_requests')
        .update({
          billing_status: 'billed',
          billed_at: new Date().toISOString(),
          status: 'archivee',
          archived_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      refetch();
    } catch (err) {
      console.error('Error marking as billed:', err);
      alert('Erreur lors du marquage comme facturé');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sav_requests')
        .update({
          status: 'en_cours',
          billing_status: 'to_bill',
          archived_at: null,
          billed_at: null
        })
        .eq('id', id);

      if (error) throw error;

      refetch();
    } catch (err) {
      console.error('Error reactivating SAV:', err);
      alert('Erreur lors de la réactivation');
    }
  };

  const handleDeleteSav = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande SAV ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sav_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      refetch();
    } catch (err) {
      console.error('Error deleting SAV:', err);
      alert('Erreur lors de la suppression de la demande SAV');
    }
  };

  const handleUpdateSav = async (data: any) => {
    try {
      setLoading(true);

      console.log('=== BillingList handleUpdateSav called ===');
      console.log('Data received:', data);
      console.log('problem_desc_reformule:', data.problem_desc_reformule);

      // Extract city from address if provided
      let city_derived = null;
      if (data.address) {
        const cityMatch = data.address.match(/\d{5}\s+([^,]+)/);
        if (cityMatch) {
          city_derived = cityMatch[1].trim();
        }
      }

      const { error } = await supabase
        .from('sav_requests')
        .update({
          client_name: data.client_name,
          site: data.site || null,
          client_email: data.client_email || null,
          phone: data.phone || null,
          address: data.address || null,
          city_derived: city_derived,
          system_type: data.system_type,
          system_brand: data.system_brand || null,
          system_model: data.system_model || null,
          problem_desc: data.problem_desc,
          problem_desc_reformule: data.problem_desc_reformule || null,
          observations: data.observations || null,
          assigned_user_id: data.assigned_user_id || null,
          urgent: data.urgent || false,
          priority: data.urgent || false,
          extrabat_id: data.extrabat_id || null,
          extrabat_ouvrage_id: data.extrabat_ouvrage_id || null
        })
        .eq('id', editingSav.id);

      if (error) throw error;

      console.log('✓ SAV request updated successfully');
      alert('Demande SAV mise à jour avec succès');

      setShowSavForm(false);
      setEditingSav(null);

      refetch();
    } catch (err) {
      console.error('Error updating SAV:', err);
      alert('Erreur lors de la modification de la demande SAV');
    } finally {
      setLoading(false);
    }
  };

  const handleEditIntervention = (interventionId: string, savRequestId: string) => {
    const sav = requests.find(r => r.id === savRequestId);
    const intervention = sav?.interventions?.find(i => i.id === interventionId);
    if (intervention) {
      setEditingIntervention(intervention);
      setSelectedSavId(savRequestId);
      setShowInterventionForm(true);
    }
  };

  const handleDeleteIntervention = async (interventionId: string) => {
    try {
      const { error } = await supabase
        .from('sav_interventions')
        .delete()
        .eq('id', interventionId);

      if (error) throw error;

      refetch();
    } catch (err) {
      console.error('Error deleting intervention:', err);
      alert('Erreur lors de la suppression de l\'intervention');
    }
  };

  const handleEditReport = (interventionId: string, savRequestId: string) => {
    const sav = requests.find(r => r.id === savRequestId);
    if (!sav) {
      alert('Erreur: Demande SAV introuvable');
      return;
    }

    const intervention = sav.interventions?.find(i => i.id === interventionId);
    if (!intervention) {
      alert('Erreur: Intervention introuvable');
      return;
    }

    setEditingIntervention(intervention);
    setSelectedSavId(savRequestId);
    setShowReportForm(true);
  };

  const handleUpdateReport = async (data: { rapport_brut: string; rapport_reformule: string; batteries?: any[]; has_battery_change?: boolean }) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('sav_interventions')
        .update({
          rapport_brut: data.rapport_brut,
          rapport_reformule: data.rapport_reformule,
          has_battery_change: data.has_battery_change || false
        })
        .eq('id', editingIntervention.id);

      if (error) throw error;

      // Save batteries if provided
      if (data.batteries) {
        await saveInterventionBatteries(editingIntervention.id, 'sav', data.batteries);
      }

      setShowReportForm(false);
      setEditingIntervention(null);
      setSelectedSavId(null);

      refetch();
    } catch (err) {
      console.error('Error updating report:', err);
      alert('Erreur lors de la mise à jour du rapport');
    } finally {
      setLoading(false);
    }
  };

  const selectedSav = requests.find(r => r.id === selectedSavId);

  if (!tablesExist) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-6 h-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-amber-800">Database Setup Required</h3>
        </div>
        <div className="space-y-3 text-amber-700">
          <p>The database tables haven't been created yet. To use this application, you need to set up the database schema.</p>
        </div>
      </div>
    );
  }

  if (error && tablesExist) {
    return (
      <div className="max-w-md mx-auto mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h3 className="font-medium text-red-800">Error</h3>
        </div>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Receipt className="h-6 w-6 mr-2 text-primary-900" />
            À facturer
          </h1>
          <p className="text-gray-600 mt-1">
            {requests.length} demande{requests.length !== 1 ? 's' : ''} terminée{requests.length !== 1 ? 's' : ''} à facturer
            {requestsLoading && ' (chargement...)'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 sm:flex-none justify-center inline-flex items-center px-4 py-3 sm:py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors min-h-[44px]"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span className="truncate">Retour aux SAV</span>
          </button>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${viewMode === 'cards'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-primary-700'
                }`}
            >
              <LayoutGrid className="h-5 w-5 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ${viewMode === 'table'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-primary-700'
                }`}
            >
              <List className="h-5 w-5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <SavFilters
        filters={filters}
        onFiltersChange={setFilters}
        users={users}
        cities={cities}
        showBillingFilter={true}
      />

      {/* Loading State */}
      {requestsLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-primary-600" />
          <span className="ml-3 text-gray-600">Chargement des demandes...</span>
        </div>
      )}

      {/* Results */}
      {!requestsLoading && requests.length === 0 && (
        <div className="text-center py-12">
          <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Aucune demande à facturer</p>
          <p className="text-gray-400 mt-2">Les SAV terminés apparaîtront ici</p>
        </div>
      )}

      {!requestsLoading && requests.length > 0 && (
        <>
          {viewMode === 'cards' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {requests.map((request) => (
                <div key={request.id} className="relative">
                  <SavCard
                    request={request}
                    onAddIntervention={(id) => {
                      setSelectedSavId(id);
                      setShowInterventionForm(true);
                    }}
                    onMarkComplete={() => { }} // Disabled for billing page
                    onArchive={() => { }} // Disabled for billing page
                    onEdit={(id) => {
                      const sav = requests.find(r => r.id === id);
                      setEditingSav(sav);
                      setShowSavForm(true);
                    }}
                    onDelete={handleDeleteSav}
                    onEditIntervention={handleEditIntervention}
                    onEditReport={handleEditReport}
                    onDeleteIntervention={handleDeleteIntervention}
                    showBillingActions={true}
                    onMarkBilled={handleMarkBilled}
                    onReactivate={handleReactivate}
                    onRefresh={refetch}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => (
                <SavTableRow
                  key={request.id}
                  request={request}
                  onAddIntervention={(id) => {
                    setSelectedSavId(id);
                    setShowInterventionForm(true);
                  }}
                  onMarkComplete={() => { }} // Disabled for billing page
                  onArchive={() => { }} // Disabled for billing page
                  onEdit={(id) => {
                    const sav = requests.find(r => r.id === id);
                    setEditingSav(sav);
                    setShowSavForm(true);
                  }}
                  onDelete={handleDeleteSav}
                  onEditIntervention={handleEditIntervention}
                  onEditReport={handleEditReport}
                  onDeleteIntervention={handleDeleteIntervention}
                  showBillingActions={true}
                  onMarkBilled={handleMarkBilled}
                  onReactivate={handleReactivate}
                  onRefresh={refetch}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* SAV Form Modal */}
      {showSavForm && editingSav && (
        <SavForm
          request={editingSav}
          users={users}
          extrabatData={extrabatData}
          onExtrabatDataChange={setExtrabatData}
          onSubmit={handleUpdateSav}
          onCancel={() => {
            setShowSavForm(false);
            setEditingSav(null);
            setExtrabatData({});
          }}
          loading={loading}
        />
      )}

      {/* Intervention Form Modal */}
      {showInterventionForm && selectedSav && (
        <InterventionForm
          savRequestId={selectedSavId!}
          clientName={selectedSav.client_name}
          intervention={editingIntervention}
          users={users}
          onSubmit={handleAddIntervention}
          onCancel={() => {
            setShowInterventionForm(false);
            setSelectedSavId(null);
            setEditingIntervention(null);
          }}
          loading={loading}
        />
      )}

      {/* Report Form Modal */}
      {showReportForm && editingIntervention && selectedSav && (
        <ReportForm
          intervention={editingIntervention}
          clientName={selectedSav.client_name}
          onSubmit={handleUpdateReport}
          onCancel={() => {
            setShowReportForm(false);
            setEditingIntervention(null);
            setSelectedSavId(null);
          }}
          loading={loading}
        />
      )}
    </div>
  );
};