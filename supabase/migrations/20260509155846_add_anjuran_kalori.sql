ALTER TABLE public.assessments
  ADD COLUMN anjuran_kalori_harian numeric(10,2);

COMMENT ON COLUMN public.assessments.anjuran_kalori_harian
  IS 'Manual adjusted daily calorie recommendation set by ahli gizi. Falls back to energi_total when NULL.';
