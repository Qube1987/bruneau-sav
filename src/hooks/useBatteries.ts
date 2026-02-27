import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface BatteryProduct {
  id: string;
  name: string;
  ref_extrabat: string;
  unit_price: number;
  vat_rate: number;
  unit: string;
  is_active: boolean;
}

export interface InterventionBattery {
  id: string;
  intervention_id: string;
  intervention_type: 'sav' | 'maintenance';
  battery_product_id: string;
  quantity: number;
  unit_price: number;
  battery_product?: BatteryProduct;
}

export interface BatterySelection {
  battery_product_id: string;
  quantity: number;
  unit_price: number;
}

export const useBatteries = () => {
  const [batteryProducts, setBatteryProducts] = useState<BatteryProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBatteryProducts();
  }, []);

  const fetchBatteryProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('battery_products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBatteryProducts(data || []);
    } catch (err: any) {
      console.error('Error fetching battery products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchInterventionBatteries = async (
    interventionId: string,
    interventionType: 'sav' | 'maintenance'
  ): Promise<InterventionBattery[]> => {
    try {
      const { data, error } = await supabase
        .from('intervention_batteries')
        .select(`
          *,
          battery_product:battery_products(*)
        `)
        .eq('intervention_id', interventionId)
        .eq('intervention_type', interventionType);

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.error('Error fetching intervention batteries:', err);
      throw err;
    }
  };

  const saveInterventionBatteries = async (
    interventionId: string,
    interventionType: 'sav' | 'maintenance',
    batteries: BatterySelection[]
  ) => {
    try {
      setLoading(true);

      // Delete existing batteries for this intervention
      const { error: deleteError } = await supabase
        .from('intervention_batteries')
        .delete()
        .eq('intervention_id', interventionId)
        .eq('intervention_type', interventionType);

      if (deleteError) throw deleteError;

      // Insert new batteries if any
      if (batteries.length > 0) {
        const insertData = batteries.map(b => ({
          intervention_id: interventionId,
          intervention_type: interventionType,
          battery_product_id: b.battery_product_id,
          quantity: b.quantity,
          unit_price: b.unit_price
        }));

        const { error: insertError } = await supabase
          .from('intervention_batteries')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error saving intervention batteries:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const createExtrabatQuote = async (
    clientExtrabatId: string,
    interventionId: string,
    interventionType: 'sav' | 'maintenance',
    clientName: string
  ) => {
    try {
      setLoading(true);

      // Call Extrabat API via proxy
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const apiUrl = `${supabaseUrl}/functions/v1/extrabat-proxy`;

      const requestBody = {
        action: 'createQuote',
        clientId: parseInt(clientExtrabatId),
        interventionId: interventionId,
        interventionType: interventionType
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erreur Extrabat: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        devisId: result.devisId || result.data?.id,
        data: result.data
      };
    } catch (err: any) {
      console.error('Error creating Extrabat quote:', err);
      setError(err.message);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    batteryProducts,
    loading,
    error,
    fetchBatteryProducts,
    fetchInterventionBatteries,
    saveInterventionBatteries,
    createExtrabatQuote
  };
};
