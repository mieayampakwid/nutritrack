# NutriTrack (PER)

**Laporan Asupan & Evaluasi Rutin** — role-based nutrition tracking for clients, dietitians, and admins (React, Vite, Supabase).

## Documentation

All detailed documentation lives in **[`readme/`](readme/README.md)**:

- **[readme/README.md](readme/README.md)** — documentation index and reading order  
- **[readme/PROJECT_SPECIFICATION.md](readme/PROJECT_SPECIFICATION.md)** — full tech spec and features  
- **[readme/FEATURES.md](readme/FEATURES.md)** — feature list (Indonesian)  
- **[readme/TECH_SPEC.md](readme/TECH_SPEC.md)** — technical specification (detailed)  

## Quick start

1. Copy environment template: `.env.example` → `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.  
2. Install and run:

```bash
npm install
npm run dev
```

3. For AI calorie estimation and Supabase Edge Functions, follow the comments in [`.env.example`](.env.example) and [`readme/PROJECT_SPECIFICATION.md`](readme/PROJECT_SPECIFICATION.md) (OpenAI secrets, function deploy).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (`--host`) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
