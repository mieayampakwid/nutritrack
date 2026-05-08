-- Migrate body_measurements to assessments table with calculated BMR and energi_total
-- This copies valid historical body measurements to the assessments table
-- Only records with complete data (tgl_lahir, berat_badan, tinggi_badan) are migrated

INSERT INTO public.assessments (
  user_id,
  tanggal,
  berat_badan,
  tinggi_badan,
  massa_otot,
  massa_lemak,
  lingkar_pinggang,
  bmi,
  jenis_kelamin,
  umur,
  faktor_aktivitas,
  faktor_stres,
  bmr,
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
  bm.bmi,
  p.jenis_kelamin,
  EXTRACT(YEAR FROM AGE(bm.tanggal::timestamp, p.tgl_lahir::timestamp))::integer AS umur,
  1.2 AS faktor_aktivitas,
  1.2 AS faktor_stres,
  -- Calculate BMR using Harris-Benedict formula
  CASE
    WHEN p.jenis_kelamin = 'male' THEN
      ROUND((66 + (13.7 * bm.berat_badan) + (5 * bm.tinggi_badan) - (6.8 * EXTRACT(YEAR FROM AGE(bm.tanggal::timestamp, p.tgl_lahir::timestamp))))::numeric, 2)
    WHEN p.jenis_kelamin = 'female' THEN
      ROUND((655 + (9.6 * bm.berat_badan) + (1.8 * bm.tinggi_badan) - (4.7 * EXTRACT(YEAR FROM AGE(bm.tanggal::timestamp, p.tgl_lahir::timestamp))))::numeric, 2)
    ELSE NULL
  END AS bmr,
  -- Calculate energi_total = BMR × activity × stress
  CASE
    WHEN p.jenis_kelamin IN ('male', 'female') THEN
      ROUND(
        (CASE
          WHEN p.jenis_kelamin = 'male' THEN
            66 + (13.7 * bm.berat_badan) + (5 * bm.tinggi_badan) - (6.8 * EXTRACT(YEAR FROM AGE(bm.tanggal::timestamp, p.tgl_lahir::timestamp)))
          WHEN p.jenis_kelamin = 'female' THEN
            655 + (9.6 * bm.berat_badan) + (1.8 * bm.tinggi_badan) - (4.7 * EXTRACT(YEAR FROM AGE(bm.tanggal::timestamp, p.tgl_lahir::timestamp)))
        END) * 1.2 * 1.2
      , 1)
    ELSE 0
  END AS energi_total,
  COALESCE(bm.created_by, p.id) AS created_by,
  'Migrasi dari body_measurements' AS catatan_asesmen
FROM public.body_measurements bm
JOIN public.profiles p ON p.id = bm.user_id
WHERE p.tgl_lahir IS NOT NULL
  AND bm.berat_badan IS NOT NULL
  AND bm.tinggi_badan IS NOT NULL
ON CONFLICT DO NOTHING;

-- Verify migration
SELECT
  'body_measurements' AS source,
  COUNT(*) AS count
FROM public.body_measurements
UNION ALL
SELECT
  'assessments (total)' AS source,
  COUNT(*) AS count
FROM public.assessments
UNION ALL
SELECT
  'assessments (migrated)' AS source,
  COUNT(*) AS count
FROM public.assessments
WHERE catatan_asesmen = 'Migrasi dari body_measurements';
