import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { SavRequest, SavFilters } from '../types';

const isTableNotFoundError = (error: any): boolean => {
  return error?.code === 'PGRST205' || error?.message?.includes('Could not find the table');
};

export const useSavRequests = (filters: SavFilters = {}) => {
  const [requests, setRequests] = useState<SavRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tablesExist, setTablesExist] = useState(true);
  const fetchIdRef = useRef(0);

  const fetchRequests = async () => {
    // Increment fetch ID to track this specific fetch
    const thisFetchId = ++fetchIdRef.current;

    try {
      setLoading(true);
      setError(null);

      console.log('=== fetchRequests called ===');
      console.log('Fetch ID:', thisFetchId);
      console.log('Filters:', filters);

      let query = supabase
        .from('sav_requests')
        .select(`
          *,
          assigned_user:assigned_user_id(id, display_name, email),
          interventions:sav_interventions(
            *,
            technician:technician_id(id, display_name, email)
          )
        `);

      // Apply filters
      if (filters.q) {
        console.log('Applying q filter:', filters.q);
        query = query.or(`client_name.ilike.%${filters.q}%,city_derived.ilike.%${filters.q}%`);
      }
      if (filters.user_id) {
        console.log('Applying user_id filter:', filters.user_id);
        query = query.eq('assigned_user_id', filters.user_id);
      }
      if (filters.assigned_user_id) {
        console.log('Applying assigned_user_id filter:', filters.assigned_user_id);
        query = query.eq('assigned_user_id', filters.assigned_user_id);
      }
      if (filters.city) {
        console.log('Applying city filter:', filters.city);
        query = query.eq('city_derived', filters.city);
      }
      if (filters.system_type) {
        console.log('Applying system_type filter:', filters.system_type);
        query = query.eq('system_type', filters.system_type);
      }
      if (filters.status) {
        console.log('Applying status filter:', filters.status);
        if (filters.status === 'active') {
          // Show only nouvelle and en_cours
          console.log('Status is "active", filtering for nouvelle and en_cours');
          query = query.in('status', ['nouvelle', 'en_cours']);
        } else if (filters.status === 'all') {
          // Show all statuses, no filter applied
          console.log('Status is "all", no status filter applied');
        } else {
          console.log('Status is specific:', filters.status);
          query = query.eq('status', filters.status);
        }
      } else if (!filters.billing_status) {
        // By default, exclude archived and completed requests
        // BUT only if we're not filtering by billing_status
        console.log('No status filter, excluding archivee and terminee by default');
        query = query.not('status', 'in', '(archivee,terminee)');
      }
      if (filters.urgent !== undefined) {
        query = query.eq('urgent', filters.urgent);
      }
      if (filters.billing_status) {
        if (filters.billing_status === 'all') {
          // Show both to_bill (terminee) and billed (archivee) SAVs
          query = query.in('status', ['terminee', 'archivee']);
        } else {
          query = query.eq('billing_status', filters.billing_status);
          // When filtering by billing_status, we need to include terminated/archived SAVs
          if (filters.billing_status === 'billed') {
            query = query.eq('status', 'archivee');
          } else if (filters.billing_status === 'to_bill') {
            query = query.eq('status', 'terminee');
          }
        }
      }

      // Apply basic sorting first
      const sortField = filters.sort || 'requested_at';
      const sortOrder = filters.order || 'desc'; // Changed default to desc for recent first
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      console.log('Query result - data count:', data?.length || 0);
      console.log('Query result - error:', error);
      console.log('Fetch ID when data arrived:', thisFetchId);

      // Check if this fetch is still the most recent one
      if (thisFetchId !== fetchIdRef.current) {
        console.log('Ignoring stale fetch result. Current fetch ID:', fetchIdRef.current);
        return;
      }

      if (error) {
        if (isTableNotFoundError(error)) {
          setTablesExist(false);
          setError('Database tables not found. Please set up the database schema first.');
          setRequests([]);
          return;
        }
        throw error;
      }

      // Check for maintenance contracts and load technicians separately
      const processedData = await Promise.all((data || []).map(async (request) => {
        // Check if client has maintenance contract
        const { data: contractData } = await supabase
          .from('maintenance_contracts')
          .select('id')
          .eq('client_name', request.client_name)
          .limit(1);

        // Load technicians and photos for each intervention
        const interventionsWithTechnicians = await Promise.all(
          (request.interventions || []).map(async (intervention: any) => {
            const { data: techData } = await supabase
              .from('sav_intervention_technicians')
              .select('technician:technician_id(id, display_name, email)')
              .eq('sav_intervention_id', intervention.id);

            const { data: photosData } = await supabase
              .from('intervention_photos')
              .select('*')
              .eq('intervention_id', intervention.id)
              .eq('intervention_type', 'sav');

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
          ...request,
          has_maintenance_contract: contractData && contractData.length > 0,
          interventions: interventionsWithTechnicians
        };
      }));

      // Apply custom sorting logic in JavaScript
      const sortedData = processedData.sort((a, b) => {
        // First priority: Priority flag
        if (a.priority && !b.priority) return -1;
        if (!a.priority && b.priority) return 1;

        // Check if client has maintenance contract
        const aHasContract = a.has_maintenance_contract;
        const bHasContract = b.has_maintenance_contract;

        // Second priority: Clients with maintenance contracts that are NOT terminated
        const aContractNotTerminated = aHasContract && a.status !== 'terminee';
        const bContractNotTerminated = bHasContract && b.status !== 'terminee';

        if (aContractNotTerminated && !bContractNotTerminated) return -1;
        if (!aContractNotTerminated && bContractNotTerminated) return 1;

        // Third priority: Urgent requests that are NOT terminated
        const aUrgentNotTerminated = a.urgent && a.status !== 'terminee';
        const bUrgentNotTerminated = b.urgent && b.status !== 'terminee';

        if (aUrgentNotTerminated && !bUrgentNotTerminated) return -1;
        if (!aUrgentNotTerminated && bUrgentNotTerminated) return 1;

        // If both are urgent and not terminated, or both are not urgent/not terminated
        // Sort by requested_at (most recent first)
        const aDate = new Date(a.requested_at).getTime();
        const bDate = new Date(b.requested_at).getTime();

        return bDate - aDate; // Most recent first
      });

      // Final check before setting state - ensure this is still the most recent fetch
      if (thisFetchId !== fetchIdRef.current) {
        console.log('Ignoring stale processed data. Current fetch ID:', fetchIdRef.current);
        return;
      }

      setRequests(sortedData);
    } catch (err) {
      // Only update error if this is still the most recent fetch
      if (thisFetchId === fetchIdRef.current) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      // Only update loading if this is still the most recent fetch
      if (thisFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [
    filters.q,
    filters.user_id,
    filters.assigned_user_id,
    filters.city,
    filters.system_type,
    filters.status,
    filters.urgent,
    filters.billing_status,
    filters.sort,
    filters.order
  ]);

  const refetch = () => {
    fetchRequests();
  };

  return { requests, loading, error, tablesExist, refetch };
};