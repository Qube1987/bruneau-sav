import { supabase } from '../lib/supabase';

interface ExtrabatResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const useExtrabat = () => {
  const createAppointment = async (
    technicianCodes: string | string[],
    interventionData: {
      clientName: string;
      systemType: string;
      problemDesc: string;
      startedAt: string;
      endedAt?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
    },
    clientId?: number
  ): Promise<ExtrabatResponse> => {
    try {
      const codes = Array.isArray(technicianCodes) ? technicianCodes : [technicianCodes];
      console.log('Creating Extrabat appointment for technicians:', codes);

      const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
        body: {
          technicianCodes: codes,
          interventionData,
          clientId
        }
      });

      if (error) {
        console.error('Supabase function error:', error);

        if (error.message && error.message.includes('credentials not configured')) {
          console.error('🔑 CONFIGURATION REQUIRED:');
          console.error('1. Go to your Supabase dashboard');
          console.error('2. Navigate to Edge Functions > Secrets');
          console.error('3. Add these secrets:');
          console.error('   - EXTRABAT_API_KEY = your Extrabat API key');
          console.error('   - EXTRABAT_SECURITY = your Extrabat security key');
          console.error('4. The secrets will be automatically available to the edge function');
        }

        return { success: false, error: error.message };
      }

      if (!data.success) {
        console.error('Extrabat API error:', data.error);
        return { success: false, error: data.error };
      }

      console.log('Extrabat appointment created successfully');
      return { success: true, data: data.data };

    } catch (error) {
      console.error('Extrabat appointment creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const updateAppointment = async (
    extrabatAppointmentId: string,
    technicianCodes: string | string[],
    interventionData: {
      clientName: string;
      systemType: string;
      problemDesc: string;
      startedAt: string;
      endedAt?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
    },
    clientId?: number
  ): Promise<ExtrabatResponse> => {
    try {
      const codes = Array.isArray(technicianCodes) ? technicianCodes : [technicianCodes];
      console.log('Updating Extrabat appointment:', extrabatAppointmentId);

      const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
        body: {
          technicianCodes: codes,
          interventionData,
          clientId,
          extrabatAppointmentId
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        console.error('Extrabat API error:', data.error);
        return { success: false, error: data.error };
      }

      console.log('Extrabat appointment updated successfully');
      return { success: true, data: data.data };

    } catch (error) {
      console.error('Extrabat appointment update failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const deleteAppointment = async (
    extrabatAppointmentId: string
  ): Promise<ExtrabatResponse> => {
    try {
      console.log('Deleting Extrabat appointment:', extrabatAppointmentId);

      const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
        body: {
          action: 'deleteAppointment',
          appointmentId: extrabatAppointmentId
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        console.error('Extrabat API error:', data.error);
        return { success: false, error: data.error };
      }

      console.log('Extrabat appointment deleted successfully');
      return { success: true };

    } catch (error) {
      console.error('Extrabat appointment deletion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const getClientData = async (clientId: number): Promise<ExtrabatResponse> => {
    try {
      console.log('Fetching client data from Extrabat:', clientId);

      const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
        body: {
          action: 'getClientData',
          clientId
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        console.error('Extrabat API error:', data.error);
        return { success: false, error: data.error };
      }

      console.log('Client data fetched successfully');
      return { success: true, data: data.data };

    } catch (error) {
      console.error('Client data fetch failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  return { createAppointment, updateAppointment, deleteAppointment, getClientData };
};