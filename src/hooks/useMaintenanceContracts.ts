import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MaintenanceContract, MaintenanceFilters } from '../types';

const isTableNotFoundError = (error: any): boolean => {
  return error?.code === 'PGRST205' || error?.message?.includes('Could not find the table');
};

export const useMaintenanceContracts = (filters: MaintenanceFilters = {}) => {
  const [contracts, setContracts] = useState<MaintenanceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tablesExist, setTablesExist] = useState(true);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('maintenance_contracts')
        .select(`
          *,
          assigned_user:assigned_user_id(id, display_name, email),
          interventions:maintenance_interventions(
            *,
            technician:technician_id(id, display_name, email)
          )
        `);

      // Apply filters
      if (filters.q) {
        query = query.or(`client_name.ilike.%${filters.q}%,city_derived.ilike.%${filters.q}%`);
      }
      if (filters.user_id) {
        query = query.eq('assigned_user_id', filters.user_id);
      }
      if (filters.city) {
        query = query.eq('city_derived', filters.city);
      }
      if (filters.system_type) {
        query = query.eq('system_type', filters.system_type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.priority !== undefined) {
        query = query.eq('priority', filters.priority);
      }

      // Apply sorting
      const sortField = filters.sort || 'client_name';
      const sortOrder = filters.order || 'asc';
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) {
        if (isTableNotFoundError(error)) {
          setTablesExist(false);
          setError('Database tables not found. Please set up the database schema first.');
          setContracts([]);
          return;
        }
        throw error;
      }

      // Load technicians and photos for each intervention
      const processedData = await Promise.all(
        (data || []).map(async (contract) => {
          const interventionsWithTechnicians = await Promise.all(
            (contract.interventions || []).map(async (intervention: any) => {
              const { data: techData } = await supabase
                .from('maintenance_intervention_technicians')
                .select('technician:technician_id(id, display_name, email)')
                .eq('maintenance_intervention_id', intervention.id);

              const { data: photosData } = await supabase
                .from('intervention_photos')
                .select('*')
                .eq('intervention_id', intervention.id)
                .eq('intervention_type', 'maintenance');

              const photosWithUrls = (photosData || []).map(photo => {
                const { data: { publicUrl } } = supabase.storage
                  .from('intervention-photos')
                  .getPublicUrl(photo.file_path);

                return {
                  ...photo,
                  url: publicUrl
                };
              });

              return {
                ...intervention,
                technicians: techData?.map((t: any) => t.technician) || [],
                photos: photosWithUrls
              };
            })
          );

          return {
            ...contract,
            interventions: interventionsWithTechnicians
          };
        })
      );

      // Apply custom sorting logic in JavaScript
      const sortedData = processedData.sort((a, b) => {
        // First priority: Priority contracts that are not completed always go first
        const aPriorityNotCompleted = a.priority && a.status !== 'realisee';
        const bPriorityNotCompleted = b.priority && b.status !== 'realisee';

        if (aPriorityNotCompleted && !bPriorityNotCompleted) return -1;
        if (!aPriorityNotCompleted && bPriorityNotCompleted) return 1;

        // Apply sorting based on user selection
        const sortField = filters.sort || 'client_name';
        const sortOrder = filters.order || 'asc';
        const multiplier = sortOrder === 'asc' ? 1 : -1;

        let comparison = 0;

        if (sortField === 'created_at') {
          const aDate = new Date(a.created_at).getTime();
          const bDate = new Date(b.created_at).getTime();
          comparison = (aDate - bDate) * multiplier;
        } else if (sortField === 'battery_installation_year') {
          const aYear = a.battery_installation_year || 0;
          const bYear = b.battery_installation_year || 0;
          comparison = (aYear - bYear) * multiplier;
        } else if (sortField === 'city_derived') {
          comparison = (a.city_derived || '').localeCompare(b.city_derived || '') * multiplier;
        } else if (sortField === 'assigned_user_id') {
          const aUser = a.assigned_user?.display_name || a.assigned_user?.email || '';
          const bUser = b.assigned_user?.display_name || b.assigned_user?.email || '';
          comparison = aUser.localeCompare(bUser) * multiplier;
        } else if (sortField === 'client_name') {
          // Default sorting logic for client_name
          const statusOrder = { 'a_realiser': 0, 'prevue': 1, 'realisee': 2 };
          const aStatusOrder = statusOrder[a.status] || 3;
          const bStatusOrder = statusOrder[b.status] || 3;

          if (aStatusOrder !== bStatusOrder) {
            return aStatusOrder - bStatusOrder;
          }

          comparison = a.client_name.localeCompare(b.client_name) * multiplier;
        }

        return comparison;
      });

      setContracts(sortedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [filters]);

  const refetch = () => {
    fetchContracts();
  };

  return { contracts, loading, error, tablesExist, refetch };
};