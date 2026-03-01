-- Table pour stocker les subscriptions push de chaque utilisateur
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ DEFAULT NOW()
);

-- RLS : chaque user ne voit que ses propres subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Quentin peut voir toutes les subscriptions (pour envoyer les notifs globales)
CREATE POLICY "Admin read all" ON public.push_subscriptions
  FOR SELECT USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'quentin@bruneau27.com'
  );

-- Index pour la performance des recherches par email
CREATE INDEX IF NOT EXISTS idx_push_subs_user_email ON public.push_subscriptions(user_email);
