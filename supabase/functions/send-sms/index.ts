import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SMSRequest {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Twilio credentials from environment variables
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Missing Twilio configuration')
    }

    // Parse request body
    const { to, message, savData, type }: SMSRequest = await req.json()

    if (!to) {
      throw new Error('Missing required field: to')
    }

    // Validate phone number format (E.164)
    const phoneRegex = /^\+[1-9]\d{1,14}$/
    if (!phoneRegex.test(to)) {
      throw new Error(`Invalid phone number format: ${to}. Must be in E.164 format (e.g., +33123456789)`)
    }

    if (!message && !savData) {
      throw new Error('Either message or savData must be provided')
    }

    // Format the SMS message for SAV creation
    let smsBody = message;
    if (savData) {
      const urgentText = savData.urgent ? ' URGENT' : '';
      
      if (type === 'assignment') {
        smsBody = `Nouvelle demande de SAV${urgentText} :
Client: ${savData.client_name}
Système: ${savData.system_type}
Problème: ${savData.problem_desc.substring(0, 100)}${savData.problem_desc.length > 100 ? '...' : ''}

Détails : https://bruneau27.com/gestion-sav`;
      } else if (type === 'completion') {
        smsBody = `SAV terminé :
Client: ${savData.client_name}
Système: ${savData.system_type}

Le SAV a été marqué comme terminé. 

Détails : https://bruneau27.com/gestion-sav`;
      } else {
        // Default: creation message
        smsBody = `Nouvelle demande SAV${urgentText} :
Client: ${savData.client_name}
Système: ${savData.system_type}
Problème: ${savData.problem_desc.substring(0, 100)}${savData.problem_desc.length > 100 ? '...' : ''}

Détails : https://bruneau27.com/gestion-sav`;
      }
    }

    // Prepare Twilio API request
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
    const formData = new URLSearchParams()
    formData.append('To', to)
    formData.append('From', fromNumber)
    formData.append('Body', smsBody)

    // Send SMS via Twilio API
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Twilio API error:', errorData)
      throw new Error(`Twilio API error: ${response.status}`)
    }

    const result = await response.json()
    console.log('SMS sent successfully:', result.sid)

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: result.sid,
        message: 'SMS sent successfully' 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error sending SMS:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})