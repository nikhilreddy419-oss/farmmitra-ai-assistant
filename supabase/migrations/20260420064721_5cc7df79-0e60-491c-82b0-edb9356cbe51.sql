-- Add user_id to recommendations to link to authenticated users
ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON public.recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_session_id ON public.recommendations(session_id);

-- Replace overly permissive policies with auth-aware ones
DROP POLICY IF EXISTS "Anyone can read recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Insert with valid session id" ON public.recommendations;

-- SELECT: users see their own rows
CREATE POLICY "Users can view own recommendations"
  ON public.recommendations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: authenticated users insert rows tied to themselves
CREATE POLICY "Users can insert own recommendations"
  ON public.recommendations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND session_id IS NOT NULL
    AND length(session_id) >= 16
    AND length(session_id) <= 128
  );

-- UPDATE: needed for migrating anonymous (user_id IS NULL) rows on first login
CREATE POLICY "Users can claim anonymous recommendations"
  ON public.recommendations FOR UPDATE
  TO authenticated
  USING (user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: users can delete their own
CREATE POLICY "Users can delete own recommendations"
  ON public.recommendations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Anonymous insert (pre-login) so the form still works before sign-in,
-- rows get claimed on first login via the UPDATE policy above.
CREATE POLICY "Anonymous can insert with session id"
  ON public.recommendations FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
    AND session_id IS NOT NULL
    AND length(session_id) >= 16
    AND length(session_id) <= 128
  );