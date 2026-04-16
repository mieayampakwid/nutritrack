-- Demo seed for "Makanan populer" (Admin / Ahli gizi dashboard).
-- Run in Supabase SQL Editor as postgres (or role that bypasses RLS).
-- Picks the oldest klien by created_at. To pin a specific client, edit the SELECT inside the DO block.
-- After your presentation, run the DELETE block at the bottom.

DO $$
DECLARE
  klien_id uuid;
BEGIN
  SELECT id INTO klien_id
  FROM public.profiles
  WHERE role = 'klien'
  ORDER BY created_at ASC
  LIMIT 1;

  -- Optional: use a specific klien instead (comment out the block above and uncomment):
  -- klien_id := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid;

  IF klien_id IS NULL THEN
    RAISE EXCEPTION 'No klien profile found. Add a user with role klien first.';
  END IF;

  INSERT INTO public.food_logs (id, user_id, tanggal, waktu_makan, total_kalori, status) VALUES
    ('a1111111-1111-4111-8111-111111111101', klien_id, (CURRENT_DATE - INTERVAL '0 days')::date, 'siang', 520, 'saved'),
    ('a1111111-1111-4111-8111-111111111102', klien_id, (CURRENT_DATE - INTERVAL '1 day')::date, 'pagi', 480, 'saved'),
    ('a1111111-1111-4111-8111-111111111103', klien_id, (CURRENT_DATE - INTERVAL '2 days')::date, 'malam', 610, 'saved'),
    ('a1111111-1111-4111-8111-111111111104', klien_id, (CURRENT_DATE - INTERVAL '3 days')::date, 'siang', 390, 'saved'),
    ('a1111111-1111-4111-8111-111111111105', klien_id, (CURRENT_DATE - INTERVAL '4 days')::date, 'pagi', 550, 'saved'),
    ('a1111111-1111-4111-8111-111111111106', klien_id, (CURRENT_DATE - INTERVAL '5 days')::date, 'snack', 220, 'saved'),
    ('a1111111-1111-4111-8111-111111111107', klien_id, (CURRENT_DATE - INTERVAL '6 days')::date, 'siang', 470, 'saved'),
    ('a1111111-1111-4111-8111-111111111108', klien_id, CURRENT_DATE::date, 'malam', 600, 'saved');

  INSERT INTO public.food_log_items (food_log_id, nama_makanan, jumlah, unit_id, unit_nama, kalori_estimasi) VALUES
    ('a1111111-1111-4111-8111-111111111101', 'Nasi putih', 1.5, (SELECT id FROM public.food_units WHERE nama = 'centong' LIMIT 1), 'centong', 280),
    ('a1111111-1111-4111-8111-111111111101', 'Ayam goreng', 1, (SELECT id FROM public.food_units WHERE nama = 'potong' LIMIT 1), 'potong', 180),
    ('a1111111-1111-4111-8111-111111111101', 'Sayur lodeh', 1, (SELECT id FROM public.food_units WHERE nama = 'sendok makan' LIMIT 1), 'sendok makan', 60),

    ('a1111111-1111-4111-8111-111111111102', 'Nasi putih', 1, (SELECT id FROM public.food_units WHERE nama = 'centong' LIMIT 1), 'centong', 200),
    ('a1111111-1111-4111-8111-111111111102', 'Telur rebus', 2, (SELECT id FROM public.food_units WHERE nama = 'buah' LIMIT 1), 'buah', 140),
    ('a1111111-1111-4111-8111-111111111102', 'Tempe goreng', 2, (SELECT id FROM public.food_units WHERE nama = 'potong' LIMIT 1), 'potong', 140),

    ('a1111111-1111-4111-8111-111111111103', 'Nasi putih', 2, (SELECT id FROM public.food_units WHERE nama = 'centong' LIMIT 1), 'centong', 400),
    ('a1111111-1111-4111-8111-111111111103', 'Ikan bakar', 1, (SELECT id FROM public.food_units WHERE nama = 'potong' LIMIT 1), 'potong', 150),
    ('a1111111-1111-4111-8111-111111111103', 'Tahu goreng', 3, (SELECT id FROM public.food_units WHERE nama = 'potong' LIMIT 1), 'potong', 60),

    ('a1111111-1111-4111-8111-111111111104', 'Bubur ayam', 1, (SELECT id FROM public.food_units WHERE nama = 'gelas' LIMIT 1), 'gelas', 250),
    ('a1111111-1111-4111-8111-111111111104', 'Kerupuk', 1, (SELECT id FROM public.food_units WHERE nama = 'bungkus' LIMIT 1), 'bungkus', 140),

    ('a1111111-1111-4111-8111-111111111105', 'Nasi putih', 1, (SELECT id FROM public.food_units WHERE nama = 'centong' LIMIT 1), 'centong', 200),
    ('a1111111-1111-4111-8111-111111111105', 'Rendang', 1, (SELECT id FROM public.food_units WHERE nama = 'sendok makan' LIMIT 1), 'sendok makan', 250),
    ('a1111111-1111-4111-8111-111111111105', 'Sayur bening', 1, (SELECT id FROM public.food_units WHERE nama = 'sendok makan' LIMIT 1), 'sendok makan', 100),

    ('a1111111-1111-4111-8111-111111111106', 'Buah pepaya', 1, (SELECT id FROM public.food_units WHERE nama = 'potong' LIMIT 1), 'potong', 120),
    ('a1111111-1111-4111-8111-111111111106', 'Susu skim', 1, (SELECT id FROM public.food_units WHERE nama = 'gelas' LIMIT 1), 'gelas', 100),

    ('a1111111-1111-4111-8111-111111111107', 'Mie goreng', 1, (SELECT id FROM public.food_units WHERE nama = 'bungkus' LIMIT 1), 'bungkus', 350),
    ('a1111111-1111-4111-8111-111111111107', 'Telur', 1, (SELECT id FROM public.food_units WHERE nama = 'buah' LIMIT 1), 'buah', 120),

    ('a1111111-1111-4111-8111-111111111108', 'Nasi putih', 1.5, (SELECT id FROM public.food_units WHERE nama = 'centong' LIMIT 1), 'centong', 280),
    ('a1111111-1111-4111-8111-111111111108', 'Ayam goreng', 1, (SELECT id FROM public.food_units WHERE nama = 'potong' LIMIT 1), 'potong', 180),
    ('a1111111-1111-4111-8111-111111111108', 'Es teh manis', 1, (SELECT id FROM public.food_units WHERE nama = 'gelas' LIMIT 1), 'gelas', 140);
END $$;

-- ---------------------------------------------------------------------------
-- AFTER PRESENTATION: remove demo rows (run this in SQL Editor).
-- ---------------------------------------------------------------------------
-- DELETE FROM public.food_logs
-- WHERE id IN (
--   'a1111111-1111-4111-8111-111111111101',
--   'a1111111-1111-4111-8111-111111111102',
--   'a1111111-1111-4111-8111-111111111103',
--   'a1111111-1111-4111-8111-111111111104',
--   'a1111111-1111-4111-8111-111111111105',
--   'a1111111-1111-4111-8111-111111111106',
--   'a1111111-1111-4111-8111-111111111107',
--   'a1111111-1111-4111-8111-111111111108'
-- );
