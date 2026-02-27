# Module IA de Reformulation des Rapports SAV

## Vue d'ensemble

Ce module permet aux techniciens de transformer automatiquement leurs rapports dictés (souvent avec des fautes et mal structurés) en rapports professionnels, clairs et juridiquement exploitables.

## Fonctionnalités

✅ **Deux champs distincts** :
- **Rapport brut** : Saisie/dictée du technicien, conservée intacte pour traçabilité
- **Rapport reformulé** : Version professionnelle générée par l'IA, modifiable manuellement

✅ **Reformulation automatique** via bouton "Améliorer le rapport avec l'IA"

✅ **Prompt verrouillé** garantissant :
- Aucune information ajoutée ou supprimée
- Correction des fautes d'orthographe et de grammaire
- Vouvoiement et ton professionnel
- Aucune conclusion commerciale
- Respect strict des faits

✅ **Gestion des erreurs** conviviale pour les utilisateurs

## Configuration requise

### 1. Clé API OpenAI

Pour que le module fonctionne, vous devez configurer une clé API OpenAI dans Supabase :

1. Créez ou connectez-vous à votre compte OpenAI : https://platform.openai.com
2. Générez une clé API dans la section "API Keys"
3. Dans votre projet Supabase :
   - Allez dans **Settings** → **Edge Functions** → **Secrets**
   - Ajoutez un nouveau secret :
     - Nom : `OPENAI_API_KEY`
     - Valeur : Votre clé API OpenAI

⚠️ **Important** : La clé API est stockée côté serveur (Edge Function) et n'est jamais exposée côté client.

### 2. Migration de la base de données

Les champs nécessaires ont été automatiquement ajoutés via la migration :
- `rapport_brut` (text)
- `rapport_reformule` (text)
- `rapport_valide_par_technicien` (boolean)

## Utilisation

### Pour les techniciens

1. Ouvrez ou créez une demande SAV
2. Dans la section "Rapport technique" :
   - Saisissez ou dictez votre rapport dans le champ **Rapport brut**
   - Cliquez sur **🪄 Améliorer le rapport avec l'IA**
   - Le rapport reformulé apparaît automatiquement
   - Vous pouvez le modifier manuellement si nécessaire
3. Enregistrez la demande SAV

### Messages d'état

- **Analyse et reformulation en cours...** : L'IA traite le rapport
- **Rapport reformulé avec succès !** : La reformulation est terminée
- **Le rapport brut est vide** : Vous devez saisir un rapport avant de cliquer sur le bouton
- **La reformulation n'a pas pu être effectuée** : Erreur technique (vérifier la clé API ou réessayer)

## Architecture technique

### Edge Function : `reformulate-report`

**Endpoint** : `/functions/v1/reformulate-report`

**Méthode** : POST

**Body** :
```json
{
  "rapport_brut": "Texte du rapport brut"
}
```

**Réponse** :
```json
{
  "rapport_reformule": "Texte reformulé"
}
```

**Erreur** :
```json
{
  "error": "Message d'erreur"
}
```

### Hook React : `useAIReformulation`

Hook personnalisé facilitant l'appel à l'Edge Function :

```typescript
const { reformulateReport, loading, error } = useAIReformulation();

const result = await reformulateReport(rapportBrut);
```

## Sécurité

✅ **Clé API côté serveur** : Jamais exposée au client
✅ **Authentification JWT** : Seuls les utilisateurs authentifiés peuvent appeler l'API
✅ **CORS configuré** : Headers appropriés pour la sécurité
✅ **Validation des entrées** : Rapport vide rejeté
✅ **Traçabilité** : Le rapport brut est toujours conservé

## Modèle IA

- **Modèle** : GPT-4 (OpenAI)
- **Temperature** : 0.3 (pour cohérence et fiabilité)
- **Max tokens** : 2000
- **Prompt** : Verrouillé et non modifiable

## Coûts estimés

Avec GPT-4 (tarifs OpenAI au 01/2026) :
- Input : ~$0.03 par 1000 tokens
- Output : ~$0.06 par 1000 tokens

**Estimation** : ~$0.01 à $0.03 par rapport reformulé

## Évolutions futures (hors V1)

- Extraction automatique des actions réalisées
- Génération de synthèse client
- Pré-remplissage de facture SAV
- Analyse qualité des rapports
- Historique des versions IA

## Support

Pour toute question technique :
1. Vérifiez que la clé API OpenAI est bien configurée
2. Consultez les logs de l'Edge Function dans Supabase
3. Vérifiez votre solde de crédits OpenAI
