-- Postgres Optimization Migration
-- Date: 2026-05-18
-- Purpose: Add missing foreign key indexes and fix RLS security issue
--
-- Based on Supabase Postgres best practices:
-- - Foreign key columns should be indexed (10-100x faster JOINs/CASCADE)
-- - RLS should be enabled on all tables with appropriate policies

-- ====================================================================
-- CRITICAL: Security Fix - food_units RLS
-- ====================================================================
-- Enable RLS on food_units table (idempotent)
-- NOTE: This enables RLS first, then adds policies to avoid blocking all access
do $$
begin
  if not exists (
    select 1 from pg_tables
    where schemaname = 'public'
    and tablename = 'food_units'
    and rowsecurity = true
  ) then
    alter table public.food_units enable row level security;
  end if;
end $$;

-- Policy: Authenticated users can read food units
DROP POLICY IF EXISTS "food_units_read" ON public.food_units;
CREATE POLICY "food_units_read" ON public.food_units
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Staff (admin/ahli_gizi) can manage food units
DROP POLICY IF EXISTS "food_units_staff" ON public.food_units;
CREATE POLICY "food_units_staff" ON public.food_units
  FOR ALL USING (public.jwt_is_staff());

-- ====================================================================
-- HIGH PRIORITY: Missing Foreign Key Indexes
-- ====================================================================
-- These foreign keys lack indexes, causing slow JOINs and CASCADE operations.
-- Impact: 10-100x faster queries on large tables.

-- CRITICAL: food_log_items.food_log_id
-- This is the most critical index as food_log_items has 5,184 rows
-- and is frequently joined with food_logs
DROP INDEX IF EXISTS public.food_log_items_food_log_id_idx;
CREATE INDEX food_log_items_food_log_id_idx ON public.food_log_items (food_log_id);

-- HIGH: food_log_items.unit_id
-- Medium impact - 5,184 rows joining to food_units
DROP INDEX IF EXISTS public.food_log_items_unit_id_idx;
CREATE INDEX food_log_items_unit_id_idx ON public.food_log_items (unit_id);

-- MEDIUM: anthropometric_change_log.changed_by
-- 477 rows - profiles lookup for change tracking
DROP INDEX IF EXISTS public.anthropometric_change_log_changed_by_idx;
CREATE INDEX anthropometric_change_log_changed_by_idx ON public.anthropometric_change_log (changed_by);

-- MEDIUM: assessments.created_by
-- 223 rows - profiles lookup for creator information
DROP INDEX IF EXISTS public.assessments_created_by_idx;
CREATE INDEX assessments_created_by_idx ON public.assessments (created_by);

-- LOW: body_measurements.created_by
-- 106 rows - profiles lookup for creator information
DROP INDEX IF EXISTS public.body_measurements_created_by_idx;
CREATE INDEX body_measurements_created_by_idx ON public.body_measurements (created_by);

-- LOW: user_evaluations.created_by
-- 0 rows currently but future-proofing for growth
DROP INDEX IF EXISTS public.user_evaluations_created_by_idx;
CREATE INDEX user_evaluations_created_by_idx ON public.user_evaluations (created_by);

-- LOW: food_log_deletions.user_id
-- 151 rows - should be indexed for FK cascade performance
DROP INDEX IF EXISTS public.food_log_deletions_user_id_idx;
CREATE INDEX food_log_deletions_user_id_idx ON public.food_log_deletions (user_id);

-- LOW: food_units.created_by
-- 21 rows - minimal impact but consistent with pattern
DROP INDEX IF EXISTS public.food_units_created_by_idx;
CREATE INDEX food_units_created_by_idx ON public.food_units (created_by);

-- ====================================================================
-- Verification Query (run this after migration to verify)
-- ====================================================================
-- This query checks for any remaining unindexed foreign keys:
--
-- select
--   conrelid::regclass as table_name,
--   a.attname as fk_column,
--   confrelid::regclass as referenced_table
-- from pg_constraint c
-- join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
-- where c.contype = 'f'
--   and connamespace = 'public'::regnamespace
--   and not exists (
--     select 1 from pg_index i
--     where i.indrelid = c.conrelid and a.attnum = any(i.indkey)
--   )
-- order by conrelid::regclass::text, a.attname;
--
-- Expected result: 0 rows (all foreign keys indexed)
