# NutriTrack Technical Specification

## 1) Project Overview

NutriTrack is a role-based nutrition tracking web app for:

- `admin`
- `ahli_gizi` (dietitian)
- `klien` (client/patient)

Primary capabilities:

- authentication and role-based access control
- daily food logging with AI calorie estimation
- anthropometric measurements tracking
- client monitoring and routine evaluations
- simple analytics for popular foods

## 2) Technology Stack

### Frontend

- **Runtime/UI**: React `19.2.4`, React DOM `19.2.4`
- **Router**: React Router DOM `7.13.2`
- **Data fetching/cache**: TanStack React Query `5.95.2`
- **Styling**: Tailwind CSS `4.2.2`, `tailwindcss-animate`
- **UI primitives**: Radix UI components
- **Animation**: Framer Motion `12.38.0`
- **Charts**: Recharts `3.8.1`
- **Date utilities**: date-fns `4.1.0`, react-day-picker `9.14.0`
- **Notifications**: sonner `2.0.7`
- **Excel import**: xlsx `0.18.5`
- **Build tool**: Vite `8.0.1` with `@vitejs/plugin-react`

### Backend / BaaS

- **Auth + DB + RLS + Functions**: Supabase
- **Supabase client**: `@supabase/supabase-js` `2.100.1`
- **Edge Function**: `supabase/functions/estimate-calories/index.ts`
- **AI provider (server-side)**: OpenAI Chat Completions API

## 3) Repository and Code Organization

Top-level:

- `src/` frontend app source
- `supabase/` SQL schema, RLS fixes, Edge Function config/code
- `scripts/` utility script(s)
- `public/`, `dist/` static/build outputs

Inside `src/`:

- `pages/` route-level pages by role/domain
- `components/` reusable UI and domain components
- `hooks/` query/data hooks
- `lib/` utilities and API wrappers (`supabase`, `openai`, formatters)
- `config/` static app config (e.g., ad banners)

## 4) Runtime Architecture

### App bootstrap

- Entry point: `src/main.jsx`
- Providers/wrappers:
  - `StrictMode`
  - `AppErrorBoundary`
  - `BrowserRouter`
  - global `Toaster`

### State and data model at runtime

- Authentication/session/profile state: `AuthProvider` (`src/hooks/useAuth.jsx`)
- Server state and caching: React Query via `QueryClientProvider`
- Route-level code splitting: `React.lazy` + `Suspense` in `src/App.jsx`

### Routing and authorization

`RequireAuth` in `src/App.jsx` enforces:

- session existence
- profile availability
- role allowlist per route

Role dashboards:

- `admin` -> `/admin/dashboard`
- `ahli_gizi` -> `/gizi/dashboard`
- `klien` -> `/klien/dashboard`

Main routes:

- Auth: `/login`
- Admin:
  - `/admin/dashboard`
  - `/admin/users`, `/admin/users/:id`
  - `/admin/food-units`
  - `/admin/clients`, `/admin/clients/:id`
  - `/admin/import`
  - `/admin/food-logs`
- Ahli gizi:
  - `/gizi/dashboard`
  - `/gizi/clients`, `/gizi/clients/:id`
  - `/gizi/food-logs`
- Klien:
  - `/klien/dashboard`
  - `/klien/food-entry`
  - `/klien/progress`

## 5) Data Access Layer

### Supabase initialization

File: `src/lib/supabase.js`

- Reads:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Validates placeholder/URL before creating the client.
- Exposes:
  - `supabase`
  - `isSupabaseConfigured()`

### Query hooks

Core hooks in `src/hooks/`:

- `useAuth.jsx`: session/profile lifecycle and sign-out behavior
- `useFoodLog.js`:
  - logs by user/date range/recent days
  - food units
  - food name suggestions (view)
  - today’s occupied meal slots
  - food log items by log IDs
- `useMeasurement.js`: body measurements per user
- `useUserEvaluations.js`: routine evaluations per user
- `usePopularFoodTrend.js`: aggregated popular-food chart data

## 6) Database Specification (Supabase SQL)

Primary schema source: `supabase/schema.sql`

### Tables defined in schema file

1. `profiles`

- PK: `id` (UUID, references `auth.users`)
- fields: `nama`, `email`, `nomor_wa`, `instalasi`, `role`, `is_active`, `created_at`
- role constraint: `admin | ahli_gizi | klien`

2. `body_measurements`

- PK: `id` UUID
- FK: `user_id -> profiles.id`
- unique: `(user_id, tanggal)`
- fields: anthropometry (`berat_badan`, `tinggi_badan`, `massa_otot`, `massa_lemak`, `bmi`), `catatan`, audit fields

3. `food_units`

- PK: `id`
- unique: `nama`
- seeded defaults: centong, sendok teh, sendok makan, potong, gelas, buah, lembar, bungkus

4. `food_logs`

- PK: `id`
- FK: `user_id -> profiles.id`
- unique: `(user_id, tanggal, waktu_makan)`
- `waktu_makan`: `pagi | siang | malam | snack`
- fields: `total_kalori`, `status`, timestamps

5. `food_log_items`

- PK: `id`
- FK: `food_log_id -> food_logs.id`
- FK: `unit_id -> food_units.id`
- fields: `nama_makanan`, `jumlah`, `unit_nama`, `kalori_estimasi`

### Views and functions

- View: `food_name_suggestions` (frequency of `nama_makanan`)
- Trigger function: `handle_new_user()` to auto-populate `profiles` from auth metadata
- Helper function: `jwt_is_staff()` for secure role checks in RLS
- Helper function: `food_log_owned_by_me(uuid)` for ownership check in item policies

### RLS model

RLS is enabled on:

- `profiles`
- `body_measurements`
- `food_logs`
- `food_log_items`
- `food_units`

Policy intent:

- clients can read/update own profile and own domain data
- staff (`admin`/`ahli_gizi`) can operate with broader access where required
- authenticated users can read food units

### Important schema note

Application code uses `user_evaluations` (read/write in hooks/pages), but this table is **not present** in `supabase/schema.sql`.  
This implies one of the following:

- table created manually outside versioned schema, or
- schema file is outdated/incomplete

For reproducible environments, add/version the SQL migration for `user_evaluations`.

## 7) AI Estimation Service Specification

### Invocation path

Client UI -> `src/lib/openai.js` -> Supabase Function `estimate-calories` -> OpenAI API

### Client wrapper (`src/lib/openai.js`)

- refreshes session token before invocation
- sends explicit bearer token in function invoke headers
- normalizes Supabase Function errors (`FunctionsFetchError`, `FunctionsHttpError`, `FunctionsRelayError`)
- expects JSON array response

### Edge Function (`supabase/functions/estimate-calories/index.ts`)

- method: `POST` (with CORS + `OPTIONS`)
- auth gate:
  - validates bearer token
  - fetches authenticated user via Supabase Auth
  - ensures profile role is active `klien`
- payload validation:
  - `items` must be array, max `40`
  - each item requires `nama_makanan`, `jumlah > 0`, `unit_nama`
- OpenAI call:
  - endpoint: `https://api.openai.com/v1/chat/completions`
  - model: `OPENAI_MODEL` (default `gpt-4o-mini`)
- response contract: strict JSON array `[ { nama_makanan, kalori }, ... ]`

### Function config

In `supabase/config.toml`:

- `[functions.estimate-calories]`
- `verify_jwt = false`

The function still performs explicit token/user verification internally.

## 8) Environment Configuration

Template: `.env.example`

Required frontend vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional dev var:

- `DEV_HMR_HOST` (LAN IP override for Vite HMR from mobile devices)

Server-side secrets (Supabase):

- `OPENAI_API_KEY`
- optional `OPENAI_MODEL`

Security rule:

- do **not** expose OpenAI secrets via `VITE_*` variables.

## 9) Build, Run, and Deployment

### NPM scripts

- `npm run dev` -> Vite dev server (`--host`)
- `npm run build` -> production build
- `npm run preview` -> local preview
- `npm run lint` -> ESLint

### Vite/server behavior

From `vite.config.js`:

- host: `0.0.0.0`
- port: `5173` with `strictPort: true`
- LAN-aware HMR host detection (or `DEV_HMR_HOST` override)
- alias: `@` -> `src`

### SPA deployment behavior

`vercel.json` rewrites all paths to `index.html`, enabling client-side routing.

### Supabase operational commands (documented in code comments)

- deploy function: `supabase functions deploy estimate-calories`
- set secrets:
  - `supabase secrets set OPENAI_API_KEY=<YOUR_API_KEY>`
  - `supabase secrets set OPENAI_MODEL=gpt-4o-mini`
- local function serve:
  - `supabase functions serve estimate-calories --env-file supabase/.env.local`

## 10) Linting and Code Quality

- ESLint flat config in `eslint.config.js`
- includes:
  - `@eslint/js` recommended
  - `react-hooks` recommended
  - `react-refresh` vite rules
- ignores `dist` and `reference/**`

Current repository observations:

- no dedicated test framework/scripts configured in `package.json`
- no CI config visible in scanned root files

## 11) Key Domain Flows

### A) Client food entry

1. Select meal slot (`pagi|siang|malam|snack`)
2. Enter one or more food rows (name, quantity, unit)
3. Request AI estimation
4. Persist:
   - `food_logs` (daily slot aggregate)
   - `food_log_items` (line items with estimated calories)
5. Invalidate/reload relevant React Query caches

### B) Staff anthropometry update

1. Open client detail
2. Submit measurement form
3. Upsert into `body_measurements` on `(user_id, tanggal)`
4. Recompute and display trend chart/history

### C) Routine evaluation

1. Staff filters client + date range in monitoring page
2. Submits evaluation payload
3. Data stored in `user_evaluations`
4. Client sees evaluations in progress page

## 12) Known Technical Gaps / Risks

- `user_evaluations` schema is not versioned in `supabase/schema.sql`.
- no automated test suite configured (unit/integration/e2e).
- helper script `scripts/push-with-token.sh` performs force push; use with caution and proper branch policy.

## 13) Suggested Next Technical Improvements

1. Add versioned SQL migration(s) for `user_evaluations` and any missing objects.
2. Add automated tests for:
   - auth/role routing guards
   - food entry validation and persistence flow
   - monitoring/evaluation forms
3. Introduce CI pipeline for lint + build + tests.
4. Add typed schemas (TypeScript or generated Supabase types) to reduce runtime query mismatch risk.

