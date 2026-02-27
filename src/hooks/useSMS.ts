import { supabase } from '../lib/supabase';

interface SMSData {
  to: string;
  message: string;
  savData?: {
    client_name: string;
    system_type: string;
    urgent: boolean;
    problem_desc: string;
  };
  type?: 'creation' | 'assignment' | 'completion' | 'client_confirmation';
}

const formatPhoneToE164 = (phone: string): string => {
  let cleaned = phone.replace(/\s+/g, '').replace(/\./g, '').replace(/-/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  if (cleaned.startsWith('0033')) {
    return '+' + cleaned.substring(2);
  }

  if (cleaned.startsWith('33')) {
    return '+' + cleaned;
  }

  if (cleaned.startsWith('0')) {
    return '+33' + cleaned.substring(1);
  }

  return '+33' + cleaned;
};

export const useSMS = () => {
  const sendSMS = async (data: SMSData): Promise<{ success: boolean; error?: string }> => {
    try {
      const formattedData = {
        ...data,
        to: formatPhoneToE164(data.to)
      };

      const { data: result, error } = await supabase.functions.invoke('send-sms', {
        body: formattedData
      });

      if (error) {
        console.error('SMS Error:', error);
        return { success: false, error: error.message };
      }

      if (!result.success) {
        console.error('SMS Failed:', result.error);
        return { success: false, error: result.error };
      }

      console.log('SMS sent successfully:', result.messageSid);
      return { success: true };

    } catch (error) {
      console.error('SMS Exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  return { sendSMS };
};