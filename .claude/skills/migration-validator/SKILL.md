---
name: migration-validator
description: Validate Supabase migrations for NutriTrack before applying. Use this when creating or reviewing migration files to ensure RLS policies are correct, column naming follows Indonesian conventions, and schema changes are safe. Essential for preventing security issues and data inconsistencies.
---

# Migration Validator

Validates Supabase migration SQL files against the NutriTrack schema, ensures RLS policies protect user data, and checks for common migration pitfalls.

## When to Use

Trigger this skill when:
- Writing a new migration file
- Reviewing a migration before applying to production
- Validating schema changes (adding tables, columns, indexes)
- Checking RLS policy coverage
- Ensuring migration is idempotent (can be safely re-run)

## Validation Workflow

1. **Read the migration file** — Get the SQL to validate

2. **Read canonical schema** — Check `supabase/schema.sql` for context

3. **Run validation checks** — See "Checks Performed" below

4. **Report findings** — Use the output format specified below

5. **Provide fixes** — Suggest specific SQL corrections for any issues found

## Checks Performed

### Critical Security Checks

**RLS (Row-Level Security) - MUST PASS**
- Every table has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- At least one policy per table
- Staff policies use `jwt_is_staff()` for admin/ahli_gizi access
- User policies check `auth.uid() = user_id` for ownership
- No policies grant overly broad access

**Column Naming - MUST FOLLOW CONVENTION**
- Database columns use **Indonesian snake_case** (per AGENTS.md)
- Examples: `nama_makanan`, `waktu_makan`, `jumlah_kalori`, `tinggi_badan`
- NOT: `food_name`, `mealTime`, `calorieCount`

### Schema Consistency Checks

**Table Structure**
- Primary key exists (prefer `uuid` with `gen_random_uuid()`)
- Foreign keys reference valid tables
- `created_at` has `DEFAULT now()`
- `NOT NULL` on required fields
- No `SERIAL` (use UUID instead)

**Indexes**
- Foreign keys have indexes for performance
- Indexes follow naming convention: `<table>_<column>_idx`

### Migration Safety Checks

**Idempotency**
- Uses `IF NOT EXISTS` for CREATE statements
- Uses `IF EXISTS` for DROP statements
- Safe to run multiple times without errors

**Data Safety**
- No dropping tables/columns without explicit confirmation
- `ON DELETE CASCADE` used appropriately for relationships
- No breaking changes to existing columns without migration strategy

## Output Format

Report findings using this structure:

```
## Validation Report for <migration_file>

### Critical Issues
❌ FAIL: <issue description>
   Location: Line <N>
   Issue: <what's wrong and why it matters>
   Fix: <specific SQL correction>

### Warnings
⚠️  WARN: <warning description>
   Location: Line <N>
   Recommendation: <suggested improvement>

### Passed Checks
✅ PASS: RLS enabled on all tables
✅ PASS: Column naming follows Indonesian convention
✅ PASS: All foreign keys indexed

## Summary
- Critical: <N> issues that MUST be fixed
- Warnings: <N> recommendations
- Ready to apply: <yes/no>
```

## Migration Template (Copy This)

Use this template for new migrations:

```sql
-- migration: <brief description>
-- date: YYYY-MM-DD
-- author: <your name>

-- Create table with RLS
create table if not exists public.<table_name> (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Add columns here (Indonesian snake_case)
  nama_kolom text,
  created_at timestamptz default now()
);

-- Enable RLS (REQUIRED)
alter table public.<table_name> enable row level security;

-- Staff policy - admin and ahli_gizi can access all
create policy "<table_name>_staff_select"
  on public.<table_name>
  for select
  to authenticated
  using (jwt_is_staff());

create policy "<table_name>_staff_insert"
  on public.<table_name>
  for insert
  to authenticated
  with check (jwt_is_staff());

create policy "<table_name>_staff_update"
  on public.<table_name>
  for update
  to authenticated
  using (jwt_is_staff())
  with check (jwt_is_staff());

create policy "<table_name>_staff_delete"
  on public.<table_name>
  for delete
  to authenticated
  using (jwt_is_staff());

-- User policy - users can access own records
create policy "<table_name>_user_select"
  on public.<table_name>
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "<table_name>_user_insert"
  on public.<table_name>
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "<table_name>_user_update"
  on public.<table_name>
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "<table_name>_user_delete"
  on public.<table_name>
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Indexes for performance
create index if not exists <table_name>_user_id_idx
  on public.<table_name>(user_id);

-- Add more indexes as needed for query patterns
```

## Helper Functions Reference

**`jwt_is_staff()`**
- Returns `true` if user role is 'admin' or 'ahli_gizi'
- Use for staff-wide access policies
- Located in supabase schema

**`auth.uid()`**
- Returns the authenticated user's UUID
- Use for user-specific ownership checks
- Standard Supabase function

## Common Issues and Fixes

| Issue | Fix |
|-------|-----|
| Missing RLS | Add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` |
| English column names | Rename to Indonesian: `food_name` → `nama_makanan` |
| No primary key | Add `id uuid primary key default gen_random_uuid()` |
| Missing foreign key index | Add `create index ... on <table>(<column>)` |
| Unsafe SELECT * | Change to `SELECT <specific_columns>` |
| Missing user_id | Add `user_id uuid references public.profiles(id)` |

## Files Referenced

- `supabase/schema.sql` — Canonical schema (source of truth)
- `supabase/migrations/*.sql` — Existing migrations for patterns
- `AGENTS.md` — Project conventions section
- `CLAUDE.md` — Quick reference for common mistakes

## Before Applying Migration

After validation passes:
1. Review the summary section
2. Fix all critical issues
3. Consider warnings
4. Test locally: `supabase db push` (if using CLI)
5. Verify with: `supabase db diff`
6. Apply in Supabase SQL Editor for production
7. Test RLS policies with different user roles
