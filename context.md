# Contexte technique - Bruneau CRM

## Base de données
- Base Supabase unifiée : rzxisqsdsiiuwaixnneo
- Les tables `prospects` ont été renommées en `clients`
- `prospect_id` → `client_id` partout

## Utilisateurs
- Il y a 2 tables users : `auth.users` (authentification Supabase) et `public.users` (données métier)
- Les UUID ne correspondent PAS entre les deux tables
- Les FK doivent pointer vers `public.users`, JAMAIS vers `auth.users`
- User connecté (auth.uid) : 23503c86-4dbd-40c7-b17e-156b608109ff
- User métier historique : fc34d6a8-cb6e-4f3c-9f9a-a069cd185d00

## Règles strictes
⚠️ NE JAMAIS exécuter de DELETE, DROP TABLE, ou TRUNCATE sur la base de production
⚠️ NE JAMAIS modifier les FK pour pointer vers auth.users
⚠️ En cas de problème de FK, corriger la contrainte, jamais supprimer les données