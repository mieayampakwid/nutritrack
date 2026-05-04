# CLAUDE.md — NutriTrack / LAPER

## Project Overview

NutriTrack (LAPER) is a web-based nutritional tracking platform for Indonesian dietitians (ahli gizi) and their clients (klien). It provides food logging, anthropometric tracking, calorie estimation via AI, and progress monitoring.

## Tech Stack

- JavaScript/JSX (React 19.2.4, Vite 8.0.1)
- Tailwind CSS 4.2.2 (no tailwind.config — theme in `src/index.css` via `@theme {}`)
- TanStack React Query 5.95.2 for server state
- React Router DOM 7.13.2
- Supabase 2.100.1 (auth, Postgres, RLS, Edge Functions, Storage)
- Vitest 4.1.5 + @testing-library/react for testing
- TypeScript only in `supabase/functions/` (Deno edge functions)

## Where to look first

- `README.md` — setup, env vars, Supabase + Edge Function notes
- `AGENTS.md` — coding conventions, architecture map, testing rules (authoritative)
- `tasks/current.md` — current work handoff (update before ending a session)

## Common commands

```bash
npm install
npm run dev            # Vite dev server (strict port 5174)
npm run lint           # ESLint (must be clean before commit)
npm test               # Vitest run (CI equivalent)
```

## Gotchas (high impact)

- Use `@/` alias for imports within `src/` (configured in `vite.config.js`).
- Do not call `supabase.auth` directly in components; use the project’s `useAuth` + Query hooks (see `AGENTS.md`).
- Never expose `OPENAI_API_KEY` in frontend env (`VITE_*`).

## Task Handoff

Read `tasks/current.md` at session start to resume where the previous agent left off. Before ending any task or when context is running low, update `tasks/current.md` with:
- Status of current work (in-progress / blocked / done)
- Decisions made and why
- Next steps for the next agent
