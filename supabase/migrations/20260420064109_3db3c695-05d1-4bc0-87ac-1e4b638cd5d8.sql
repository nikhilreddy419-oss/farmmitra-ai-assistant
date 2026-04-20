CREATE TABLE public.recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  locality TEXT NOT NULL,
  area_acres TEXT NOT NULL,
  soil_type TEXT NOT NULL,
  water_availability TEXT NOT NULL,
  budget TEXT NOT NULL,
  rainfall TEXT NOT NULL,
  season TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  recommendation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_recommendations_session ON public.recommendations(session_id, created_at DESC);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert recommendations"
ON public.recommendations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can read recommendations"
ON public.recommendations
FOR SELECT
USING (true);