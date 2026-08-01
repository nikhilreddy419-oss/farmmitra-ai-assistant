DROP POLICY IF EXISTS "Anonymous can insert with session id" ON public.recommendations;
CREATE POLICY "Anonymous can insert with session id"
ON public.recommendations
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL
  AND session_id IS NOT NULL
  AND length(session_id) >= 32
  AND length(session_id) <= 128
);

DROP POLICY IF EXISTS "Users can insert own recommendations" ON public.recommendations;
CREATE POLICY "Users can insert own recommendations"
ON public.recommendations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND session_id IS NOT NULL
  AND length(session_id) >= 32
  AND length(session_id) <= 128
);

DROP POLICY IF EXISTS "Users can claim anonymous recommendations" ON public.recommendations;
CREATE POLICY "Users can claim anonymous recommendations"
ON public.recommendations
FOR UPDATE
TO authenticated
USING (
  user_id IS NULL
  AND session_id IS NOT NULL
  AND length(session_id) >= 32
  AND created_at > (now() - interval '24 hours')
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.chat_session_id IS NOT NULL
      AND length(p.chat_session_id) >= 32
      AND p.chat_session_id = recommendations.session_id
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND session_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.chat_session_id = recommendations.session_id
  )
);