
-- Fix privilege escalation: only allow claiming anonymous rows whose session_id matches the user's profile.chat_session_id
DROP POLICY IF EXISTS "Users can claim anonymous recommendations" ON public.recommendations;

CREATE POLICY "Users can claim anonymous recommendations"
ON public.recommendations
FOR UPDATE
TO authenticated
USING (
  user_id IS NULL
  AND session_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.chat_session_id IS NOT NULL
      AND p.chat_session_id = public.recommendations.session_id
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND session_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.chat_session_id = public.recommendations.session_id
  )
);

-- Revoke public EXECUTE on SECURITY DEFINER functions; keep service_role and postgres for triggers/admin.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
