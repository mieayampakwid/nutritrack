# Demo: Makanan populer (dummy data)

Use this when you need the **Makanan populer** chart on the Admin / Ahli gizi dashboards to show realistic bars for a presentation. The chart reads real rows from `food_logs` + `food_log_items` (see `src/hooks/usePopularFoodTrend.js`).

## Before you run anything

1. Pick a **klien** `profiles.id` (the chart counts all clients’ logs in range; this data is attached to one client so you can delete it cleanly).
2. Run SQL in the **Supabase SQL Editor** as a role that bypasses RLS (e.g. **postgres** / **service role**). The app’s staff users **cannot** insert `food_logs` for someone else—only this path inserts demo rows quickly.

## Add demo data

1. Open `supabase/demo_makanan_populer.sql`.
2. Run the **`DO $$ ... $$`** block as-is. It automatically uses the **earliest klien** (`profiles` where `role = 'klien'`, ordered by `created_at`). If you need a specific client, edit the block: comment the `SELECT id INTO klien_id ...` and set `klien_id := '…'::uuid` (see the comment in the file).

Refresh the dashboard; use **Mingguan** or **Bulanan** if some rows use past dates.

**Why no text placeholder?** PostgreSQL only accepts valid UUID literals. A string like `REPLACE_KLIEN_PROFILE_ID` is not a UUID and causes `invalid input syntax for type uuid`.

## After the presentation (remove demo data)

1. In the same SQL file, run the **DELETE** block (or only `DELETE FROM food_logs WHERE id IN (...)`).

Deleting **`food_logs`** rows removes linked **`food_log_items`** automatically (FK `on delete cascade`).

## If something goes wrong

- `ROLLBACK;` if you left a transaction open.
- Confirm IDs: `SELECT id, tanggal, waktu_makan FROM food_logs WHERE id IN (...);` before delete.

## Files

| File | Purpose |
|------|---------|
| `supabase/demo_makanan_populer.sql` | Inserts demo logs + items; delete script uses fixed `food_logs.id` values |

No app code changes are required for this demo path.
