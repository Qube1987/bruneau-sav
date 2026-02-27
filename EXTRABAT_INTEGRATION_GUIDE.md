# Guide d'intégration Extrabat - Création de rendez-vous

Ce document décrit comment intégrer la création, modification et suppression de rendez-vous dans Extrabat depuis une application web.

## Architecture

L'intégration utilise une **Edge Function Supabase** comme proxy pour sécuriser les clés API Extrabat. Les appels directs depuis le frontend sont impossibles car ils exposeraient les clés secrètes.

```
Frontend → Supabase Edge Function → API Extrabat
```

## Prérequis

### 1. Clés API Extrabat

Vous devez obtenir auprès d'Extrabat :
- **EXTRABAT_API_KEY** : Votre clé API
- **EXTRABAT_SECURITY** : Votre clé de sécurité

### 2. Configuration Supabase

Les clés doivent être configurées comme secrets dans Supabase :
1. Accédez à votre dashboard Supabase
2. Allez dans **Edge Functions → Secrets**
3. Ajoutez les deux secrets :
   - `EXTRABAT_API_KEY`
   - `EXTRABAT_SECURITY`

## Structure de données

### Rendez-vous Extrabat

```typescript
interface ExtrabatAppointment {
  journee: boolean;              // false pour un RDV avec horaire précis
  objet: string;                 // Titre du rendez-vous
  debut: string;                 // Date/heure début format "YYYY-MM-DD HH:mm:ss"
  fin: string;                   // Date/heure fin format "YYYY-MM-DD HH:mm:ss"
  couleur: number;               // Couleur du RDV (ex: 131577)
  rue?: string;                  // Adresse : rue
  cp?: string;                   // Code postal
  ville?: string;                // Ville
  latitude?: number;             // Coordonnées GPS latitude
  longitude?: number;            // Coordonnées GPS longitude
  users: Array<{                 // Techniciens assignés
    user: number;                // ID utilisateur Extrabat
  }>;
  rdvClients?: Array<{           // Clients liés (optionnel)
    client: number;              // ID client Extrabat
  }>;
}
```

## Edge Function Supabase

### Fichier : `supabase/functions/extrabat-proxy/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExtrabatRequest {
  technicianCodes?: string[];
  interventionData?: {
    clientName: string;
    systemType: string;
    problemDesc: string;
    startedAt: string;          // Format ISO 8601
    endedAt?: string;            // Format ISO 8601
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  clientId?: number;             // ID client Extrabat (optionnel)
  extrabatAppointmentId?: string; // Pour modification
  action?: string;               // 'deleteAppointment' pour suppression
  appointmentId?: string;        // Pour suppression
}

Deno.serve(async (req: Request) => {
  // Gestion CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Récupération des clés API depuis les secrets Supabase
    const apiKey = Deno.env.get('EXTRABAT_API_KEY');
    const securityKey = Deno.env.get('EXTRABAT_SECURITY');

    if (!apiKey || !securityKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Clés API non configurées'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const requestBody: ExtrabatRequest = await req.json();

    // === SUPPRESSION D'UN RDV ===
    if (requestBody.action === 'deleteAppointment') {
      const { appointmentId } = requestBody;

      const response = await fetch(
        `https://api.extrabat.com/v1/agenda/rendez-vous/${appointmentId}`,
        {
          method: 'DELETE',
          headers: {
            'X-EXTRABAT-API-KEY': apiKey,
            'X-EXTRABAT-SECURITY': securityKey,
          }
        }
      );

      const responseData = await response.json();

      return new Response(
        JSON.stringify({
          success: response.ok,
          data: responseData
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // === CRÉATION/MODIFICATION D'UN RDV ===
    const { technicianCodes, interventionData, clientId, extrabatAppointmentId } = requestBody;

    if (!technicianCodes || technicianCodes.length === 0 || !interventionData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Paramètres manquants'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Formatage des dates
    const startDate = new Date(interventionData.startedAt);
    const endDate = interventionData.endedAt
      ? new Date(interventionData.endedAt)
      : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2h par défaut

    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    // Construction de l'objet rendez-vous
    const appointment = {
      journee: false,
      objet: `${interventionData.systemType} - ${interventionData.clientName}`,
      debut: formatDate(startDate),
      fin: formatDate(endDate),
      couleur: 131577,
      users: technicianCodes.map(code => ({
        user: parseInt(code, 10)
      }))
    };

    // Parsing de l'adresse
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

    // Ajout des coordonnées GPS
    if (interventionData.latitude !== undefined && interventionData.longitude !== undefined) {
      appointment.latitude = interventionData.latitude;
      appointment.longitude = interventionData.longitude;
    }

    // Ajout du client si fourni
    if (clientId) {
      appointment.rdvClients = [{ client: clientId }];
    }

    // Déterminer si c'est une création ou une modification
    const isUpdate = !!extrabatAppointmentId;
    const apiUrl = isUpdate
      ? `https://api.extrabat.com/v1/agenda/rendez-vous/${extrabatAppointmentId}`
      : 'https://api.extrabat.com/v1/agenda/rendez-vous';

    // Appel API Extrabat
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-EXTRABAT-API-KEY': apiKey,
        'X-EXTRABAT-SECURITY': securityKey,
      },
      body: JSON.stringify(appointment)
    });

    const responseData = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erreur API Extrabat: ${response.status}`,
          status: response.status
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: responseData,
        message: isUpdate ? 'RDV modifié' : 'RDV créé'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erreur:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
```

## Utilisation depuis le Frontend

### 1. Hook React personnalisé

Créez un hook pour faciliter les appels :

```typescript
// hooks/useExtrabat.ts
import { supabase } from '../lib/supabase';

interface ExtrabatResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const useExtrabat = () => {
  const createAppointment = async (
    technicianCodes: string[],
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
      const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
        body: {
          technicianCodes,
          interventionData,
          clientId
        }
      });

      if (error) {
        console.error('Erreur Supabase:', error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        console.error('Erreur Extrabat:', data.error);
        return { success: false, error: data.error };
      }

      return { success: true, data: data.data };

    } catch (error) {
      console.error('Erreur création RDV:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  };

  const updateAppointment = async (
    extrabatAppointmentId: string,
    technicianCodes: string[],
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
      const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
        body: {
          technicianCodes,
          interventionData,
          clientId,
          extrabatAppointmentId
        }
      });

      if (error) return { success: false, error: error.message };
      if (!data.success) return { success: false, error: data.error };

      return { success: true, data: data.data };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  };

  const deleteAppointment = async (
    extrabatAppointmentId: string
  ): Promise<ExtrabatResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke('extrabat-proxy', {
        body: {
          action: 'deleteAppointment',
          appointmentId: extrabatAppointmentId
        }
      });

      if (error) return { success: false, error: error.message };
      if (!data.success) return { success: false, error: data.error };

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  };

  return { createAppointment, updateAppointment, deleteAppointment };
};
```

### 2. Exemple d'utilisation dans un composant

```typescript
import { useExtrabat } from '../hooks/useExtrabat';

function MyComponent() {
  const { createAppointment, updateAppointment, deleteAppointment } = useExtrabat();

  const handleCreateAppointment = async () => {
    // Codes techniciens Extrabat (IDs utilisateurs dans Extrabat)
    const technicianCodes = ['12345', '67890'];

    const result = await createAppointment(
      technicianCodes,
      {
        clientName: 'ACME Corp',
        systemType: 'Alarme incendie SSI',
        problemDesc: 'Maintenance préventive annuelle',
        startedAt: '2026-02-15T09:00:00Z',    // Format ISO 8601
        endedAt: '2026-02-15T11:00:00Z',
        address: '10 rue de la Paix, 75001 Paris',
        latitude: 48.8566,                     // Coordonnées GPS
        longitude: 2.3522
      },
      123456  // ID client Extrabat (optionnel)
    );

    if (result.success) {
      console.log('RDV créé avec succès:', result.data);
      // result.data contient l'ID du RDV créé dans Extrabat
      const appointmentId = result.data.id;
    } else {
      console.error('Erreur:', result.error);
    }
  };

  const handleUpdateAppointment = async () => {
    const result = await updateAppointment(
      '789012',  // ID du RDV Extrabat à modifier
      ['12345', '67890'],
      {
        clientName: 'ACME Corp',
        systemType: 'Alarme incendie SSI',
        problemDesc: 'Maintenance préventive annuelle',
        startedAt: '2026-02-15T14:00:00Z',  // Nouveau horaire
        endedAt: '2026-02-15T16:00:00Z',
        address: '10 rue de la Paix, 75001 Paris',
        latitude: 48.8566,
        longitude: 2.3522
      },
      123456
    );

    if (result.success) {
      console.log('RDV modifié avec succès');
    }
  };

  const handleDeleteAppointment = async () => {
    const result = await deleteAppointment('789012');

    if (result.success) {
      console.log('RDV supprimé avec succès');
    }
  };

  return (
    <div>
      <button onClick={handleCreateAppointment}>Créer RDV</button>
      <button onClick={handleUpdateAppointment}>Modifier RDV</button>
      <button onClick={handleDeleteAppointment}>Supprimer RDV</button>
    </div>
  );
}
```

## Points importants

### 1. Codes techniciens
Les `technicianCodes` sont les **IDs utilisateurs Extrabat** (nombres), pas les IDs de votre base de données locale. Vous devez stocker la correspondance entre vos utilisateurs et leurs codes Extrabat.

### 2. Format des dates
- **Input** : Format ISO 8601 (`2026-02-15T09:00:00Z`)
- **Extrabat attend** : Format `YYYY-MM-DD HH:mm:ss`
- La conversion est faite automatiquement dans l'Edge Function

### 3. Coordonnées GPS
Les coordonnées `latitude` et `longitude` permettent aux techniciens de lancer Waze directement depuis Extrabat. Elles sont optionnelles mais fortement recommandées.

### 4. Parsing d'adresse
L'Edge Function parse automatiquement l'adresse au format :
- `"10 rue de la Paix, 75001 Paris"` → `rue`, `cp`, `ville`
- Si l'adresse ne contient pas de virgule, elle est mise dans `rue`

### 5. Couleur du RDV
La valeur `131577` correspond à une couleur spécifique dans Extrabat. Vous pouvez la modifier selon vos besoins.

### 6. Durée par défaut
Si `endedAt` n'est pas fourni, l'Edge Function ajoute automatiquement 2 heures à `startedAt`.

## Déploiement de l'Edge Function

```bash
# Déployer la fonction
supabase functions deploy extrabat-proxy

# Configurer les secrets
supabase secrets set EXTRABAT_API_KEY=votre_cle_api
supabase secrets set EXTRABAT_SECURITY=votre_cle_securite
```

## Stockage de l'ID Extrabat

Quand vous créez un RDV, Extrabat retourne un ID. Stockez-le dans votre base de données pour pouvoir modifier ou supprimer le RDV plus tard :

```typescript
const result = await createAppointment(technicianCodes, interventionData);

if (result.success && result.data?.id) {
  // Stocker dans votre DB
  await supabase
    .from('interventions')
    .update({ extrabat_intervention_id: result.data.id })
    .eq('id', interventionId);
}
```

## API Extrabat - Endpoints

- **Créer un RDV** : `POST https://api.extrabat.com/v1/agenda/rendez-vous`
- **Modifier un RDV** : `POST https://api.extrabat.com/v1/agenda/rendez-vous/{id}`
- **Supprimer un RDV** : `DELETE https://api.extrabat.com/v1/agenda/rendez-vous/{id}`

Headers requis :
```
X-EXTRABAT-API-KEY: votre_cle_api
X-EXTRABAT-SECURITY: votre_cle_securite
Content-Type: application/json
```

## Gestion des erreurs

L'Edge Function retourne toujours un objet avec :
```typescript
{
  success: boolean;
  data?: any;        // Si succès
  error?: string;    // Si erreur
  message?: string;  // Message de confirmation
}
```

Gérez les erreurs côté frontend :
```typescript
const result = await createAppointment(...);

if (!result.success) {
  if (result.error?.includes('credentials not configured')) {
    alert('Configuration Extrabat manquante - contactez l\'administrateur');
  } else {
    alert(`Erreur: ${result.error}`);
  }
}
```

## Support multi-techniciens

Extrabat supporte l'assignation de plusieurs techniciens à un même RDV. Passez simplement un tableau de codes :

```typescript
const technicianCodes = ['12345', '67890', '11111'];

await createAppointment(technicianCodes, interventionData);
```

## Conclusion

Cette architecture permet de :
- ✅ Sécuriser les clés API Extrabat
- ✅ Créer, modifier et supprimer des RDV
- ✅ Assigner plusieurs techniciens
- ✅ Fournir des coordonnées GPS pour la navigation
- ✅ Lier des clients Extrabat aux RDV
- ✅ Gérer les erreurs proprement

Pour toute question, consultez la [documentation officielle Extrabat](https://api.extrabat.com/documentation).
