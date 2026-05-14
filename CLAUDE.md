# CLAUDE.md — NutriTrack / LAPER

**START HERE** — Read this first for essentials. For comprehensive conventions, architecture, and testing rules, see [AGENTS.md](AGENTS.md).

This document is your onboarding ramp: what you need to know immediately to work effectively, and how to avoid common mistakes.

---

## What This Project Is

NutriTrack (LAPER) is a nutritional tracking platform for Indonesian dietitians and their clients. Role-based workflows with three user types: admin, ahli_gizi, klien.

**Stack:** React 19, Vite 8, Tailwind 4, React Query 5, Supabase 2 (auth + Postgres + Edge Functions)
**Language:** All user-facing text is Indonesian
**Test:** Vitest 4 + React Testing Library

---

## Testing — When & What

**REQUIRED:** `src/lib/**`, `src/hooks/**`, any component with non-trivial behavior (forms, role gates, state transitions, bug fixes with regression test)

**NOT REQUIRED:** Pure style/markup tweaks, copy changes, doc edits

**What to test:**
- Components: rendered output, user interactions, conditional rendering
- Hooks: query/mutation behavior using `renderHook`
- Lib/utils: pure function input/output, edge cases

**Helpers:** Always use `src/test/renderWithProviders.jsx`, `src/test/queryWrapper.jsx`, `src/test/supabaseMock.js` — see [AGENTS.md](AGENTS.md#9-testing) for details.

**Pre-commit:** `npm run lint` and `npm test` must both pass.

---

## Avoid These Common Mistakes

| ❌ Don't | ✅ Do |
|---------|-------|
| `supabase.auth.*` in components | `useAuth()` hook from `src/hooks/useAuth.jsx` |
| `supabase.from('...').select()` in components | React Query hooks from `src/hooks/` |
| English UI text | Indonesian — `format.js` has helpers for dates/numbers |
| `VITE_OPENAI_API_KEY` | Server-side only — Supabase secrets, never `VITE_*` |
| Editing saved calorie estimates | Immutable after save — from Edge Function |
| Hardcoded BMI thresholds | `src/lib/bmiCalculator.js` (WHO Asia-Pacific) |

See [AGENTS.md](AGENTS.md#4-key-conventions) for full conventions.

---

## Project Structure

```
src/pages/{admin,ahli-gizi,klien,staff,auth}/  # Route pages by role
src/components/ui/                              # Radix primitives (shadcn)
src/components/{food,measurement,dashboard}/    # Feature components
src/hooks/                                      # React Query + useAuth
src/lib/                                        # Supabase client, formatters, helpers
src/test/                                       # Shared test helpers
supabase/functions/                             # Edge Functions (TypeScript)
supabase/schema.sql                             # Canonical DB schema
```

**Key pattern:** `@/` alias resolves to `src/` — always use for imports.

Full architecture: [AGENTS.md](AGENTS.md#3-architecture)

---

## Task Handoff

**START:** Read `tasks/current.md` to resume previous work

**FINISH:** Update `tasks/current.md` with:
- Status (in-progress / blocked / done)
- Decisions made and why
- Next steps for the next agent

This keeps work continuous across sessions.

---

## Common Commands

```bash
npm install
npm run dev            # Vite dev server (strict port 5174)
npm run lint           # ESLint (must be clean before commit)
npm test               # Vitest run (CI equivalent)
```

Full command reference: [README.md](README.md)
