# LAPER — Entity Relationship Diagram
*Database schema for Laporan Asupan dan Evaluasi Rutin*

---

## Tech Stack
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth (`auth.users`)
- **Access Control:** Row Level Security (RLS) per table
- **Pattern:** Append-only logs for assessment, evaluation, food log, and change log

---

## Tables Overview

| Table | Description |
|-------|-------------|
| `profiles` | Extended user data linked to Supabase auth |
| `food_logs` | Immutable food entries per user per session |
| `food_log_sessions` | Groups food_logs into a single submission event |
| `exercise_logs` | Physical activity entries per user |
| `assessment_sessions` | Append-only anthropometric data per evaluation visit |
| `evaluation_sessions` | Append-only nutritionist evaluation notes per visit |
| `profile_change_logs` | Audit trail for all admin/ahli gizi edits to profile data |
| `notifications` | In-app notifications per user |
| `ad_banners` | Advertisement carousel images for dashboard |

---

## Table Definitions

---

### `profiles`
Extended profile data for all users. Linked 1:1 to `auth.users`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, FK → `auth.users.id` | Matches Supabase auth user ID |
| `full_name` | `text` | NOT NULL | User's full name |
| `date_of_birth` | `date` | NOT NULL | Used for Harris-Benedict age calculation |
| `gender` | `text` | NOT NULL, CHECK (`male`,`female`) | Used for Harris-Benedict formula |
| `whatsapp_number` | `text` | NOT NULL | Used for WhatsApp share link |
| `role` | `text` | NOT NULL, CHECK (`user`,`ahli_gizi`,`admin`) | Access role |
| `approval_status` | `text` | NOT NULL, DEFAULT `pending`, CHECK (`pending`,`approved`,`rejected`) | Admin approval state |
| `approved_by` | `uuid` | FK → `profiles.id`, NULLABLE | Admin who approved |
| `approved_at` | `timestamptz` | NULLABLE | Timestamp of approval |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Registration timestamp |

**Indexes:** `role`, `approval_status`

---

### `food_log_sessions`
Groups multiple food items submitted in one entry event.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Session ID |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | Owner |
| `submitted_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Submission timestamp |
| `total_calories` | `numeric(7,2)` | NOT NULL | Sum of all items' calories in session |
| `total_protein` | `numeric(6,2)` | NOT NULL | Sum of all items' protein |
| `total_carbs` | `numeric(6,2)` | NOT NULL | Sum of all items' carbs |
| `total_fat` | `numeric(6,2)` | NOT NULL | Sum of all items' fat |

**Indexes:** `user_id`, `submitted_at`

---

### `food_logs`
Immutable individual food entries. One row per food item per session.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Entry ID |
| `session_id` | `uuid` | NOT NULL, FK → `food_log_sessions.id` | Parent session |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | Owner (denormalized for query convenience) |
| `food_name` | `text` | NOT NULL | Food name as returned by AI |
| `meal_category` | `text` | NOT NULL, CHECK (`sarapan`,`makan_siang`,`makan_malam`,`snack`) | Meal time category |
| `calories` | `numeric(7,2)` | NOT NULL | Calories from AI result |
| `protein` | `numeric(6,2)` | NOT NULL | Protein (g) from AI result |
| `carbs` | `numeric(6,2)` | NOT NULL | Carbohydrates (g) from AI result |
| `fat` | `numeric(6,2)` | NOT NULL | Fat (g) from AI result |
| `logged_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Entry timestamp |
| `is_favorite` | `boolean` | NOT NULL, DEFAULT `false` | Marked as favorite by user |

> **Constraint:** No UPDATE or DELETE permitted on this table for any role. Enforced via RLS.

**Indexes:** `user_id`, `logged_at`, `meal_category`, `food_name` (for trending query)

---

### `exercise_logs`
Physical activity entries per user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Entry ID |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | Owner |
| `exercise_type` | `text` | NOT NULL | Name/type of exercise |
| `duration_minutes` | `integer` | NOT NULL, CHECK > 0 | Duration in minutes |
| `logged_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Entry timestamp |

**Indexes:** `user_id`, `logged_at`

---

### `assessment_sessions`
Append-only anthropometric measurements per evaluation visit. One row per visit.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Session ID |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | Participant |
| `assessed_by` | `uuid` | NOT NULL, FK → `profiles.id` | Ahli gizi who performed the assessment |
| `weight_kg` | `numeric(5,2)` | NOT NULL | Body weight (BB) in kg |
| `height_cm` | `numeric(5,2)` | NOT NULL | Height (TB) in cm |
| `bmi` | `numeric(5,2)` | NOT NULL | Auto-calculated: weight_kg / (height_m²) |
| `waist_circumference_cm` | `numeric(5,2)` | NULLABLE | Lingkar perut in cm |
| `muscle_mass_kg` | `numeric(5,2)` | NULLABLE | Massa otot in kg |
| `fat_mass_kg` | `numeric(5,2)` | NULLABLE | Massa lemak in kg |
| `activity_level` | `text` | NOT NULL, CHECK (`sedentary`,`lightly_active`,`moderately_active`,`very_active`) | PAL for Harris-Benedict |
| `daily_calorie_needs` | `numeric(7,2)` | NOT NULL | Auto-calculated via Harris-Benedict |
| `assessed_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Assessment timestamp |

> **Harris-Benedict Formula:**
> - Male: BMR = 88.362 + (13.397 × weight_kg) + (4.799 × height_cm) − (5.677 × age)
> - Female: BMR = 447.593 + (9.247 × weight_kg) + (3.098 × height_cm) − (4.330 × age)
> - TDEE = BMR × activity_multiplier (sedentary: 1.2 / lightly: 1.375 / moderately: 1.55 / very: 1.725)

> **Constraint:** No UPDATE or DELETE permitted. Enforced via RLS.

**Indexes:** `user_id`, `assessed_at`

---

### `evaluation_sessions`
Append-only nutritionist evaluation notes. Linked 1:1 to an assessment session.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Evaluation ID |
| `assessment_session_id` | `uuid` | NOT NULL, UNIQUE, FK → `assessment_sessions.id` | Linked assessment (1:1) |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | Participant |
| `evaluated_by` | `uuid` | NOT NULL, FK → `profiles.id` | Ahli gizi author |
| `evaluation_notes` | `text` | NOT NULL | Nutritionist's written evaluation |
| `evaluated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Evaluation timestamp |
| `pdf_generated` | `boolean` | NOT NULL, DEFAULT `false` | Whether PDF has been generated client-side |

> **Constraint:** New evaluation session blocked if fewer than 14 days have passed since last `evaluated_at` for the same `user_id`. Enforced at application level before INSERT.

> **Constraint:** No UPDATE or DELETE permitted. Enforced via RLS.

**Indexes:** `user_id`, `evaluated_at`, `assessment_session_id`

---

### `profile_change_logs`
Audit trail for every admin or ahli gizi edit to a user's profile or assessment data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Log entry ID |
| `target_user_id` | `uuid` | NOT NULL, FK → `profiles.id` | User whose data was changed |
| `changed_by` | `uuid` | NOT NULL, FK → `profiles.id` | Admin or ahli gizi who made the change |
| `table_name` | `text` | NOT NULL | Table where the change occurred (e.g. `profiles`, `assessment_sessions`) |
| `field_name` | `text` | NOT NULL | Column that was changed |
| `old_value` | `text` | NULLABLE | Previous value (cast to text) |
| `new_value` | `text` | NOT NULL | New value (cast to text) |
| `changed_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Timestamp of change |

> **Constraint:** INSERT only. No UPDATE or DELETE permitted for any role.

**Indexes:** `target_user_id`, `changed_at`, `changed_by`

---

### `notifications`
In-app notifications per user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Notification ID |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | Recipient |
| `type` | `text` | NOT NULL, CHECK (`meal_reminder`,`evaluation_overdue`) | Notification category |
| `message` | `text` | NOT NULL | Notification body text |
| `is_read` | `boolean` | NOT NULL, DEFAULT `false` | Read state |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Creation timestamp |

**Indexes:** `user_id`, `is_read`, `created_at`

---

### `ad_banners`
Advertisement images for dashboard carousel.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Banner ID |
| `image_url` | `text` | NOT NULL | Public URL to PNG image (600×300px) |
| `display_order` | `integer` | NOT NULL, CHECK 1–3 | Position in carousel (1, 2, 3) |
| `is_active` | `boolean` | NOT NULL, DEFAULT `true` | Toggle visibility |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Upload timestamp |

---

## Relationships

```
auth.users
    └── profiles (1:1)
            ├── food_log_sessions (1:many)
            │       └── food_logs (1:many)
            ├── exercise_logs (1:many)
            ├── assessment_sessions (1:many) [as participant]
            │       └── evaluation_sessions (1:1)
            ├── assessment_sessions (1:many) [as assessed_by]
            ├── evaluation_sessions (1:many) [as evaluated_by]
            ├── profile_change_logs (1:many) [as target_user_id]
            ├── profile_change_logs (1:many) [as changed_by]
            └── notifications (1:many)
```

---

## Key Business Rules (enforced at app level)

| Rule | Where Enforced |
|------|---------------|
| New evaluation blocked if < 14 days since last | Application layer before INSERT to `evaluation_sessions` |
| BMI auto-calculated from weight + height | Application layer before INSERT to `assessment_sessions` |
| Harris-Benedict TDEE auto-calculated | Application layer before INSERT to `assessment_sessions` |
| Food log entries cannot be edited or deleted | RLS: no UPDATE/DELETE on `food_logs` for any role |
| Assessment and evaluation logs cannot be edited or deleted | RLS: no UPDATE/DELETE on `assessment_sessions`, `evaluation_sessions` |
| User cannot edit own profile | RLS: no UPDATE on `profiles` where `auth.uid() = id` for role `user` |
| Only admin can delete users | RLS + Supabase Auth admin API |
| `daily_calorie_needs` in `profiles` dashboard display always reads from latest `assessment_sessions` record | Application query: `ORDER BY assessed_at DESC LIMIT 1` |

---

## Trending Food Query Reference

```sql
-- Most frequently logged foods across all users within a timeframe
SELECT food_name, COUNT(*) as log_count
FROM food_logs
WHERE logged_at >= :start_date AND logged_at <= :end_date
GROUP BY food_name
ORDER BY log_count DESC
LIMIT 10;
```
