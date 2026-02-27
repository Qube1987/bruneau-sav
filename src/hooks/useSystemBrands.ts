import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SystemBrand {
  id: string;
  brand_name: string;
  models: string[];
}

export const useSystemBrands = () => {
  const [brands, setBrands] = useState<SystemBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('system_brands')
        .select('*')
        .order('brand_name', { ascending: true });

      if (fetchError) throw fetchError;
      setBrands(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching system brands:', err);
      setError('Erreur lors du chargement des marques');
    } finally {
      setLoading(false);
    }
  };

  const addCustomBrand = async (name: string): Promise<boolean> => {
    try {
      const { error: insertError } = await supabase
        .from('system_brands')
        .insert({ brand_name: name, models: [] })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          setError('Cette marque existe déjà');
        } else {
          throw insertError;
        }
        return false;
      }

      await fetchBrands();
      setError(null);
      return true;
    } catch (err) {
      console.error('Error adding custom brand:', err);
      setError('Erreur lors de l\'ajout de la marque');
      return false;
    }
  };

  const getAllBrands = (): string[] => {
    const brandNames = brands.map(b => b.brand_name);
    return [...brandNames, 'Autre'];
  };

  const getModelsForBrand = (brandName: string): string[] | null => {
    const brand = brands.find(b => b.brand_name === brandName);
    if (!brand) return null;
    return brand.models && brand.models.length > 0 ? brand.models : null;
  };

  const fetchSystemInfoForClient = async (clientName: string, systemType?: string, site?: string) => {
    try {
      let savQuery = supabase
        .from('sav_requests')
        .select('system_brand, system_model')
        .eq('client_name', clientName)
        .not('system_brand', 'is', null)
        .order('created_at', { ascending: false });

      if (systemType) {
        savQuery = savQuery.eq('system_type', systemType);
      }

      const { data: savData } = await savQuery.limit(1).maybeSingle();

      if (savData && savData.system_brand) {
        return {
          system_brand: savData.system_brand,
          system_model: savData.system_model || undefined
        };
      }

      let maintenanceQuery = supabase
        .from('maintenance_contracts')
        .select('system_brand, system_model')
        .eq('client_name', clientName)
        .not('system_brand', 'is', null)
        .order('created_at', { ascending: false });

      if (systemType) {
        maintenanceQuery = maintenanceQuery.eq('system_type', systemType);
      }

      const { data: maintenanceData } = await maintenanceQuery.limit(1).maybeSingle();

      if (maintenanceData && maintenanceData.system_brand) {
        return {
          system_brand: maintenanceData.system_brand,
          system_model: maintenanceData.system_model || undefined
        };
      }

      return null;
    } catch (err) {
      console.error('Error fetching system info:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  return {
    brands,
    loading,
    error,
    getAllBrands,
    getModelsForBrand,
    addCustomBrand,
    fetchSystemInfoForClient
  };
};
