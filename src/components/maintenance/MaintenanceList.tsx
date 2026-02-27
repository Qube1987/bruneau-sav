import React, { useState, useEffect } from 'react';
import { MaintenanceCard } from './MaintenanceCard';
import { MaintenanceTableRow } from './MaintenanceTableRow';
import { MaintenanceFilters } from './MaintenanceFilters';
import { MaintenanceForm } from './MaintenanceForm';
import { MaintenanceInterventionForm } from './MaintenanceInterventionForm';
import { MaintenanceStats } from './MaintenanceStats';
import { MaintenanceDashboard } from './MaintenanceDashboard';
import { useMaintenanceContracts } from '../../hooks/useMaintenanceContracts';
import { useGeocoding } from '../../hooks/useGeocoding';
import { supabase } from '../../lib/supabase';
import { Plus, LayoutGrid, List, Loader, AlertTriangle, Database, RotateCcw, Map, RefreshCw, BarChart3 } from 'lucide-react';
import { MaintenanceFilters as MaintenanceFiltersType } from '../../types';
import { useExtrabat } from '../../hooks/useExtrabat';
import { MapView } from '../common/MapView';
import { useAuth } from '../../hooks/useAuth';
import { Calendar } from '../calendar/Calendar';

export const MaintenanceList: React.FC = () => {
  const { canAccessBillingInfo } = useAuth();
  const [filters, setFilters] = useState<MaintenanceFiltersType>({
    sort: 'client_name',
    order: 'asc'
  });
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'map' | 'dashboard'>('table');
  const [showContractForm, setShowContractForm] = useState(false);
  const [showInterventionForm, setShowInterventionForm] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [extrabatData, setExtrabatData] = useState<{ clientId?: number; ouvrageId?: number }>({});
  const [users, setUsers] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const { createAppointment, updateAppointment, deleteAppointment } = useExtrabat();
  const { geocodeAddress } = useGeocoding();

  const { contracts, loading: contractsLoading, error, tablesExist, refetch } = useMaintenanceContracts(filters);

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
          .from('maintenance_contracts')
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

  const handleCreateContract = async (data: any) => {
    try {
      setLoading(true);
      
      // Extract city from address if provided
      let city_derived = null;
      if (data.address) {
        const cityMatch = data.address.match(/\d{5}\s+([^,]+)/);
        if (cityMatch) {
          city_derived = cityMatch[1].trim();
        }
      }

      // Handle empty UUID fields and date fields - convert empty strings to null
      const cleanedData = {
        ...data,
        assigned_user_id: data.assigned_user_id === '' ? null : data.assigned_user_id,
        created_by: data.created_by === '' ? null : data.created_by,
        last_year_visit_date: data.last_year_visit_date === '' ? null : data.last_year_visit_date
      };

      // Geocode address to get coordinates
      let latitude = null;
      let longitude = null;
      if (data.address) {
        const geocoded = await geocodeAddress(data.address);
        if (geocoded) {
          latitude = geocoded.lat;
          longitude = geocoded.lng;
        }
      }

      const { data: newContract, error } = await supabase
        .from('maintenance_contracts')
        .insert({
          ...cleanedData,
          city_derived,
          system_type: data.system_type,
          status: 'a_realiser',
          extrabat_id: extrabatData?.clientId || null,
          extrabat_ouvrage_id: extrabatData?.ouvrageId || null,
          latitude,
          longitude
        })
        .select()
        .single();

      if (error) throw error;

      setShowContractForm(false);
      
      // Reset Extrabat data
      setExtrabatData({});
      
      refetch();
    } catch (err) {
      console.error('Error creating maintenance contract:', err);
      alert('Erreur lors de la création du contrat');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContract = async (data: any) => {
    try {
      setLoading(true);
      
      // Extract city from address if provided
      let city_derived = null;
      if (data.address) {
        const cityMatch = data.address.match(/\d{5}\s+([^,]+)/);
        if (cityMatch) {
          city_derived = cityMatch[1].trim();
        }
      }

      // Handle empty UUID fields and date fields - convert empty strings to null
      const cleanedData = {
        ...data,
        assigned_user_id: data.assigned_user_id === '' ? null : data.assigned_user_id,
        created_by: data.created_by === '' ? null : data.created_by,
        last_year_visit_date: data.last_year_visit_date === '' ? null : data.last_year_visit_date
      };

      // Geocode address if it changed
      let latitude = editingContract.latitude;
      let longitude = editingContract.longitude;
      if (data.address && data.address !== editingContract.address) {
        const geocoded = await geocodeAddress(data.address);
        if (geocoded) {
          latitude = geocoded.lat;
          longitude = geocoded.lng;
        }
      }

      const { error } = await supabase
        .from('maintenance_contracts')
        .update({
          ...cleanedData,
          city_derived,
          system_type: data.system_type,
          latitude,
          longitude
        })
        .eq('id', editingContract.id);

      if (error) throw error;

      setShowContractForm(false);
      setEditingContract(null);
      
      refetch();
    } catch (err) {
      console.error('Error updating maintenance contract:', err);
      alert('Erreur lors de la modification du contrat');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIntervention = async (data: any) => {
    try {
      setLoading(true);

      if (editingIntervention) {
        // Update existing intervention
        const { error } = await supabase
          .from('maintenance_interventions')
          .update({
            started_at: data.started_at,
            ended_at: data.ended_at || null,
            scheduled_at: data.started_at,
            completed_at: data.ended_at || null,
            technician_id: data.technician_ids?.[0] || null,
            notes: data.notes || null,
            status: data.ended_at ? 'realisee' : 'prevue'
          })
          .eq('id', editingIntervention.id);

        if (error) throw error;

        // Update technicians for the intervention
        // Delete existing technician assignments
        await supabase
          .from('maintenance_intervention_technicians')
          .delete()
          .eq('maintenance_intervention_id', editingIntervention.id);

        // Insert new technician assignments
        if (data.technician_ids && data.technician_ids.length > 0) {
          const { error: techError } = await supabase
            .from('maintenance_intervention_technicians')
            .insert(
              data.technician_ids.map((techId: string) => ({
                maintenance_intervention_id: editingIntervention.id,
                technician_id: techId
              }))
            );

          if (techError) throw techError;
        }

        // Update batteries for the intervention
        // Delete existing battery assignments
        await supabase
          .from('intervention_batteries')
          .delete()
          .eq('intervention_id', editingIntervention.id)
          .eq('intervention_type', 'maintenance');

        // Insert new battery assignments
        if (data.batteries && data.batteries.length > 0) {
          const { data: batteryProducts } = await supabase
            .from('battery_products')
            .select('id, unit_price')
            .in('id', data.batteries.map((b: any) => b.battery_product_id));

          const batteryRecords = data.batteries.map((battery: any) => {
            const product = batteryProducts?.find(p => p.id === battery.battery_product_id);
            return {
              intervention_id: editingIntervention.id,
              intervention_type: 'maintenance',
              battery_product_id: battery.battery_product_id,
              quantity: battery.quantity,
              unit_price: product?.unit_price || 0
            };
          });

          const { error: batteryError } = await supabase
            .from('intervention_batteries')
            .insert(batteryRecords);

          if (batteryError) throw batteryError;
        }

        // Update Extrabat appointment if exists
        if (editingIntervention.extrabat_intervention_id && data.technician_ids && data.technician_ids.length > 0) {
          const selectedContract = contracts.find(c => c.id === selectedContractId);

          // Get all Extrabat codes for selected technicians
          const technicianCodes = data.technician_ids
            .map((techId: string) => users.find(u => u.id === techId)?.extrabat_code)
            .filter((code): code is string => !!code);

          if (technicianCodes.length > 0 && selectedContract) {
            const extrabatResult = await updateAppointment(
              editingIntervention.extrabat_intervention_id,
              technicianCodes,
              {
                clientName: selectedContract.client_name,
                systemType: selectedContract.system_type,
                problemDesc: `Maintenance préventive - ${selectedContract.system_type}`,
                startedAt: data.started_at,
                endedAt: data.ended_at,
                address: selectedContract.address
              },
              selectedContract.extrabat_id || undefined
            );

            if (!extrabatResult.success) {
              console.warn('Failed to update Extrabat appointment:', extrabatResult.error);
            } else {
              console.log('Extrabat appointment updated successfully');
            }
          }
        }
      } else {
        // Insert new intervention
        const { data: newIntervention, error } = await supabase
          .from('maintenance_interventions')
          .insert({
            contract_id: selectedContractId,
            started_at: data.started_at,
            ended_at: data.ended_at || null,
            scheduled_at: data.started_at,
            completed_at: data.ended_at || null,
            technician_id: data.technician_ids?.[0] || null,
            notes: data.notes || null,
            status: data.ended_at ? 'realisee' : 'prevue'
          })
          .select()
          .single();

        if (error) throw error;

        // Insert technician assignments
        if (data.technician_ids && data.technician_ids.length > 0) {
          const { error: techError } = await supabase
            .from('maintenance_intervention_technicians')
            .insert(
              data.technician_ids.map((techId: string) => ({
                maintenance_intervention_id: newIntervention.id,
                technician_id: techId
              }))
            );

          if (techError) throw techError;
        }

        // Insert battery assignments
        if (data.batteries && data.batteries.length > 0) {
          const { data: batteryProducts } = await supabase
            .from('battery_products')
            .select('id, unit_price')
            .in('id', data.batteries.map((b: any) => b.battery_product_id));

          const batteryRecords = data.batteries.map((battery: any) => {
            const product = batteryProducts?.find(p => p.id === battery.battery_product_id);
            return {
              intervention_id: newIntervention.id,
              intervention_type: 'maintenance',
              battery_product_id: battery.battery_product_id,
              quantity: battery.quantity,
              unit_price: product?.unit_price || 0
            };
          });

          const { error: batteryError } = await supabase
            .from('intervention_batteries')
            .insert(batteryRecords);

          if (batteryError) throw batteryError;
        }

        // Update contract status
        const newContractStatus = data.ended_at ? 'realisee' : 'prevue';
        await supabase
          .from('maintenance_contracts')
          .update({ status: newContractStatus })
          .eq('id', selectedContractId);

        // Create Extrabat appointment for all technicians
        if (data.technician_ids && data.technician_ids.length > 0) {
          const selectedContract = contracts.find(c => c.id === selectedContractId);

          // Get all Extrabat codes for selected technicians
          const technicianCodes = data.technician_ids
            .map((techId: string) => users.find(u => u.id === techId)?.extrabat_code)
            .filter((code): code is string => !!code);

          if (technicianCodes.length > 0 && selectedContract) {
            const extrabatResult = await createAppointment(
              technicianCodes,
              {
                clientName: selectedContract.client_name,
                systemType: selectedContract.system_type,
                problemDesc: `Maintenance préventive - ${selectedContract.system_type}`,
                startedAt: data.started_at,
                endedAt: data.ended_at,
                address: selectedContract.address,
                latitude: selectedContract.latitude,
                longitude: selectedContract.longitude
              },
              selectedContract.extrabat_id || undefined
            );

            if (!extrabatResult.success) {
              console.warn('Failed to create Extrabat appointment:', extrabatResult.error);
            } else {
              console.log('Extrabat appointment created successfully');

              // Store Extrabat appointment ID in the intervention
              if (extrabatResult.data?.id) {
                await supabase
                  .from('maintenance_interventions')
                  .update({ extrabat_intervention_id: extrabatResult.data.id })
                  .eq('id', newIntervention.id);
              }
            }
          }
        }
      }

      setShowInterventionForm(false);
      setSelectedContractId(null);
      setEditingIntervention(null);
      
      refetch();
    } catch (err) {
      console.error('Error adding intervention:', err);
      alert(editingIntervention ? 'Erreur lors de la modification de l\'intervention' : 'Erreur lors de l\'ajout de l\'intervention');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async (id: string) => {
    try {
      // Save scroll position
      const scrollY = window.scrollY;

      const contract = contracts.find(c => c.id === id);
      if (!contract) return;

      const newStatus = contract.status === 'realisee' ? 'a_realiser' : 'realisee';

      const { error } = await supabase
        .from('maintenance_contracts')
        .update({
          status: newStatus
        })
        .eq('id', id);

      if (error) throw error;

      await refetch();

      // Restore scroll position
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Erreur lors de la mise à jour du statut');
    }
  };

  const handleTogglePriority = async (id: string) => {
    try {
      const scrollY = window.scrollY;
      const contract = contracts.find(c => c.id === id);

      const { error } = await supabase
        .from('maintenance_contracts')
        .update({ priority: !contract?.priority })
        .eq('id', id);

      if (error) throw error;

      await refetch();

      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } catch (err) {
      console.error('Error toggling priority:', err);
      alert('Erreur lors de la modification de la priorité');
    }
  };

  const handleToggleInvoiceSent = async (id: string) => {
    try {
      const scrollY = window.scrollY;
      const contract = contracts.find(c => c.id === id);

      const { error } = await supabase
        .from('maintenance_contracts')
        .update({ invoice_sent: !contract?.invoice_sent })
        .eq('id', id);

      if (error) throw error;

      await refetch();

      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } catch (err) {
      console.error('Error toggling invoice sent status:', err);
      alert('Erreur lors de la modification du statut de facture envoyée');
    }
  };

  const handleToggleInvoicePaid = async (id: string) => {
    try {
      const scrollY = window.scrollY;
      const contract = contracts.find(c => c.id === id);

      const { error } = await supabase
        .from('maintenance_contracts')
        .update({ invoice_paid: !contract?.invoice_paid })
        .eq('id', id);

      if (error) throw error;

      await refetch();

      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } catch (err) {
      console.error('Error toggling invoice paid status:', err);
      alert('Erreur lors de la modification du statut de facture réglée');
    }
  };

  const handleResetAll = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les contrats au statut "À réaliser" ? Les interventions déjà saisies seront conservées en base de données.')) {
      return;
    }

    try {
      setLoading(true);

      const { data: allContracts, error: fetchError } = await supabase
        .from('maintenance_contracts')
        .select('id');

      if (fetchError) throw fetchError;

      if (allContracts && allContracts.length > 0) {
        const contractIds = allContracts.map(c => c.id);

        const { error: updateError } = await supabase
          .from('maintenance_contracts')
          .update({ status: 'a_realiser' })
          .in('id', contractIds);

        if (updateError) throw updateError;
      }

      alert('Tous les contrats ont été réinitialisés avec succès. Les interventions existantes ont été conservées.');
      refetch();
    } catch (err) {
      console.error('Error resetting contracts:', err);
      alert('Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  const handleEditIntervention = (interventionId: string, contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    const intervention = contract?.interventions?.find(i => i.id === interventionId);
    if (intervention) {
      setEditingIntervention(intervention);
      setSelectedContractId(contractId);
      setShowInterventionForm(true);
    }
  };

  const handleDeleteIntervention = async (interventionId: string) => {
    try {
      // Get intervention details first to check for Extrabat ID
      const { data: intervention, error: fetchError } = await supabase
        .from('maintenance_interventions')
        .select('extrabat_intervention_id')
        .eq('id', interventionId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from Extrabat if there's an appointment
      if (intervention?.extrabat_intervention_id) {
        const extrabatResult = await deleteAppointment(intervention.extrabat_intervention_id);

        if (!extrabatResult.success) {
          console.warn('Failed to delete Extrabat appointment:', extrabatResult.error);
          // Continue with local deletion even if Extrabat fails
        } else {
          console.log('Extrabat appointment deleted successfully');
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('maintenance_interventions')
        .delete()
        .eq('id', interventionId);

      if (error) throw error;

      refetch();
    } catch (err) {
      console.error('Error deleting intervention:', err);
      alert('Erreur lors de la suppression de l\'intervention');
    }
  };

  const handleDeleteContract = async (id: string) => {
    try {
      const { error } = await supabase
        .from('maintenance_contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      refetch();
    } catch (err) {
      console.error('Error deleting maintenance contract:', err);
      alert('Erreur lors de la suppression du contrat');
    }
  };

  const selectedContract = contracts.find(c => c.id === selectedContractId);

  if (!tablesExist) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-6 h-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-amber-800">Database Setup Required</h3>
        </div>
        <div className="space-y-3 text-amber-700">
          <p>The maintenance database tables haven't been created yet. To use this module, you need to set up the database schema.</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Contrats de maintenance</h1>
          <p className="text-gray-600 mt-1">
            {contracts.length} contrat{contracts.length !== 1 ? 's' : ''}
            {contractsLoading && ' (chargement...)'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {canAccessBillingInfo && (
            <button
              onClick={() => setViewMode('dashboard')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              <BarChart3 className="h-5 w-5 mr-2" />
              Tableau de bord
            </button>
          )}

          <button
            onClick={() => setShowContractForm(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouveau contrat
          </button>

          <button
            onClick={handleResetAll}
            className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Réinitialiser
          </button>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-primary-700'
              }`}
              title="Vue cartes"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-primary-700'
              }`}
              title="Vue liste"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'map'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-primary-700'
              }`}
              title="Vue carte"
            >
              <Map className="h-4 w-4" />
            </button>
          </div>
          {viewMode === 'map' && (
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Actualiser les données"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>
          )}
        </div>
      </div>

      {/* Dashboard View - Only for authorized users */}
      {viewMode === 'dashboard' && canAccessBillingInfo ? (
        <MaintenanceDashboard contracts={contracts} onBack={() => setViewMode('cards')} />
      ) : (
        <>
          {/* Statistics */}
          <MaintenanceStats contracts={contracts} />

          {/* Filters */}
          <MaintenanceFilters
            filters={filters}
            onFiltersChange={setFilters}
            users={users}
            cities={cities}
          />

          {/* Calendar */}
          <Calendar />

          {/* Loading State */}
          {contractsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 animate-spin text-primary-600" />
              <span className="ml-3 text-gray-600">Chargement des contrats...</span>
            </div>
          )}

          {/* Results */}
          {!contractsLoading && contracts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Aucun contrat de maintenance trouvé</p>
              <p className="text-gray-400 mt-2">Modifiez vos filtres ou créez un nouveau contrat</p>
            </div>
          )}

          {!contractsLoading && contracts.length > 0 && (
            <>
              {viewMode === 'cards' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {contracts.map((contract) => (
                <MaintenanceCard
                  key={contract.id}
                  contract={contract}
                  onAddIntervention={(id) => {
                    setSelectedContractId(id);
                    setShowInterventionForm(true);
                  }}
                  onMarkCompleted={handleMarkCompleted}
                  onEdit={(id) => {
                    const contract = contracts.find(c => c.id === id);
                    setEditingContract(contract);
                    setShowContractForm(true);
                  }}
                  onDelete={handleDeleteContract}
                  onEditIntervention={handleEditIntervention}
                  onDeleteIntervention={handleDeleteIntervention}
                  onRefresh={refetch}
                  onToggleInvoiceSent={handleToggleInvoiceSent}
                  onToggleInvoicePaid={handleToggleInvoicePaid}
                />
              ))}
            </div>
          ) : viewMode === 'table' ? (
            <div className="space-y-2">
              {contracts.map((contract) => (
                <MaintenanceTableRow
                  key={contract.id}
                  contract={contract}
                  onAddIntervention={(id) => {
                    setSelectedContractId(id);
                    setShowInterventionForm(true);
                  }}
                  onMarkCompleted={handleMarkCompleted}
                  onEdit={(id) => {
                    const contract = contracts.find(c => c.id === id);
                    setEditingContract(contract);
                    setShowContractForm(true);
                  }}
                  onDelete={handleDeleteContract}
                  onEditIntervention={handleEditIntervention}
                  onDeleteIntervention={handleDeleteIntervention}
                  onTogglePriority={handleTogglePriority}
                  onRefresh={refetch}
                  onToggleInvoiceSent={handleToggleInvoiceSent}
                  onToggleInvoicePaid={handleToggleInvoicePaid}
                />
              ))}
            </div>
          ) : (
            <MapView
              locations={contracts.map(contract => ({
                id: contract.id,
                clientName: contract.client_name,
                address: contract.address || '',
                status: contract.status,
                type: 'maintenance',
                systemType: contract.system_type,
                priority: contract.priority,
                problemDesc: contract.observations,
                latitude: contract.latitude,
                longitude: contract.longitude
              }))}
              onLocationClick={(locationId) => {
                setSelectedContractId(locationId);
                setShowDetailsModal(true);
              }}
            />
          )}
        </>
      )}

      {/* Modals */}
      {showContractForm && (
        <MaintenanceForm
          contract={editingContract}
          users={users}
          extrabatData={extrabatData}
          onExtrabatDataChange={setExtrabatData}
          onSubmit={editingContract ? handleUpdateContract : handleCreateContract}
          onCancel={() => {
            setShowContractForm(false);
            setEditingContract(null);
            setExtrabatData({});
          }}
          loading={loading}
        />
      )}

      {showInterventionForm && selectedContract && (
        <MaintenanceInterventionForm
          contractId={selectedContractId!}
          clientName={selectedContract.client_name}
          intervention={editingIntervention}
          users={users}
          onSubmit={handleAddIntervention}
          onCancel={() => {
            setShowInterventionForm(false);
            setSelectedContractId(null);
            setEditingIntervention(null);
          }}
          loading={loading}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Détails du contrat de maintenance</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedContractId(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <MaintenanceCard
                contract={selectedContract}
                onAddIntervention={(id) => {
                  setShowDetailsModal(false);
                  setSelectedContractId(id);
                  setShowInterventionForm(true);
                }}
                onEdit={(id) => {
                  setShowDetailsModal(false);
                  const contract = contracts.find(c => c.id === id);
                  setEditingContract(contract);
                  setShowContractForm(true);
                }}
                onDelete={(id) => {
                  setShowDetailsModal(false);
                  handleDeleteContract(id);
                }}
                onEditIntervention={(interventionId, contractId) => {
                  setShowDetailsModal(false);
                  handleEditIntervention(interventionId, contractId);
                }}
                onDeleteIntervention={handleDeleteIntervention}
                onTogglePriority={handleTogglePriority}
                onRefresh={refetch}
              />
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};