import React, { useState, useEffect } from 'react';
import { SavCard } from './SavCard';
import { SavTableRow } from './SavTableRow';
import { SavFilters } from './SavFilters';
import { SavForm } from './SavForm';
import { InterventionForm } from './InterventionForm';
import { ReportForm } from './ReportForm';
import { SavDashboard } from './SavDashboard';
import { useSavRequests } from '../../hooks/useSavRequests';
import { useSavStatistics } from '../../hooks/useSavStatistics';

import { useExtrabat } from '../../hooks/useExtrabat';
import { useGeocoding } from '../../hooks/useGeocoding';
import { useAuth } from '../../hooks/useAuth';
import { useBatteries } from '../../hooks/useBatteries';
import { supabase } from '../../lib/supabase';
import { Plus, LayoutGrid, List, Loader, AlertTriangle, Database, Receipt, Map, RefreshCw, BarChart3, User, Users, Zap, Clock, Battery, AlertOctagon } from 'lucide-react';
import { SavFilters as SavFiltersType } from '../../types';
import { MapView } from '../common/MapView';
import { Calendar } from '../calendar/Calendar';

export const SavList: React.FC = () => {
  const { userProfile } = useAuth();
  const [showOnlyMySav, setShowOnlyMySav] = useState(false);
  const [filters, setFilters] = useState<SavFiltersType>({
    sort: 'requested_at',
    order: 'desc',
    status: 'active' // Only show active SAV requests (nouvelle, en_cours)
  });
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'map' | 'dashboard'>('table');
  const [showSavForm, setShowSavForm] = useState(false);
  const [showInterventionForm, setShowInterventionForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedSavId, setSelectedSavId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<any>(null);
  const [editingSav, setEditingSav] = useState<any>(null);
  const [extrabatData, setExtrabatData] = useState<{ clientId?: number; ouvrageId?: number }>({});
  const [users, setUsers] = useState<any[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);


  const { createAppointment, updateAppointment, deleteAppointment } = useExtrabat();
  const { geocodeAddress } = useGeocoding();
  const { saveInterventionBatteries } = useBatteries();
  const { requests, loading: requestsLoading, error, tablesExist, refetch } = useSavRequests(filters);
  const { statistics, loading: statsLoading, refetch: refetchStats } = useSavStatistics();

  // Debug logging
  console.log('=== SavList render ===');
  console.log('Filters:', filters);
  console.log('Requests:', requests);
  console.log('Requests length:', requests.length);
  console.log('RequestsLoading:', requestsLoading);

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

  // Update filter when user is loaded - apply "My SAV" filter by default
  useEffect(() => {
    if (userProfile?.id) {
      setFilters(prev => ({
        ...prev,
        status: 'active', // Ensure status filter is preserved
        assigned_user_id: userProfile.id
      }));
      setShowOnlyMySav(true);
    }
  }, [userProfile?.id]);

  // Handle deep-linking from notifications or client search (?id=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setSelectedSavId(id);
      setShowDetailsModal(true);
      // Disable "My SAV" filter to ensure we can see the target SAV
      setShowOnlyMySav(false);
      setFilters(prev => ({
        ...prev,
        status: undefined, // Show all statuses
        assigned_user_id: undefined
      }));
      // Clear URL parameter
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Scroll to highlighted SAV card after data loads (only when no modal is open)
  useEffect(() => {
    if (selectedSavId && !requestsLoading && requests.length > 0 && !showInterventionForm && !showReportForm && !showDetailsModal) {
      const el = document.querySelector(`[data-sav-id="${selectedSavId}"]`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-primary-500', 'ring-offset-2');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-primary-500', 'ring-offset-2');
            setSelectedSavId(null);
          }, 3000);
        }, 300);
      }
    }
  }, [selectedSavId, requestsLoading, requests]);

  // Toggle between "My SAV" and "All SAV"
  const toggleSavFilter = () => {
    if (showOnlyMySav) {
      // Show all SAV
      setFilters(prev => ({
        ...prev,
        status: 'active', // Ensure status filter is preserved
        assigned_user_id: undefined
      }));
      setShowOnlyMySav(false);
    } else {
      // Show only my SAV
      setFilters(prev => ({
        ...prev,
        status: 'active', // Ensure status filter is preserved
        assigned_user_id: userProfile?.id
      }));
      setShowOnlyMySav(true);
    }
  };

  const triggerPushNotification = async (event: 'sav_cree' | 'sav_termine' | 'sav_reactive', sav: any) => {
    try {
      const assignedUser = users.find(u => u.id === sav.assigned_user_id);

      await supabase.functions.invoke('send-push-notification', {
        body: {
          event,
          sav_id: sav.id,
          sav_numero: sav.id.substring(0, 8).toUpperCase(), // Fallback as no sav_number found
          client_nom: sav.client_name,
          assigned_user_email: assignedUser?.email
        }
      });
    } catch (err) {
      console.error('Error triggering push notification:', err);
    }
  };

  const handleCreateSav = async (data: any) => {
    try {
      setLoading(true);
      const scrollY = window.scrollY;

      console.log('=== handleCreateSav called ===');
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

      // Handle empty UUID fields - convert empty strings to null
      const cleanedData = {
        ...data,
        assigned_user_id: data.assigned_user_id === '' ? null : data.assigned_user_id,
        created_by: data.created_by === '' ? null : data.created_by
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

      const { data: newSav, error } = await supabase
        .from('sav_requests')
        .insert({
          ...cleanedData,
          city_derived,
          system_type: data.system_type || 'autre',
          status: 'nouvelle',
          priority: data.urgent || false,
          sav_type: data.sav_type || null,
          extrabat_id: extrabatData?.clientId || null,
          extrabat_ouvrage_id: extrabatData?.ouvrageId || null,
          latitude,
          longitude
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger push notification
      if (newSav) {
        triggerPushNotification('sav_cree', newSav);
      }

      setShowSavForm(false);

      // Reset Extrabat data
      setExtrabatData({});

      await refetch();
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    } catch (err) {
      console.error('Error creating SAV request:', err);
      alert('Erreur lors de la création de la demande');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSav = async (data: any) => {
    try {
      setLoading(true);
      const scrollY = window.scrollY;

      console.log('=== handleUpdateSav called ===');
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

      // Handle empty UUID fields - convert empty strings to null
      const cleanedData = {
        ...data,
        assigned_user_id: data.assigned_user_id === '' ? null : data.assigned_user_id,
        created_by: data.created_by === '' ? null : data.created_by,
        problem_desc_reformule: data.problem_desc_reformule || null
      };

      console.log('cleanedData:', cleanedData);

      // Geocode address if it changed
      let latitude = editingSav.latitude;
      let longitude = editingSav.longitude;
      if (data.address && data.address !== editingSav.address) {
        const geocoded = await geocodeAddress(data.address);
        if (geocoded) {
          latitude = geocoded.lat;
          longitude = geocoded.lng;
        }
      }

      const updatePayload = {
        ...cleanedData,
        city_derived,
        system_type: data.system_type || editingSav.system_type,
        priority: data.urgent || false,
        sav_type: data.sav_type || null,
        latitude,
        longitude
      };

      console.log('Update payload:', updatePayload);

      const { error } = await supabase
        .from('sav_requests')
        .update(updatePayload)
        .eq('id', editingSav.id);

      console.log('Update error:', error);
      if (error) throw error;


      setShowSavForm(false);
      setEditingSav(null);

      await refetch();
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    } catch (err) {
      console.error('Error updating SAV request:', err);
      alert('Erreur lors de la modification de la demande');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIntervention = async (data: any) => {
    const scrollY = window.scrollY;
    console.log('=== handleAddIntervention called ===');
    console.log('Data received:', data);
    console.log('Editing intervention:', editingIntervention);

    try {
      setLoading(true);

      if (editingIntervention) {
        // Update existing intervention
        const updateData = {
          started_at: data.started_at,
          ended_at: data.ended_at || null,
          technician_id: data.technician_ids?.[0] || null,
          notes: data.notes || null,
          rapport_brut: data.rapport_brut === '' ? null : data.rapport_brut,
          rapport_reformule: data.rapport_reformule === '' ? null : data.rapport_reformule
        };

        console.log('Updating intervention with:', updateData);

        const { error } = await supabase
          .from('sav_interventions')
          .update(updateData)
          .eq('id', editingIntervention.id);

        console.log('Update error:', error);
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

        // Update batteries for the intervention
        // Delete existing battery assignments
        await supabase
          .from('intervention_batteries')
          .delete()
          .eq('intervention_id', editingIntervention.id)
          .eq('intervention_type', 'sav');

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
              intervention_type: 'sav',
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

        // Update has_battery_change flag in the intervention
        await supabase
          .from('sav_interventions')
          .update({ has_battery_change: data.has_battery_change || false })
          .eq('id', editingIntervention.id);

        // Update Extrabat appointment if exists
        if (editingIntervention.extrabat_intervention_id && data.technician_ids && data.technician_ids.length > 0) {
          const selectedSav = requests.find(r => r.id === selectedSavId);

          // Get all Extrabat codes for selected technicians
          const technicianCodes = data.technician_ids
            .map((techId: string) => users.find(u => u.id === techId)?.extrabat_code)
            .filter((code): code is string => !!code);

          if (technicianCodes.length > 0 && selectedSav) {
            const extrabatResult = await updateAppointment(
              editingIntervention.extrabat_intervention_id,
              technicianCodes,
              {
                clientName: selectedSav.client_name,
                systemType: selectedSav.system_type,
                problemDesc: selectedSav.problem_desc,
                startedAt: data.started_at,
                endedAt: data.ended_at,
                address: selectedSav.address
              },
              selectedSav.extrabat_id || undefined
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
          .from('sav_interventions')
          .insert({
            sav_request_id: selectedSavId,
            started_at: data.started_at,
            ended_at: data.ended_at || null,
            technician_id: data.technician_ids?.[0] || null,
            notes: data.notes || null,
            rapport_brut: data.rapport_brut || null,
            rapport_reformule: data.rapport_reformule || null,
            has_battery_change: data.has_battery_change || false
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
              intervention_type: 'sav',
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

        // Update SAV request status to 'en_cours' only for new interventions
        await supabase
          .from('sav_requests')
          .update({ status: 'en_cours' })
          .eq('id', selectedSavId);

        // Create Extrabat appointment for new interventions
        console.log('=== Extrabat appointment creation check ===');
        console.log('technician_ids:', data.technician_ids);
        console.log('selectedSavId:', selectedSavId);
        if (data.technician_ids && data.technician_ids.length > 0) {
          const selectedSav = requests.find(r => r.id === selectedSavId);
          console.log('selectedSav found:', !!selectedSav);

          // Get all Extrabat codes for selected technicians
          const technicianCodes = data.technician_ids
            .map((techId: string) => users.find(u => u.id === techId)?.extrabat_code)
            .filter((code): code is string => !!code);

          console.log('technicianCodes:', technicianCodes);

          if (technicianCodes.length > 0 && selectedSav) {
            const extrabatResult = await createAppointment(
              technicianCodes,
              {
                clientName: selectedSav.client_name,
                systemType: selectedSav.system_type,
                problemDesc: selectedSav.problem_desc,
                startedAt: data.started_at,
                endedAt: data.ended_at,
                address: selectedSav.address,
                latitude: selectedSav.latitude,
                longitude: selectedSav.longitude
              },
              selectedSav.extrabat_id || undefined
            );

            if (!extrabatResult.success) {
              console.warn('Failed to create Extrabat appointment:', extrabatResult.error);
            } else {
              console.log('Extrabat appointment created successfully');

              // Store Extrabat appointment ID in the intervention
              if (extrabatResult.data?.id) {
                await supabase
                  .from('sav_interventions')
                  .update({ extrabat_intervention_id: extrabatResult.data.id })
                  .eq('id', newIntervention.id);
              }
            }
          } else {
            if (technicianCodes.length === 0) {
              console.warn('No Extrabat codes found for selected technicians. Technician IDs:', data.technician_ids);
              console.warn('Users with extrabat_code:', users.filter(u => u.extrabat_code).map(u => ({ id: u.id, name: u.display_name, code: u.extrabat_code })));
            }
            if (!selectedSav) {
              console.warn('selectedSav is undefined! selectedSavId:', selectedSavId, 'requests count:', requests.length);
            }
          }
        } else {
          console.log('No technician_ids provided, skipping Extrabat appointment creation');
        }

      }

      setShowInterventionForm(false);
      setSelectedSavId(null);
      setEditingIntervention(null);

      await refetch();
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    } catch (err) {
      console.error('Error adding intervention:', err);
      alert(editingIntervention ? 'Erreur lors de la modification de l\'intervention' : 'Erreur lors de l\'ajout de l\'intervention');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (id: string) => {
    try {
      // Save scroll position
      const scrollY = window.scrollY;

      // Get the SAV request details for SMS
      const completedSav = requests.find(r => r.id === id);

      const { error } = await supabase
        .from('sav_requests')
        .update({
          status: 'terminee',
          resolved_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Trigger push notification
      if (completedSav) {
        triggerPushNotification('sav_termine', completedSav);
      }

      await refetch();

      // Restore scroll position
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } catch (err) {
      console.error('Error marking complete:', err);
      alert('Erreur lors de la finalisation');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      // Save scroll position
      const scrollY = window.scrollY;

      const { error } = await supabase
        .from('sav_requests')
        .update({
          status: 'archivee',
          archived_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await refetch();

      // Restore scroll position
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } catch (err) {
      console.error('Error archiving:', err);
      alert('Erreur lors de l\'archivage');
    }
  };

  const handleTogglePriority = async (id: string) => {
    try {
      const scrollY = window.scrollY;
      const request = requests.find(r => r.id === id);

      const { error } = await supabase
        .from('sav_requests')
        .update({ priority: !request?.priority })
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

  const handleToggleQuickIntervention = async (id: string) => {
    try {
      const scrollY = window.scrollY;
      const request = requests.find(r => r.id === id);

      const { error } = await supabase
        .from('sav_requests')
        .update({ is_quick_intervention: !request?.is_quick_intervention })
        .eq('id', id);

      if (error) throw error;

      await refetch();

      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } catch (err) {
      console.error('Error toggling quick intervention:', err);
      alert('Erreur lors de la modification de l\'indicateur d\'intervention rapide');
    }
  };

  const handleToggleLongIntervention = async (id: string) => {
    try {
      const scrollY = window.scrollY;
      const request = requests.find(r => r.id === id);

      const { error } = await supabase
        .from('sav_requests')
        .update({ is_long_intervention: !request?.is_long_intervention })
        .eq('id', id);

      if (error) throw error;

      await refetch();

      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } catch (err) {
      console.error('Error toggling long intervention:', err);
      alert('Erreur lors de la modification de l\'indicateur d\'intervention longue');
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

  const handleEditReport = (interventionId: string, savRequestId: string) => {
    console.log('=== handleEditReport called ===');
    console.log('interventionId:', interventionId);
    console.log('savRequestId:', savRequestId);
    console.log('Total requests:', requests.length);

    const sav = requests.find(r => r.id === savRequestId);
    console.log('Found SAV:', sav);

    if (!sav) {
      console.error('SAV request not found:', savRequestId);
      alert('Erreur: Demande SAV introuvable');
      return;
    }

    console.log('SAV interventions:', sav.interventions);
    const intervention = sav.interventions?.find(i => i.id === interventionId);
    console.log('Found intervention:', intervention);

    if (!intervention) {
      console.error('Intervention not found:', interventionId);
      alert('Erreur: Intervention introuvable');
      return;
    }

    console.log('Setting showReportForm to true');
    setEditingIntervention(intervention);
    setSelectedSavId(savRequestId);
    setShowReportForm(true);
    console.log('=== handleEditReport finished ===');
  };

  const handleUpdateReport = async (data: { rapport_brut: string; rapport_reformule: string; batteries?: any[]; has_battery_change?: boolean }) => {
    const scrollY = window.scrollY;
    console.log('=== handleUpdateReport called ===');
    console.log('Data:', data);
    console.log('Editing intervention:', editingIntervention);

    try {
      setLoading(true);

      const updateData = {
        rapport_brut: data.rapport_brut === '' ? null : data.rapport_brut,
        rapport_reformule: data.rapport_reformule === '' ? null : data.rapport_reformule,
        has_battery_change: data.has_battery_change || false
      };

      console.log('Update data to send:', updateData);

      const { error } = await supabase
        .from('sav_interventions')
        .update(updateData)
        .eq('id', editingIntervention.id);

      console.log('Update error:', error);

      if (error) throw error;

      // Save batteries if provided
      if (data.batteries) {
        await saveInterventionBatteries(editingIntervention.id, 'sav', data.batteries);
      }

      console.log('Update successful, closing form');
      setShowReportForm(false);
      setSelectedSavId(null);
      setEditingIntervention(null);

      await refetch();
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    } catch (err) {
      console.error('Error updating report:', err);
      alert('Erreur lors de la mise à jour du rapport');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIntervention = async (interventionId: string) => {
    const scrollY = window.scrollY;
    try {
      // Get intervention details first to check for Extrabat ID
      const { data: intervention, error: fetchError } = await supabase
        .from('sav_interventions')
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
        .from('sav_interventions')
        .delete()
        .eq('id', interventionId);

      if (error) throw error;

      await refetch();
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    } catch (err) {
      console.error('Error deleting intervention:', err);
      alert('Erreur lors de la suppression de l\'intervention');
    }
  };

  const handleDeleteSav = async (id: string) => {
    const scrollY = window.scrollY;
    try {
      const { error } = await supabase
        .from('sav_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await refetch();
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    } catch (err) {
      console.error('Error deleting SAV request:', err);
      alert('Erreur lors de la suppression de la demande SAV');
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
          <div className="bg-white p-4 rounded border border-amber-200">
            <h4 className="font-medium mb-2">Setup Steps:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click the "Connect to Supabase" button in the top right</li>
              <li>Go to your Supabase dashboard</li>
              <li>Open the SQL Editor</li>
              <li>Copy and run the SQL from the setup-database.md file</li>
            </ol>
          </div>
          <p className="text-sm">Once the tables are created, refresh this page and the application will work normally.</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Demandes SAV</h1>
          <p className="text-gray-600 mt-1">
            {requests.length} demande{requests.length !== 1 ? 's' : ''}
            {requestsLoading && ' (chargement...)'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={toggleSavFilter}
            className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors border border-gray-300"
          >
            {showOnlyMySav ? (
              <>
                <Users className="h-5 w-5 mr-2" />
                Tous les SAV
              </>
            ) : (
              <>
                <User className="h-5 w-5 mr-2" />
                Mes SAV
              </>
            )}
          </button>

          <button
            onClick={() => setShowSavForm(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle demande
          </button>

          <button
            onClick={() => window.location.href = '/billing'}
            className="inline-flex items-center px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-lg transition-colors"
          >
            <Receipt className="h-5 w-5 mr-2" />
            À facturer
          </button>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'cards'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-600 hover:text-primary-700'
                }`}
              title="Vue cartes"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'table'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-600 hover:text-primary-700'
                }`}
              title="Vue liste"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'map'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-600 hover:text-primary-700'
                }`}
              title="Vue carte"
            >
              <Map className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'dashboard'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-600 hover:text-primary-700'
                }`}
              title="Tableau de bord"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
          {(viewMode === 'map' || viewMode === 'dashboard') && (
            <button
              onClick={() => {
                refetch();
                if (viewMode === 'dashboard') {
                  refetchStats();
                }
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              title="Actualiser les données"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setFilters(prev => ({
              ...prev,
              urgent: prev.urgent === true ? undefined : true
            }));
          }}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all border gap-1 ${filters.urgent === true
              ? 'bg-red-100 text-red-800 border-red-300 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700'
            }`}
        >
          <AlertOctagon className="h-3.5 w-3.5" />
          Urgent
        </button>
        <button
          onClick={() => {
            setFilters(prev => ({
              ...prev,
              is_quick_intervention: prev.is_quick_intervention === true ? undefined : true
            }));
          }}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all border gap-1 ${filters.is_quick_intervention === true
              ? 'bg-blue-100 text-blue-800 border-blue-300 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700'
            }`}
        >
          <Zap className="h-3.5 w-3.5" />
          Rapide
        </button>
        <button
          onClick={() => {
            setFilters(prev => ({
              ...prev,
              is_long_intervention: prev.is_long_intervention === true ? undefined : true
            }));
          }}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all border gap-1 ${filters.is_long_intervention === true
              ? 'bg-purple-100 text-purple-800 border-purple-300 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700'
            }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Long
        </button>
        <button
          onClick={() => {
            setFilters(prev => {
              const currentTypes = prev.sav_types || [];
              const hasPiles = currentTypes.includes('piles_batteries');
              return {
                ...prev,
                sav_types: hasPiles
                  ? currentTypes.filter(t => t !== 'piles_batteries').length > 0
                    ? currentTypes.filter(t => t !== 'piles_batteries')
                    : undefined
                  : [...currentTypes, 'piles_batteries']
              };
            });
          }}
          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all border gap-1 ${filters.sav_types?.includes('piles_batteries')
              ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700'
            }`}
        >
          <Battery className="h-3.5 w-3.5" />
          Piles/batteries
        </button>
      </div>

      {/* Filters */}
      <SavFilters
        filters={filters}
        onFiltersChange={setFilters}
        users={users}
        cities={cities}
      />

      {/* Calendar */}
      <Calendar />

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
          <p className="text-gray-500 text-lg">Aucune demande SAV trouvée</p>
          <p className="text-gray-400 mt-2">Modifiez vos filtres ou créez une nouvelle demande</p>
        </div>
      )}

      {!requestsLoading && requests.length > 0 && (
        <>
          {viewMode === 'dashboard' ? (
            <SavDashboard statistics={statistics} loading={statsLoading} />
          ) : viewMode === 'cards' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {requests.map((request) => (
                <SavCard
                  key={request.id}
                  request={request}
                  onAddIntervention={(id) => {
                    setSelectedSavId(id);
                    setShowInterventionForm(true);
                  }}
                  onMarkComplete={handleMarkComplete}
                  onArchive={handleArchive}
                  onEdit={(id) => {
                    const sav = requests.find(r => r.id === id);
                    setEditingSav(sav);
                    setShowSavForm(true);
                  }}
                  onDelete={handleDeleteSav}
                  onEditIntervention={handleEditIntervention}
                  onEditReport={handleEditReport}
                  onDeleteIntervention={handleDeleteIntervention}
                  onTogglePriority={handleTogglePriority}
                  onToggleQuickIntervention={handleToggleQuickIntervention}
                  onToggleLongIntervention={handleToggleLongIntervention}
                  onRefresh={refetch}
                />
              ))}
            </div>
          ) : viewMode === 'table' ? (
            <div className="space-y-2">
              {requests.map((request) => (
                <SavTableRow
                  key={request.id}
                  request={request}
                  onAddIntervention={(id) => {
                    setSelectedSavId(id);
                    setShowInterventionForm(true);
                  }}
                  onMarkComplete={handleMarkComplete}
                  onArchive={handleArchive}
                  onEdit={(id) => {
                    const sav = requests.find(r => r.id === id);
                    setEditingSav(sav);
                    setShowSavForm(true);
                  }}
                  onDelete={handleDeleteSav}
                  onEditIntervention={handleEditIntervention}
                  onEditReport={handleEditReport}
                  onDeleteIntervention={handleDeleteIntervention}
                  onTogglePriority={handleTogglePriority}
                  onToggleQuickIntervention={handleToggleQuickIntervention}
                  onToggleLongIntervention={handleToggleLongIntervention}
                  onRefresh={refetch}
                />
              ))}
            </div>
          ) : (
            <MapView
              locations={requests.map(request => ({
                id: request.id,
                clientName: request.client_name,
                address: request.address || '',
                status: request.status,
                type: 'sav',
                systemType: request.system_type,
                urgent: request.urgent,
                problemDesc: request.problem_desc,
                latitude: request.latitude,
                longitude: request.longitude
              }))}
              onLocationClick={(locationId) => {
                setSelectedSavId(locationId);
                setShowDetailsModal(true);
              }}
            />
          )}
        </>
      )}

      {/* Modals */}
      {showSavForm && (
        <SavForm
          request={editingSav}
          users={users}
          extrabatData={extrabatData}
          onExtrabatDataChange={setExtrabatData}
          onSubmit={editingSav ? handleUpdateSav : handleCreateSav}
          onCancel={() => {
            setShowSavForm(false);
            setEditingSav(null);
            setExtrabatData({});
          }}
          loading={loading}
        />
      )}

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

      {showReportForm && selectedSav && editingIntervention && (
        <ReportForm
          intervention={editingIntervention}
          clientName={selectedSav.client_name}
          onSubmit={handleUpdateReport}
          onCancel={() => {
            setShowReportForm(false);
            setSelectedSavId(null);
            setEditingIntervention(null);
          }}
          loading={loading}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedSav && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Détails de la demande SAV</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedSavId(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <SavCard
                request={selectedSav}
                onAddIntervention={(id) => {
                  setShowDetailsModal(false);
                  setSelectedSavId(id);
                  setShowInterventionForm(true);
                }}
                onMarkComplete={handleMarkComplete}
                onArchive={handleArchive}
                onEdit={(id) => {
                  setShowDetailsModal(false);
                  const sav = requests.find(r => r.id === id);
                  setEditingSav(sav);
                  setShowSavForm(true);
                }}
                onDelete={(id) => {
                  setShowDetailsModal(false);
                  handleDeleteSav(id);
                }}
                onEditIntervention={(interventionId, savRequestId) => {
                  setShowDetailsModal(false);
                  handleEditIntervention(interventionId, savRequestId);
                }}
                onEditReport={(interventionId, savRequestId) => {
                  setShowDetailsModal(false);
                  handleEditReport(interventionId, savRequestId);
                }}
                onDeleteIntervention={(interventionId) => {
                  handleDeleteIntervention(interventionId);
                }}
                onTogglePriority={handleTogglePriority}
                onToggleQuickIntervention={handleToggleQuickIntervention}
                onToggleLongIntervention={handleToggleLongIntervention}
                onRefresh={refetch}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};