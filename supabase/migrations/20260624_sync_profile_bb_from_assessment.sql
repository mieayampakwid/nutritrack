-- Sync profiles.berat_badan from assessments
-- Fires AFTER INSERT on assessments, copies berat_badan to profiles when non-null.
-- Backfill updates existing profiles with latest assessment berat_badan.

CREATE OR REPLACE FUNCTION public.sync_profile_bb_from_assessment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.berat_badan IS NOT NULL THEN
    UPDATE profiles SET berat_badan = NEW.berat_badan
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assessments_sync_profile_bb ON public.assessments;
CREATE TRIGGER trg_assessments_sync_profile_bb
  AFTER INSERT ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_bb_from_assessment();

GRANT ALL ON FUNCTION public.sync_profile_bb_from_assessment() TO anon;
GRANT ALL ON FUNCTION public.sync_profile_bb_from_assessment() TO authenticated;
GRANT ALL ON FUNCTION public.sync_profile_bb_from_assessment() TO service_role;

-- Backfill existing users
UPDATE public.profiles p SET berat_badan = (
  SELECT a.berat_badan FROM public.assessments a
  WHERE a.user_id = p.id AND a.berat_badan IS NOT NULL
  ORDER BY a.created_at DESC LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM public.assessments a
  WHERE a.user_id = p.id AND a.berat_badan IS NOT NULL
);
