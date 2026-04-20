DROP POLICY IF EXISTS "Anyone can insert recommendations" ON public.recommendations;

CREATE POLICY "Insert with valid session id"
ON public.recommendations
FOR INSERT
WITH CHECK (
  session_id IS NOT NULL
  AND length(session_id) >= 16
  AND length(session_id) <= 128
);