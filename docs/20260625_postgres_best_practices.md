# Postgres Best Practices — Schema Audit

**Date:** 2026-06-25
**Scope:** `supabase/schema.sql` + remote project `noiagcwxlqwvpdvbvmqw`
**Status:** planned

Applied full schema via `execute_sql` (9 chunks). Ran security advisors, then audited against Supabase Postgres best practices skill. Three categories of findings below.

---

## 1. Missing FK Indexes

Postgres does not auto-index FK columns. Unindexed FKs cause full table scans on JOINs and ON DELETE CASCADE.

Found via:

```sql
select conrelid::regclass, a.attname
from pg_constraint c
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
where c.contype = 'f'
  and not exists (
    select 1 from pg_index i
    where i.indrelid = c.conrelid and a.attnum = any(i.indkey)
  );
```

### High impact

| Table | Column | FK → | Why it matters |
|---|---|---|---|
| `food_log_items` | `food_log_id` | `food_logs(id) ON DELETE CASCADE` | RLS policy calls `food_log_owned_by_me(food_log_id)` per row; cascade deletes scan this column |

### Medium impact

| Table | Column | FK → | Why it matters |
|---|---|---|---|
| `food_log_items` | `unit_id` | `food_units(id)` | JOINs on unit lookups |
| `meal_template_items` | `unit_id` | `food_units(id)` | Same pattern |
| `food_log_deletions` | `user_id` | `profiles(id) ON DELETE CASCADE` | Cascade delete scans |

### Low impact (audit/deletion tracking — small tables)

| Table | Column | FK → |
|---|---|---|
| `food_units` | `created_by` | `profiles(id)` |
| `body_measurements` | `created_by` | `profiles(id)` |
| `assessments` | `created_by` | `profiles(id)` |
| `user_evaluations` | `created_by` | `profiles(id)` |
| `anthropometric_change_log` | `changed_by` | `profiles(id)` |

### Fix (idempotent)

```sql
create index if not exists food_log_items_food_log_id_idx
  on public.food_log_items (food_log_id);
create index if not exists food_log_items_unit_id_idx
  on public.food_log_items (unit_id);
create index if not exists meal_template_items_unit_id_idx
  on public.meal_template_items (unit_id);
create index if not exists food_log_deletions_user_id_idx
  on public.food_log_deletions (user_id);
create index if not exists food_units_created_by_idx
  on public.food_units (created_by);
create index if not exists body_measurements_created_by_idx
  on public.body_measurements (created_by);
create index if not exists assessments_created_by_idx
  on public.assessments (created_by);
create index if not exists user_evaluations_created_by_idx
  on public.user_evaluations (created_by);
create index if not exists anthropometric_change_log_changed_by_idx
  on public.anthropometric_change_log (changed_by);
```

Mirror into `supabase/schema.sql` after the existing indexes section (~line 167).

---

## 2. RLS Performance: `auth.uid()` not cached

Per `security-rls-performance.md` — bare `auth.uid()` is re-evaluated per row. Wrap in `(select auth.uid())` so Postgres evaluates once and caches.

### Policies to fix

| Policy | Table | Current | Fixed |
|---|---|---|---|
| `profiles_self` | `profiles` | `using (auth.uid() = id)` | `using ((select auth.uid()) = id)` |
| `profiles_self_update` | `profiles` | `using (auth.uid() = id)` + `with check (auth.uid() = id)` | Same wrap |
| `measurements_klien_read` | `body_measurements` | `using (auth.uid() = user_id)` | Same wrap |
| `foodlogs_klien` | `food_logs` | `using (auth.uid() = user_id)` | Same wrap |
| `meal_templates_klien` | `meal_templates` | `using (auth.uid() = user_id)` | Same wrap |
| `deletions_klien_insert` | `food_log_deletions` | `with check (auth.uid() = user_id)` | Same wrap |
| `assessments_klien_select` | `assessments` | `using (auth.uid() = user_id)` | Same wrap |
| `user_evaluations_klien_select` | `user_evaluations` | `using (auth.uid() = user_id)` | Same wrap |
| `anthropometric_change_log_klien_select` | `anthropometric_change_log` | `using (auth.uid() = user_id)` | Same wrap |
| `profiles_self_update` subqueries | `profiles` | `where p.id = auth.uid()` (×2) | `where p.id = (select auth.uid())` (×2) |

**Not affected** — policies using `public.jwt_is_staff()`, `public.food_log_owned_by_me()`, `public.meal_template_owned_by_me()` already cache `auth.uid()` inside their function bodies via `(select auth.uid())`.

### Fix

Drop and recreate each affected policy with the wrapped syntax in `supabase/schema.sql`. Same `drop policy if exists` + `create policy` pattern.

---

## 3. `auth.role()` deprecation in `food_units_read`

Supabase has deprecated `auth.role()` in favour of the `TO` clause on policies. Current:

```sql
create policy "food_units_read" on public.food_units
  for select using (auth.role() = 'authenticated');
```

### Fix

```sql
create policy "food_units_read" on public.food_units
  for select to authenticated using (true);
```

The `TO authenticated` clause already restricts to signed-in users, so the `USING` expression can be `true`. No change in semantics — `auth.role() = 'authenticated'` was just a runtime check for the same thing.

---

## Execution Order

1. **FK indexes** — highest impact, low risk, no app changes needed
2. **`auth.uid()` caching** — medium impact on large tables, no app changes needed
3. **`auth.role()` → `TO` clause** — low urgency, removes deprecation warning

All three are schema-only changes. Apply via `execute_sql` on remote, then mirror into `supabase/schema.sql`.

## References

- [schema-foreign-key-indexes](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [security-rls-performance](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations)
- [Supabase RLS TO clause](https://supabase.com/docs/guides/database/postgres/row-level-security#the-to-clause)
