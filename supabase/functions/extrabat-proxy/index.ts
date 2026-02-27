import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

console.log('Extrabat proxy function loaded - v1.1');

interface ExtrabatRequest {
  endpoint?: string;
  params?: Record<string, any>;
  apiVersion?: 'v1' | 'v2' | 'v3';
  technicianCode?: string;
  technicianCodes?: string[];
  interventionData?: {
    clientName: string;
    systemType: string;
    problemDesc: string;
    startedAt: string;
    endedAt?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  clientId?: number;
  extrabatAppointmentId?: string;
  action?: string;
  clientName?: string;
  appointmentId?: string;
}

interface ExtrabatAppointment {
  journee: boolean;
  objet: string;
  debut: string;
  fin: string;
  couleur: number;
  rue?: string;
  cp?: string;
  ville?: string;
  latitude?: number;
  longitude?: number;
  users: Array<{
    user: number;
  }>;
  rdvClients?: Array<{
    client: number;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const apiKey = Deno.env.get('EXTRABAT_API_KEY')
    const securityKey = Deno.env.get('EXTRABAT_SECURITY')

    if (!apiKey || !securityKey) {
      console.error('Missing Extrabat API credentials in Supabase secrets:')
      console.error('- EXTRABAT_API_KEY:', apiKey ? 'SET' : 'NOT SET')
      console.error('- EXTRABAT_SECURITY:', securityKey ? 'SET' : 'NOT SET')
      console.error('Please configure these secrets in your Supabase dashboard under Edge Functions > Secrets')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Extrabat API credentials not configured in Supabase secrets. Please add EXTRABAT_API_KEY and EXTRABAT_SECURITY in your Supabase dashboard under Edge Functions > Secrets.',
          missingCredentials: {
            EXTRABAT_API_KEY: !apiKey,
            EXTRABAT_SECURITY: !securityKey
          }
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const requestBody: ExtrabatRequest = await req.json()

    if (requestBody.action === 'deleteAppointment') {
      const { appointmentId } = requestBody

      if (!appointmentId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Missing appointmentId parameter'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const deleteUrl = `https://api.extrabat.com/v1/agenda/rendez-vous/${appointmentId}`

      console.log('Deleting Extrabat appointment:', appointmentId)

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'X-EXTRABAT-API-KEY': apiKey,
          'X-EXTRABAT-SECURITY': securityKey,
        }
      })

      const responseText = await response.text()
      let responseData

      try {
        responseData = responseText ? JSON.parse(responseText) : null
      } catch (e) {
        responseData = responseText
      }

      if (!response.ok) {
        console.error('Extrabat API error:', response.status, responseData)
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to delete appointment: ${response.status}`
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.log('Extrabat appointment deleted successfully')

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Appointment deleted successfully'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (requestBody.action === 'getClientData') {
      const { clientId } = requestBody

      if (!clientId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Missing clientId parameter'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const clientUrl = `https://api.extrabat.com/v3/client/${clientId}?include=ouvrage,ouvrage.ouvrage_metier,ouvrage.ouvrage_metier.article`

      console.log('Fetching client data from Extrabat:', clientUrl)

      const response = await fetch(clientUrl, {
        method: 'GET',
        headers: {
          'X-EXTRABAT-API-KEY': apiKey,
          'X-EXTRABAT-SECURITY': securityKey,
        }
      })

      const responseText = await response.text()
      let responseData

      try {
        responseData = JSON.parse(responseText)
      } catch (e) {
        responseData = responseText
      }

      if (!response.ok) {
        console.error('Extrabat API error:', response.status, responseData)
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to fetch client data: ${response.status}`
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: responseData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (requestBody.action === 'createQuote') {
      const { clientId, interventionId, interventionType } = requestBody

      if (!clientId || !interventionId || !interventionType) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Missing required parameters: clientId, interventionId, interventionType'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.log('Creating Extrabat quote for intervention:', interventionId)

      const { createClient } = await import('jsr:@supabase/supabase-js@2')
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const tableName = interventionType === 'sav' ? 'sav_interventions' : 'maintenance_interventions'
      const requestTableName = interventionType === 'sav' ? 'sav_requests' : 'maintenance_contracts'
      const parentIdColumn = interventionType === 'sav' ? 'sav_request_id' : 'contract_id'

      const { data: intervention, error: dbError } = await supabase
        .from(tableName)
        .select(parentIdColumn)
        .eq('id', interventionId)
        .maybeSingle()

      if (dbError) {
        console.error('Database error fetching intervention:', dbError)
        return new Response(
          JSON.stringify({
            success: false,
            error: `Erreur base de données: ${dbError.message}`
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      if (!intervention) {
        console.error('Intervention not found:', interventionId)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Intervention introuvable'
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const parentId = intervention[parentIdColumn]
      const { data: parentData, error: parentError } = await supabase
        .from(requestTableName)
        .select('client_name, address')
        .eq('id', parentId)
        .single()

      if (parentError || !parentData) {
        console.error('Failed to fetch parent data:', parentError)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Données client introuvables'
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const { data: batteries, error: battError } = await supabase
        .from('intervention_batteries')
        .select(`
          quantity,
          unit_price,
          battery_product:battery_products(name, description, ref_extrabat, vat_rate)
        `)
        .eq('intervention_id', interventionId)
        .eq('intervention_type', interventionType)

      if (battError) {
        console.error('Failed to fetch batteries:', battError)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Erreur lors de la récupération des batteries'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      if (!batteries || batteries.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Aucune pile/batterie sélectionnée pour cette intervention'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const quoteLines = batteries.map((item: any, index: number) => {
        const puht = item.battery_product?.unit_price || item.unit_price || 0
        const quantite = item.quantity || 1
        const totalHt = Math.round(puht * quantite * 100) / 100
        const tauxTva = item.battery_product?.vat_rate || 20
        const totalTva = Math.round(totalHt * (tauxTva / 100) * 100) / 100
        const totalTtc = Math.round((totalHt + totalTva) * 100) / 100

        return {
          code: item.battery_product?.ref_extrabat || '',
          description: item.battery_product?.description || item.battery_product?.name || '',
          quantite,
          puht,
          totalHt,
          totalNet: totalHt,
          tauxTva,
          totalTva,
          totalTtc,
          ordre: index + 1,
          numLigne: index + 1
        }
      })

      const totalHT = Math.round(quoteLines.reduce((sum: number, l: any) => sum + l.totalNet, 0) * 100) / 100
      const totalTVA = Math.round(quoteLines.reduce((sum: number, l: any) => sum + l.totalTva, 0) * 100) / 100
      const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100

      const today = new Date().toISOString().split('T')[0]

      const quoteData = {
        type: 1,
        date: today,
        titre: `Remplacement piles/batteries alarme intrusion`,
        adresseFacturation: parentData.address || '',
        adresseLivraison: parentData.address || '',
        client: clientId,
        lignes: quoteLines
      }

      console.log('Creating quote with data:', JSON.stringify(quoteData, null, 2))

      const quoteUrl = `https://api.extrabat.com/v1/client/${clientId}/devis`
      console.log('Quote URL:', quoteUrl)

      const response = await fetch(quoteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-EXTRABAT-API-KEY': apiKey,
          'X-EXTRABAT-SECURITY': securityKey,
        },
        body: JSON.stringify(quoteData)
      })

      const responseText = await response.text()
      let responseData

      try {
        responseData = JSON.parse(responseText)
      } catch (e) {
        responseData = responseText
      }

      if (!response.ok) {
        console.error('Extrabat API error:', response.status, responseData)
        return new Response(
          JSON.stringify({
            success: false,
            error: `Erreur API Extrabat: ${response.status}`,
            details: responseData
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.log('Quote created successfully:', responseData)

      return new Response(
        JSON.stringify({
          success: true,
          data: responseData,
          devisId: responseData.id || responseData.devisId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (requestBody.action === 'getClientEmail') {
      const { clientName } = requestBody

      if (!clientName) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Missing clientName parameter'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const searchUrl = `https://api.extrabat.com/v2/clients?nomraisonsociale=${encodeURIComponent(clientName)}`

      console.log('Searching for client email:', searchUrl)

      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'X-EXTRABAT-API-KEY': apiKey,
          'X-EXTRABAT-SECURITY': securityKey,
        }
      })

      const responseText = await response.text()
      let responseData

      try {
        responseData = JSON.parse(responseText)
      } catch (e) {
        responseData = responseText
      }

      if (!response.ok) {
        console.error('Extrabat API error:', response.status, responseData)
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to fetch client data: ${response.status}`
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      let clientEmail = null
      let allClients = []

      if (responseData && responseData.length > 0) {
        console.log(`Found ${responseData.length} client(s) for "${clientName}":`)

        responseData.forEach((client: any, index: number) => {
          const possibleEmail = client.email || client.mail || client.mail1 || client.emailfacturation || client.mail_facturation || null

          console.log(`  [${index}] ID: ${client.id}, Name: ${client.nomraisonsociale}, Email: ${possibleEmail}`)

          allClients.push({
            id: client.id,
            name: client.nomraisonsociale,
            email: possibleEmail,
            allFields: Object.keys(client).filter(key =>
              key.toLowerCase().includes('mail') || key.toLowerCase().includes('email')
            ).reduce((acc: any, key) => {
              acc[key] = client[key]
              return acc
            }, {})
          })
        })

        const firstClient = responseData[0]
        clientEmail = firstClient.email || firstClient.mail || firstClient.mail1 || firstClient.emailfacturation || firstClient.mail_facturation || null

        if (responseData.length > 1) {
          console.warn(`⚠️  Multiple clients found! Using email from first result. All results:`, allClients)
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          email: clientEmail,
          debugInfo: {
            totalClientsFound: responseData?.length || 0,
            allClients: allClients
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (requestBody.endpoint) {
      const { endpoint, params, apiVersion = 'v2' } = requestBody

      let apiUrl = `https://api.extrabat.com/${apiVersion}/${endpoint}`
      
      if (params) {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value))
          }
        })
        if (searchParams.toString()) {
          apiUrl += `?${searchParams.toString()}`
        }
      }

      console.log('Calling Extrabat API:', apiUrl)

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-EXTRABAT-API-KEY': apiKey,
          'X-EXTRABAT-SECURITY': securityKey,
        }
      })

      const responseText = await response.text()
      let responseData

      try {
        responseData = JSON.parse(responseText)
      } catch (e) {
        responseData = responseText
      }

      if (!response.ok) {
        console.error('Extrabat API error:', response.status, responseData)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Extrabat API error: ${response.status} - ${responseText}`,
            status: response.status
          }),
          { 
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log('Extrabat API success:', responseData)

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: responseData
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { technicianCode, technicianCodes, interventionData, clientId, extrabatAppointmentId } = requestBody

    // Support both single technicianCode and array of technicianCodes
    const codes = technicianCodes || (technicianCode ? [technicianCode] : []);

    if (codes.length === 0 || !interventionData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: technicianCodes (or technicianCode) and interventionData'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const startDate = new Date(interventionData.startedAt)
    const endDate = interventionData.endedAt
      ? new Date(interventionData.endedAt)
      : new Date(startDate.getTime() + 2 * 60 * 60 * 1000)

    const formatDate = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    const appointment: ExtrabatAppointment = {
      journee: false,
      objet: `SAV ${interventionData.systemType} - ${interventionData.clientName}`,
      debut: formatDate(startDate),
      fin: formatDate(endDate),
      couleur: 23061,
      users: codes.map(code => ({
        user: parseInt(code, 10)
      }))
    }

    if (interventionData.address) {
      const addressParts = interventionData.address.split(',').map(part => part.trim());
      if (addressParts.length >= 2) {
        appointment.rue = addressParts[0];
        const lastPart = addressParts[addressParts.length - 1];
        const cpVilleMatch = lastPart.match(/^(\d{5})\s+(.+)$/);
        if (cpVilleMatch) {
          appointment.cp = cpVilleMatch[1];
          appointment.ville = cpVilleMatch[2];
        } else {
          appointment.ville = lastPart;
        }
      } else {
        appointment.rue = interventionData.address;
      }
    }

    if (interventionData.latitude !== undefined && interventionData.longitude !== undefined) {
      appointment.latitude = interventionData.latitude;
      appointment.longitude = interventionData.longitude;
    }

    if (clientId) {
      appointment.rdvClients = [
        {
          client: clientId
        }
      ];
    }

    const isUpdate = !!extrabatAppointmentId
    const apiUrl = isUpdate
      ? `https://api.extrabat.com/v1/agenda/rendez-vous/${extrabatAppointmentId}`
      : 'https://api.extrabat.com/v1/agenda/rendez-vous'

    console.log(`${isUpdate ? 'Updating' : 'Creating'} Extrabat appointment with:`, JSON.stringify(appointment, null, 2))

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EXTRABAT-API-KEY': apiKey,
        'X-EXTRABAT-SECURITY': securityKey,
      },
      body: JSON.stringify(appointment)
    })

    const responseText = await response.text()
    let responseData

    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      responseData = responseText
    }

    if (!response.ok) {
      console.error('Extrabat API error:', response.status, responseData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Extrabat API error: ${response.status} - ${responseText}`,
          status: response.status
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Extrabat API success:', responseData)

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
        message: isUpdate
          ? 'Appointment updated successfully in Extrabat'
          : 'Appointment created successfully in Extrabat'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Extrabat proxy error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
});