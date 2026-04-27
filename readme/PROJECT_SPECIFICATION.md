# NutriTrack — Project specification

This document is the **single reference** for product-facing features and technical architecture. The npm package name is `laper`; the deployed product is branded **PER** (*Laporan Asupan & Evaluasi Rutin*) — see `src/lib/appMeta.js` and `index.html`.

---

## 1. Product overview

NutriTrack is a **role-based nutrition tracking** web application for Indonesian clinical / institutional workflows. It connects **clients** (`klien`) with **dietitians** (`ahli_gizi`) and **administrators** (`admin`).

Core value:

- Structured **daily food logging** with **AI-assisted calorie estimation** (server-side OpenAI).
- **Anthropometry** history and charts.
- **Routine evaluations** authored by staff and shown to clients.
- **Harris–Benedict–style energy assessments** captured via a staff “data entry” flow and surfaced on the client dashboard.
- **Operational tooling** for admins: user lifecycle, bulk Excel import of clients, and master data for portion units.

Primary language of the UI: **Indonesian** (`html lang="id"`).

---

## 2. Roles and access control

| Role        | Code          | Typical use                          |
|------------|---------------|--------------------------------------|
| Admin      | `admin`       | Users, import, units, full oversight |
| Dietitian  | `ahli_gizi`   | Client lists, logs, measurements   |
| Client     | `klien`       | Own logs, progress, dashboard      |

**Route guard:** `RequireAuth` in `src/App.jsx` requires a Supabase session, a loaded `profiles` row, and membership in an explicit role allowlist per route. Wrong role → redirect to that user’s dashboard path.

**Account status:** If `profiles.is_active` is false, the auth layer signs the user out and blocks access (see `useAuth`).

---

## 3. Feature catalog

### 3.1 Shared

- **Email & password login** via Supabase Auth.
- **Role-based routing**; deep links respect role.
- **Active account enforcement** (`is_active`).
- **Global UX:** `AppShell` layout, loading skeletons, `AppErrorBoundary`, toasts (`sonner`), calorie disclaimer where estimates are shown.

### 3.2 Client (`klien`)

- **Dashboard** (`/klien/dashboard`)
  - Nutrition & energy summary card (profile BB/TB, BMI category Asia–Pacific, latest **assessment** / Harris–Benedict energy).
  - **30-day daily calorie chart** (Recharts) tied to food logs and latest assessment context where applicable.
  - **Food log table** (recent days, paginated/embedded mode) with grouped-by-date presentation.
- **Food entry** (`/klien/food-entry`)
  - Meal slots: `pagi` | `siang` | `malam` | `snack`.
  - **One entry per slot per day** enforced in the UI using “occupied slots” from existing logs.
  - Multi-line items: food name, quantity, unit (from `food_units`).
  - **Autocomplete** for food names from view `food_name_suggestions`.
  - **“Analyze & save”** invokes the Supabase Edge Function `estimate-calories` (OpenAI) and persists `food_logs` + `food_log_items`.
  - Post-save receipt-style summary (estimated calories).
- **My progress** (`/klien/progress`)
  - Measurement charts (weight, BMI, muscle mass, fat mass) with period filters.
  - Measurement history table.
  - **Routine evaluations** visible for the client (from `user_evaluations`).

### 3.3 Admin (`admin`)

- **Dashboard** (`/admin/dashboard`): **popular foods trend** (daily / weekly / monthly) from aggregated log data.
- **User management** (`/admin/users`, `/admin/users/:id`): list, search, pagination, create users (any role), optional generated temporary password (shown once).
- **Excel import** (`/admin/import`): `.xlsx` / `.xls` parse & preview, bulk client creation via Auth, downloadable CSV result report.
- **Food units master** (`/admin/food-units`): CRUD; delete blocked if referenced.
- **Client directory** (`/admin/clients`) and **client detail** (`/admin/clients/:id`): anthropometry tab (form, auto BMI, chart, history), food log tab.
- **Food log monitoring** (`/admin/food-logs`): filter by client + date range; **routine evaluation** form (stored in `user_evaluations` with date range + lifestyle fields).
- **Staff data entry** (nutrition assessment workflow)
  - Picker: `/admin/data-entry`
  - Per-client: `/admin/clients/:id/data-entry`
  - Large numeric keypad UI; persists **`assessments`** (activity factor, stress factor, total energy) and updates profile anthropometrics as implemented in `ClientUserDataEntry.jsx`.

### 3.4 Dietitian (`ahli_gizi`)

- **Dashboard** (`/gizi/dashboard`): popular foods trend + shortcuts to clients and food-log monitoring.
- **Client list & detail** (`/gizi/clients`, `/gizi/clients/:id`): same anthropometry and food-log capabilities as admin for assigned client workflows.
- **Food log monitoring** (`/gizi/food-logs`): same monitoring + routine evaluations as admin.
- **Staff data entry:** `/gizi/data-entry` and `/gizi/clients/:id/data-entry`.

### 3.5 Cross-cutting UI components

- **`FoodLogTable`:** grouping by date, subtotals per meal slot and per day, detail modal, pagination.
- **Dashboard extras:** optional ad carousel (`src/config/adBanners.js`), motion via Framer Motion where used.

---

## 4. Technical stack

### 4.1 Frontend (from `package.json`)

| Area            | Technology                                      |
|-----------------|-------------------------------------------------|
| UI              | React 19, React DOM 19                          |
| Router          | React Router DOM 7                              |
| Server state    | TanStack React Query 5                          |
| Styling         | Tailwind CSS 4, `tailwindcss-animate`           |
| Primitives      | Radix UI (`@radix-ui/react-*`)                  |
| Charts          | Recharts 3                                      |
| Dates           | date-fns 4, react-day-picker 9                  |
| Motion          | Framer Motion 12                                |
| Notifications   | Sonner                                          |
| Excel           | SheetJS (`xlsx`)                                |
| Build           | Vite 8, `@vitejs/plugin-react`, `@tailwindcss/vite` |
| Lint            | ESLint 9 flat config                            |

Path alias: `@` → `src/` (`vite.config.js`).

### 4.2 Backend / platform

- **Supabase:** Auth, Postgres, Row Level Security (RLS), Edge Functions.
- **Client:** `@supabase/supabase-js` 2.x (`src/lib/supabase.js`).
- **Edge Function:** `supabase/functions/estimate-calories` (TypeScript) — OpenAI Chat Completions, **no** OpenAI keys in the browser.

### 4.3 Deployment

- **`vercel.json`:** SPA rewrite `/*` → `/index.html` for client-side routing.

---

## 5. Repository layout

| Path | Purpose |
|------|---------|
| `src/pages/` | Route-level screens by domain (admin, ahli-gizi, klien, staff, auth) |
| `src/components/` | Reusable UI and domain components |
| `src/hooks/` | Auth, React Query data hooks |
| `src/lib/` | Supabase client, OpenAI invoke wrapper, BMI, formatting, WhatsApp helpers, etc. |
| `src/config/` | Static config (e.g. ad banners) |
| `supabase/schema.sql` | Canonical SQL for core tables, views, triggers, RLS |
| `supabase/migration_user_evaluations.sql` | Standalone migration helper for evaluations |
| `supabase/functions/` | Edge Function source |
| `public/` | Static assets |
| `scripts/` | Operational scripts (use with care) |

---

## 6. Application architecture

### 6.1 Bootstrap

- **`src/main.jsx`:** `StrictMode`, `AppErrorBoundary`, `BrowserRouter`, root `App`, global `Toaster`.
- **`src/App.jsx`:** `QueryClientProvider` (default `staleTime` 60s, `retry: 1`), `AuthProvider`, lazy-loaded routes inside `Suspense`.

### 6.2 Data layer

- **Supabase** is the system of record; React Query caches reads and coordinates invalidation after mutations.
- **AI calorie path:** UI → `src/lib/openai.js` → `supabase.functions.invoke('estimate-calories', …)` → OpenAI → JSON array of per-item calories.

### 6.3 Edge function (`estimate-calories`)

- **CORS:** `POST` + `OPTIONS`.
- **Auth:** Bearer JWT validated; user must exist and have role **`klien`** (and active use as implemented in the function).
- **Payload:** `items[]` (max 40), each with `nama_makanan`, `jumlah` &gt; 0, `unit_nama`.
- **Response:** JSON array `{ nama_makanan, kalori }[]`.
- **Config:** `supabase/config.toml` may set `verify_jwt = false` for the function; **authorization is still enforced inside the function** (do not treat as public).

---

## 7. Routing reference

| Path | Roles | Page |
|------|-------|------|
| `/login` | public | Login |
| `/` | authed | Redirect to role dashboard |
| `/admin/dashboard` | admin | Admin dashboard |
| `/admin/users` | admin | User list |
| `/admin/users/:id` | admin | User detail |
| `/admin/food-units` | admin | Food units CRUD |
| `/admin/clients` | admin | Client directory |
| `/admin/clients/:id` | admin | Client detail |
| `/admin/clients/:id/data-entry` | admin | Staff nutrition data entry |
| `/admin/data-entry` | admin | Data entry client picker |
| `/admin/import` | admin | Excel import |
| `/admin/food-logs` | admin | Food log monitor + evaluations |
| `/gizi/dashboard` | ahli_gizi | Gizi dashboard |
| `/gizi/clients` | ahli_gizi | Client list |
| `/gizi/clients/:id` | ahli_gizi | Client detail |
| `/gizi/clients/:id/data-entry` | ahli_gizi | Staff data entry |
| `/gizi/data-entry` | ahli_gizi | Data entry picker |
| `/gizi/food-logs` | ahli_gizi | Food log monitor |
| `/klien/dashboard` | klien | Client dashboard |
| `/klien/food-entry` | klien | Food entry |
| `/klien/progress` | klien | Progress + evaluations |

Unknown paths → redirect `/`.

---

## 8. Database model (Postgres / Supabase)

Authoritative SQL: **`supabase/schema.sql`**. Highlights:

### 8.1 `profiles`

- **PK:** `id` → `auth.users.id`
- **Core:** `nama`, `email`, `nomor_wa`, `instalasi`, `role` (`admin` \| `ahli_gizi` \| `klien`), `is_active`, `created_at`
- **Extended demographics / anthropometry on profile:** `berat_badan`, `tinggi_badan`, `tgl_lahir`, `jenis_kelamin`, `phone_whatsapp` (used for summaries and Harris–Benedict-style flows)

### 8.2 `body_measurements`

- Per-user dated rows; **unique** `(user_id, tanggal)`; optional `created_by` audit.

### 8.3 `food_units`

- Master list of portion units; `nama` unique; seeded defaults (centong, sendok, etc.).

### 8.4 `food_logs` / `food_log_items`

- Logs per user per calendar day and meal slot; line items store `nama_makanan`, `jumlah`, `unit_id` / `unit_nama`, `kalori_estimasi`.
- Indexes support user + date queries.

### 8.5 `assessments`

- Staff-authored nutrition assessments: `faktor_aktivitas`, `faktor_stres`, `energi_total`, `created_by`, timestamps.
- Consumed on the client dashboard for “kebutuhan energi” and related UI.

### 8.6 `user_evaluations`

- Routine monitoring evaluations: `date_from`, `date_to`, `exercise_freq`, `sleep_enough`, `veg_times_per_day`, `usage_notes`, `bmi`, `created_by`, timestamps.
- RLS: clients **select** own; staff **full** access (see policies in schema).

### 8.7 `food_name_suggestions` (view)

- Aggregates `food_log_items` for autocomplete ranking.

### 8.8 RLS and helpers

- RLS enabled on sensitive tables; helper functions such as `jwt_is_staff()` and `food_log_owned_by_me(uuid)` support policies.
- **Trigger:** `handle_new_user()` provisions `profiles` from auth metadata on signup.

---

## 9. Environment variables

Documented in **`.env.example`**.

| Variable | Where | Purpose |
|----------|--------|---------|
| `VITE_SUPABASE_URL` | Browser | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser | Supabase anon key |
| `DEV_HMR_HOST` | Vite only (not `VITE_*`) | Optional LAN IP for HMR when testing on a phone |
| `OPENAI_API_KEY` | Supabase secrets / local env for functions | OpenAI API key |
| `OPENAI_MODEL` | Supabase secrets (optional) | Model id (e.g. `gpt-4o-mini`) |

**Security:** Never prefix OpenAI credentials with `VITE_`.

Local function development (from `.env.example`):

```bash
supabase functions serve estimate-calories --env-file supabase/.env.local
```

---

## 10. Local development and build

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with `--host` (see `package.json`) |
| `npm run build` | Production bundle |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

**Vite dev server** (`vite.config.js`): `host: '0.0.0.0'`, **`port: 5174`**, `strictPort: true`, optional `hmr.host` from `DEV_HMR_HOST` or first LAN IPv4.

---

## 11. Domain flows (technical)

1. **Client logs a meal:** pick slot → add rows → invoke AI function → insert/update `food_logs` and `food_log_items` → invalidate queries.
2. **Staff records anthropometry:** client detail or measurement flow → upsert `body_measurements` on `(user_id, tanggal)` → refresh charts.
3. **Staff routine evaluation:** monitoring page → insert/update `user_evaluations` for `(user_id, date_from, date_to, …)` → visible on client progress.
4. **Staff energy assessment:** data-entry page → numeric factors + profile fields → insert `assessments` (and profile updates as coded) → client dashboard reads latest assessment.

---

## 12. Testing, CI, and quality

- **No automated test runner** is configured in `package.json` today (no Jest/Vitest/Playwright scripts).
- **No CI configuration** was assumed in the repository root for this spec; add pipeline steps for `lint` + `build` (+ tests) when introduced.

---

## 13. Related documents

All documentation files live in the **`readme/`** folder. See **[README.md](README.md)** for the index.

- **`TECH_SPEC.md`** — earlier technical write-up (partial overlap; this file supersedes for routing/schema currency).
- **`FEATURES.md`** — Indonesian feature list for stakeholders.

---

## 14. Maintenance notes

- Keep **`supabase/schema.sql`** in sync with production migrations when schema changes.
- When adding tables or policies, update RLS and this document together.
- Prefer **generated Supabase types** or shared Zod/TS types in the future to reduce client–schema drift.
