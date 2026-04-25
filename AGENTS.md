# AGENTS.md — NutriTrack / LAPER

Coding conventions and project context for AI coding agents (Cursor, Copilot, etc.).

---

## Language and framework

- Application code is **JavaScript/JSX** — do not introduce TypeScript into `src/`.
- TypeScript is used only in `supabase/functions/` (Deno edge functions).
- React 19, Vite 8.

## Path alias

`@/` resolves to `src/`. Always use this alias for imports within `src/`.

```js
// Good
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

// Bad
import { cn } from "../../lib/utils";
```

## Styling

- Tailwind CSS v4. There is **no** `tailwind.config.js` — theme tokens are declared in `src/index.css` via `@theme {}`.
- Use `cn()` from `@/lib/utils` (wraps `clsx` + `tailwind-merge`) for conditional classes.
- Animations use `tailwindcss-animate` utility classes or `framer-motion` where richer motion is needed.

## UI components

- All shared primitives live in `src/components/ui/` (Radix UI-based, shadcn pattern).
- Use `class-variance-authority` (CVA) for variant-driven component APIs.
- Do not install additional headless UI libraries; extend existing `src/components/ui/` files instead.
- Toasts use `sonner` — call `toast.success()` / `toast.error()` directly, no custom wrapper needed.

## Data fetching and state

- All Supabase reads are wrapped in **TanStack React Query** hooks (`src/hooks/`).
- Mutations must invalidate the relevant query keys via `queryClient.invalidateQueries`.
- `staleTime` defaults to 60 seconds (configured in `App.jsx`); override per-query only when justified.
- Do not call Supabase directly from components — always go through a hook.

## Auth and security

- Auth state comes from `useAuth` (`src/hooks/useAuth.jsx`); never read `supabase.auth` directly in components.
- Route protection is handled by `RequireAuth` in `src/App.jsx` (role allowlist per route).
- **Never bypass RLS** — do not use the Supabase service role key in frontend code.
- **Never prefix OpenAI credentials with `VITE_`** — they must stay server-side (Supabase secrets).
- Use `<YOUR_API_KEY>` placeholders when demonstrating env variables.

## File organization

```
src/pages/{admin,ahli-gizi,klien,staff,auth}/   # Route-level pages by role
src/components/shared/                           # Cross-role UI (disclaimer, spinner, error boundary)
src/components/ui/                               # Primitive components (shadcn pattern)
src/hooks/                                       # React Query hooks, useAuth
src/lib/                                         # Utilities: supabase client, openai wrapper, bmi, format, etc.
src/config/                                      # Static configuration
```

Add new pages in the appropriate role folder. Add new shared components to `src/components/shared/` only if they are used across two or more role domains.

## Naming conventions

| Thing                        | Convention              | Example                         |
| ---------------------------- | ----------------------- | ------------------------------- |
| Components                   | PascalCase              | `FoodLogTable.jsx`              |
| Hooks                        | `use` prefix, camelCase | `useFoodLog.js`                 |
| Utilities / helpers          | camelCase               | `bmiCalculator.js`, `format.js` |
| DB columns / Supabase fields | Indonesian snake_case   | `nama_makanan`, `waktu_makan`   |
| React variables/props        | English camelCase       | `isLoading`, `onSubmit`         |

## UI language and formatting

- All user-facing text is in **Indonesian**.
- Date display format: `DD MMMM YYYY` (e.g. `27 Maret 2026`) — use `format.js` helpers.
- Number format: decimal comma, thousands dot (`1.234,56`) — use `format.js` helpers.
- BMI thresholds follow WHO Asia-Pacific: Underweight < 18.5 / Normal 18.5–22.9 / Overweight 23.0–27.4 / Obese ≥ 27.5.

## Domain-specific rules

- Calorie estimates come exclusively from the `estimate-calories` Edge Function; they cannot be edited after saving.
- BMI is computed on the frontend (`src/lib/bmiCalculator.js`) — not stored by the database trigger.
- Anthropometry entry UI must be touch-friendly for tablet landscape: minimum touch target 44×44 px, numeric inputs `inputMode="decimal"`.
- Show `CalorieDisclaimer` wherever estimated calorie values are displayed.

## Supabase schema

- The canonical schema is `supabase/schema.sql`. Keep it in sync when adding tables or policies.
- Any new table needs RLS enabled and appropriate policies.
- Helper functions `jwt_is_staff()` and `food_log_owned_by_me(uuid)` are available in RLS policies.

## Testing

**Stack**: Vitest 4 + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` + jsdom. Config in `vitest.config.js`; global setup in `src/test/setup.js`.

**File location**: colocate `*.test.js` / `*.test.jsx` next to the source file, e.g. `src/lib/bmiCalculator.test.js`, `src/hooks/useFoodLog.test.js`, `src/components/food/FoodEntryForm.test.jsx`.

**Shared helpers** (always use these instead of ad-hoc mocks):

- `src/test/renderWithProviders.jsx` — renders with Router + QueryClient.
- `src/test/queryWrapper.jsx` — wraps hooks with a QueryClient.
- `src/test/supabaseMock.js` — Supabase client mock.

**When tests are required** — on any add / change / remove of a feature:

- Mandatory for `src/lib/**` and `src/hooks/**` (coverage scope in `vitest.config.js`).
- Required for components with non-trivial behavior: forms, role/permission gates, state transitions.
- Not required for pure style/markup tweaks, copy changes, or doc edits.

**Bug fixes**: add a regression test that fails before the fix and passes after.

**Commands**:

| Command                 | Use                                          |
| ----------------------- | -------------------------------------------- |
| `npm test`              | Full suite once (CI equivalent)              |
| `npm run test:watch`    | TDD watch loop                               |
| `npm run test:coverage` | Coverage report in `coverage/` (HTML + lcov) |
| `npm run test:related`  | Only tests related to changed files          |

## Pre-commit checklist

Before every commit and push:

1. `npm run lint` — must exit clean. No `eslint-disable` without a justification in the PR description.
2. `npm test` — all tests must be green. Intentionally skipped tests require an explanation.
3. Commit and push only after both pass locally.
