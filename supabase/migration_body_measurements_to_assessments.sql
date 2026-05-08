-- Migrate body_measurements to assessments table
-- This copies all historical body measurements to the assessments table

INSERT INTO public.assessments (
  user_id,
  tanggal,
  berat_badan,
  tinggi_badan,
  massa_otot,
  massa_lemak,
  lingkar_pinggang,
  jenis_kelamin,
  umur,
  faktor_aktivitas,
  faktor_stres,
  energi_total,
  created_by,
  catatan_asesmen
)
SELECT
  bm.user_id,
  bm.tanggal,
  bm.berat_badan,
  bm.tinggi_badan,
  bm.massa_otot,
  bm.massa_lemak,
  bm.lingkar_pinggang,
  p.jenis_kelamin,
  EXTRACT(YEAR FROM AGE(bm.tanggal::timestamp, p.tgl_lahir::timestamp))::integer AS umur,
  1.2 AS faktor_aktivitas,
  1.2 AS faktor_stres,
  NULL AS energi_total,
  COALESCE(bm.created_by, p.id) AS created_by,
  'Migrasi dari body_measurements' AS catatan_asesmen
FROM public.body_measurements bm
JOIN public.profiles p ON p.id = bm.user_id
WHERE p.tgl_lahir IS NOT NULL
ON CONFLICT DO NOTHING;

-- Verify migration
SELECT
  'body_measurements' AS source,
  COUNT(*) AS count
FROM public.body_measurements
UNION ALL
SELECT
  'assessments (migrated)' AS source,
  COUNT(*) AS count
FROM public.assessments
WHERE catatan_asesmen = 'Migrasi dari body_measurements';
