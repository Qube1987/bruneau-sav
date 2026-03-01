import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const { event, sav_id, sav_numero, client_nom, assigned_user_email } = payload

    if (!event || !sav_id) {
      throw new Error('Missing event or sav_id')
    }

    // Configuration VAPID
    const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:quentin@bruneau27.com'
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured in Edge Function')
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

    // Initialisation Supabase Admin (pour lire les subscriptions de tous les users)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Logique des destinataires
    const recipients = ['quentin@bruneau27.com']
    if ((event === 'sav_cree' || event === 'sav_reactive') && assigned_user_email) {
      if (!recipients.includes(assigned_user_email)) {
        recipients.push(assigned_user_email)
      }
    }

    console.log(`Sending push for event ${event} to:`, recipients)

    // Récupérer les subscriptions pour ces emails
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('user_email', recipients)

    if (subError) throw subError

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No subscriptions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Préparation du contenu de la notification
    let title = ''
    let body = ''

    if (event === 'sav_cree') {
      title = '🔧 Nouveau SAV créé'
      body = `SAV #${sav_numero} — ${client_nom}`
    } else if (event === 'sav_termine') {
      title = '✅ SAV terminé'
      body = `SAV #${sav_numero} — ${client_nom} clôturé`
    } else if (event === 'sav_reactive') {
      title = '🔄 SAV réactivé'
      body = `SAV #${sav_numero} — ${client_nom} a été réouvert`
    }

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: {
        url: `/?id=${sav_id}`, // Permet d'ouvrir le SAV spécifique au clic
        sav_id
      }
    })

    // Envoi synchrone (on attend tous les envois)
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        try {
          await webpush.sendNotification(pushSubscription, notificationPayload)
          return { endpoint: sub.endpoint, success: true }
        } catch (err) {
          // Si le token est expiré (410), on le supprime de la base
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`Archiving stale subscription for ${sub.user_email}:`, sub.endpoint)
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
          }
          throw err
        }
      })
    )

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error sending push notification:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
