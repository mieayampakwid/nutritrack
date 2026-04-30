# AGENTS.md — NutriTrack / LAPER

Coding conventions and project context for AI coding agents (Cursor, Copilot, etc.).

---

## 1. Project Overview

NutriTrack (LAPER) is a web-based nutritional tracking platform for Indonesian dietitians (ahli gizi) and their clients (klien). It provides food logging, anthropometric tracking, calorie estimation via AI, and progress monitoring.

## 2. Tech Stack

- **Language:** JavaScript/JSX (React 19.2.4, Vite 8.0.1)
- **TypeScript:** Only in `supabase/functions/` (Deno edge functions) — do not introduce TS into `src/`
- **Styling:** Tailwind CSS 4.2.2 (theme tokens in `src/index.css` via `@theme {}`, no tailwind.config)
- **State management:** TanStack React Query 5.95.2
- **Routing:** React Router DOM 7.13.2
- **Backend/DB:** Supabase 2.100.1 (auth, Postgres, RLS, Edge Functions, Storage)
- **UI primitives:** Radix UI (shadcn pattern), CVA for variants, `sonner` for toasts
- **Testing:** Vitest 4.1.5 + @testing-library/react + @testing-library/jest-dom

## 3. Architecture

```
src/pages/{admin,ahli-gizi,klien,staff,auth}/   # Route-level pages by role
src/components/shared/                           # Cross-role UI (disclaimer, spinner, error boundary)
src/components/ui/                               # Primitive components (shadcn pattern)
src/components/food/                             # Food-related shared components
src/hooks/                                       # React Query hooks, useAuth
src/lib/                                         # Utilities: supabase client, openai wrapper, bmi, format, etc.
src/config/                                      # Static configuration
src/test/                                        # Shared test helpers (renderWithProviders, queryWrapper, supabaseMock)
supabase/functions/                              # Deno edge functions (TypeScript)
supabase/schema.sql                              # Canonical database schema
```

## 4. Key Conventions

- **Path alias:** `@/` resolves to `src/`. Always use this alias for imports within `src/`.
- **Auth state:** Read from `useAuth` hook (`src/hooks/useAuth.jsx`) — never call `supabase.auth` directly in components.
- **Data fetching:** All Supabase reads wrapped in TanStack Query hooks (`src/hooks/`). Never call Supabase directly from components.
- **Mutations:** Must invalidate relevant query keys via `queryClient.invalidateQueries`. `staleTime` defaults to 60s.
- **Styling:** Use `cn()` from `@/lib/utils` (clsx + tailwind-merge) for conditional classes. Animations via `tailwindcss-animate` or `framer-motion`.
- **UI components:** All shared primitives in `src/components/ui/`. Extend existing files — do not install additional headless UI libs.
- **Toasts:** `sonner` — call `toast.success()` / `toast.error()` directly, no custom wrapper.

### Naming conventions

| Thing                        | Convention              | Example                         |
|------------------------------|-------------------------|---------------------------------|
| Components                   | PascalCase              | `FoodLogTable.jsx`              |
| Hooks                        | `use` prefix, camelCase | `useFoodLog.js`                 |
| Utilities / helpers          | camelCase               | `bmiCalculator.js`, `format.js` |
| DB columns / Supabase fields | Indonesian snake_case   | `nama_makanan`, `waktu_makan`   |
| React variables/props        | English camelCase       | `isLoading`, `onSubmit`         |

### UI language and formatting

- All user-facing text is **Indonesian**.
- Date display: `DD MMMM YYYY` (e.g. `27 Maret 2026`) — use `format.js` helpers.
- Number format: decimal comma, thousands dot (`1.234,56`) — use `format.js` helpers.
- BMI thresholds (WHO Asia-Pacific): Underweight < 18.5 / Normal 18.5–22.9 / Overweight 23.0–27.4 / Obese ≥ 27.5.

### Domain-specific rules

- Calorie estimates come exclusively from the `estimate-calories` Edge Function — cannot be edited after saving.
- BMI computed on frontend (`src/lib/bmiCalculator.js`) — not stored by DB trigger.
- Anthropometry entry UI: touch-friendly for tablet landscape, min 44×44 px targets, `inputMode="decimal"`.
- Show `CalorieDisclaimer` wherever estimated calorie values are displayed.

## 5. Pages / Routes / Endpoints

**Auth:** `/login`

**Admin:** `/admin/dashboard`, `/admin/users`, `/admin/users/:id`, `/admin/food-units`, `/admin/clients`, `/admin/clients/:id`, `/admin/clients/:id/data-entry`, `/admin/data-entry`, `/admin/import`, `/admin/food-logs`

**Ahli Gizi:** `/gizi/dashboard`, `/gizi/clients`, `/gizi/clients/:id`, `/gizi/clients/:id/data-entry`, `/gizi/data-entry`, `/gizi/food-logs`

**Klien:** `/klien/dashboard`, `/klien/food-entry`, `/klien/progress`

**Public:** `/` (RootRedirect — redirects to role dashboard or login)

Route protection via `RequireAuth` component with `roles` prop per route group.

## 6. Environment

| Variable               | Required | Notes                                      |
|------------------------|----------|--------------------------------------------|
| `VITE_SUPABASE_URL`    | Yes      | Supabase project URL                       |
| `VITE_SUPABASE_ANON_KEY` | Yes   | Supabase anonymous key                     |
| `OPENAI_API_KEY`       | Server   | Stored in Supabase secrets, never `VITE_`  |
| `ALLOWED_ORIGIN`       | Server   | Allowed origin for OpenAI edge function    |
| `DEV_HMR_HOST`         | Optional | LAN IP for mobile HMR access               |

## 7. Database

Tables in `supabase/schema.sql` (canonical schema — keep in sync):

| Table                    | Purpose                              |
|--------------------------|--------------------------------------|
| `profiles`               | User profiles with role assignments  |
| `body_measurements`      | Anthropometric tracking records      |
| `food_units`             | Food unit definitions (centong, etc) |
| `food_logs`              | Daily food intake logs               |
| `food_log_items`         | Individual food items within logs    |
| `assessments`            | Nutritional assessment calculations  |
| `user_evaluations`       | User evaluation and feedback         |
| `food_name_suggestions`  | View — frequently consumed foods     |

All tables have RLS enabled. Key helper functions: `jwt_is_staff()` (admin or ahli_gizi), `food_log_owned_by_me(uuid)`.

## 8. Common Commands

```bash
npm run dev            # Start dev server with HMR on host
npm run build          # Production build
npm run lint           # ESLint
npm run preview        # Preview production build
npm test               # Full test suite once (CI equivalent)
npm run test:watch     # TDD watch loop
npm run test:coverage  # Coverage report (HTML + lcov)
npm run test:related   # Only tests related to changed files
```

## 9. Testing

### Stack
- **Unit:** Vitest 4.1.5 + @testing-library/react + @testing-library/jest-dom + jsdom
- **Config:** `vitest.config.js`, global setup in `src/test/setup.js`
- **Locations:** Co-located with source (`*.test.js`, `*.test.jsx`)

### Shared helpers (always use these)
- `src/test/renderWithProviders.jsx` — renders with Router + QueryClient
- `src/test/queryWrapper.jsx` — wraps hooks with QueryClient
- `src/test/supabaseMock.js` — Supabase client mock

### Rules
- Mandatory for `src/lib/**` and `src/hooks/**` (coverage scope in vitest.config.js)
- Required for components with non-trivial behavior: forms, role/permission gates, state transitions
- Not required for pure style/markup tweaks, copy changes, or doc edits
- Bug fixes: add a regression test that fails before the fix and passes after
- Components: test rendered output, user interactions, conditional rendering
- Hooks: test query/mutation behavior using `renderHook`
- Lib/Utils: pure function tests — input/output, edge cases

## 10. Security Notes

- Auth via Supabase JWT — `useAuth` hook, `RequireAuth` route guard with role allowlist
- All tables RLS-enabled — never use service role key in frontend
- `OPENAI_API_KEY` must never be prefixed with `VITE_` — server-side only (Supabase secrets)
- Use `<YOUR_API_KEY>` placeholders when demonstrating env variables
- Never bypass RLS or expose secrets in frontend code

## 11. Task Handoff

Read `tasks/current.md` at session start to resume where the previous agent left off. Before ending any task or when context is running low, update `tasks/current.md` with:
- Status of current work (in-progress / blocked / done)
- Decisions made and why
- Next steps for the next agent

## Pre-commit checklist

1. `npm run lint` — must exit clean. No `eslint-disable` without justification.
2. `npm test` — all tests must be green.
3. Commit and push only after both pass.
