# Déploiement sur Netlify

## Option 1 : Déployer le dossier dist (RECOMMANDÉ)

1. Exécutez `npm run build` localement
2. Glissez-déposez le dossier `dist` sur Netlify
3. Configurez les variables d'environnement dans Netlify :
   - `VITE_SUPABASE_URL` = `https://0ec90b57d6e95fcbda19832f.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw`

## Option 2 : Déployer tout le projet

1. Glissez-déposez le dossier complet sur Netlify
2. Dans Site settings, configurez :
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Configurez les mêmes variables d'environnement qu'en Option 1

## IMPORTANT

Sans les variables d'environnement Supabase configurées dans Netlify, l'authentification ne fonctionnera pas !
