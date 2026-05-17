# LAPER — Laporan Asupan & Evaluasi Rutin

Role-based nutrition tracking web application for Indonesian clinical and institutional workflows. Connects clients (`klien`) with dietitians (`ahli_gizi`) and administrators (`admin`).

## Tech stack

| Area                  | Technology                                                          |
| --------------------- | ------------------------------------------------------------------- |
| UI                    | React 19, React Router DOM 7                                        |
| Server state          | TanStack React Query 5                                              |
| Styling               | Tailwind CSS 4 (`@theme` in `src/index.css`), `tailwindcss-animate` |
| UI primitives         | Radix UI + local `src/components/ui/` (shadcn pattern)              |
| Charts                | Recharts 3                                                          |
| Motion                | Framer Motion 12                                                    |
| Dates                 | date-fns 4, react-day-picker 9                                      |
| Notifications         | Sonner                                                              |
| Excel import          | SheetJS (`xlsx`)                                                    |
| Backend               | Supabase (Auth, Postgres, RLS, Edge Functions)                      |
| AI calorie estimation | OpenAI via Supabase Edge Function (`estimate-calories`)             |
| Build                 | Vite 8, `@vitejs/plugin-react`                                      |
| Lint                  | ESLint 9 flat config                                                |
| Deploy                | Vercel (`vercel.json` SPA rewrite)                                  |

## Getting started

```bash
git clone <repo-url> nutritrack
cd nutritrack
npm install
cp .env.example .env
# Fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
npm run dev
```

The dev server runs on `http://localhost:5174` (strict port).

## Environment variables

| Variable                 | Where                                                      | Required               |
| ------------------------ | ---------------------------------------------------------- | ---------------------- |
| `VITE_SUPABASE_URL`      | `.env` (browser)                                           | Yes                    |
| `VITE_SUPABASE_ANON_KEY` | `.env` (browser)                                           | Yes                    |
| `DEV_HMR_HOST`           | `.env` (Vite only, no `VITE_` prefix)                      | No                     |
| `OPENAI_API_KEY`         | Supabase secrets / `supabase/.env.local`                   | Yes (server-side only) |
| `OPENAI_MODEL`           | Supabase secrets (optional)                                | No                     |
| `ALLOWED_ORIGIN`         | Supabase secrets (optional, defaults to `*` for local dev) | No                     |

Never expose `OPENAI_API_KEY` via a `VITE_*` variable. See `.env.example` for details.

## Supabase setup

1. Apply the schema:

   ```bash
   # Run supabase/schema.sql in the Supabase SQL editor or via CLI
   ```

2. Apply any pending migrations in `supabase/`:
   - `migration_user_evaluations.sql`
   - `migration_nutritrack_tasks.sql`
   - `migration_handle_new_user_tgl_phone.sql`

3. Deploy the Edge Function:

   ```bash
   supabase secrets set OPENAI_API_KEY=<YOUR_OPENAI_API_KEY>
   supabase secrets set OPENAI_MODEL=gpt-4o-mini
   supabase secrets set ALLOWED_ORIGIN=https://<production-domain>
   supabase functions deploy estimate-calories
   ```

4. For local function development:

   ```bash
   supabase functions serve estimate-calories --env-file supabase/.env.local
   ```

## Scripts

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Vite dev server with `--host`                |
| `npm run build`         | Production bundle                            |
| `npm run preview`       | Preview production build                     |
| `npm run lint`          | ESLint                                       |
| `npm run seed:participants -- --file "<path.xlsx>" --default-password "<password>"` | One-time import participants from Excel (requires service role key) |
| `npm test`              | Run Vitest suite once                        |
| `npm run test:watch`    | Vitest watch mode                            |
| `npm run test:coverage` | Coverage report (HTML + lcov in `coverage/`) |
| `npm run test:related`  | Only tests related to changed files          |

## Coding conventions

For comprehensive coding conventions, naming patterns, and architecture rules, see [AGENTS.md](AGENTS.md).

## Testing

Vitest 4 + React Testing Library + jsdom. Tests colocate with source files (`*.test.js` / `*.test.jsx`). See [AGENTS.md](AGENTS.md#9-testing) for when tests are required, shared helpers, and naming conventions.

Pre-commit gate: run `npm run lint` and `npm test` locally — both must pass before committing or pushing.

## Project structure

```
src/
  pages/{admin,ahli-gizi,klien,staff,auth}/  # Route pages by role
  components/{ui,food,measurement,dashboard}/  # UI components
  hooks/                                      # React Query + useAuth
  lib/                                        # Supabase client, formatters, helpers
  test/                                       # Shared test helpers
supabase/
  schema.sql                                  # Canonical DB schema
  functions/                                  # Edge Functions (estimate-calories, etc.)
```

For detailed architecture and component breakdown, see [AGENTS.md](AGENTS.md#3-architecture).

## Roles

| Role      | Code        | Access                                                        |
| --------- | ----------- | ------------------------------------------------------------- |
| Admin     | `admin`     | Full access: users, import, food units, client oversight      |
| Dietitian | `ahli_gizi` | Client lists, anthropometry, food log monitoring, evaluations |
| Client    | `klien`     | Own food logs, progress charts, routine evaluations           |

Route guard (`RequireAuth` in `src/App.jsx`) requires a valid Supabase session, a loaded `profiles` row, and membership in the route's role allowlist. Inactive accounts (`is_active = false`) are signed out immediately.

## Deployment

`vercel.json` rewrites all paths to `index.html` for client-side routing. No additional server configuration is needed when deploying to Vercel.

## Related documents

- [PROJECT_SPECIFICATION.md](PROJECT_SPECIFICATION.md) — authoritative product and architecture spec
- [TECH_SPEC.md](TECH_SPEC.md) — earlier technical write-up
- [FEATURES.md](FEATURES.md) — Indonesian feature list for stakeholders
