-- Add notifications_cleared_at column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS notifications_cleared_at timestamptz;

-- Create notification_dismissals table for individual notification dismissals
CREATE TABLE IF NOT EXISTS public.notification_dismissals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  notification_id text NOT NULL,
  dismissed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, notification_type, notification_id)
);

-- Enable RLS
ALTER TABLE public.notification_dismissals ENABLE ROW LEVEL SECURITY;

-- Users can read their own dismissals
CREATE POLICY "Users can read own dismissals"
  ON public.notification_dismissals
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own dismissals
CREATE POLICY "Users can insert own dismissals"
  ON public.notification_dismissals
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own dismissals
CREATE POLICY "Users can delete own dismissals"
  ON public.notification_dismissals
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
