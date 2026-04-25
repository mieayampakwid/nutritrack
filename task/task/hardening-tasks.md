# Security Hardening -- NutriTrack (PER)

## Background

NutriTrack is a Supabase-backed React SPA for clinical nutrition tracking. It handles health data (food logs, body measurements, BMI) across three roles: `admin`, `ahli_gizi` (dietitian), and `klien` (patient). The app runs on shared tablets in hospital environments.

The current security baseline includes Supabase RLS on all tables, server-only OpenAI key, role-based route guards, and inactive-user sign-out. This hardening pass addresses the remaining gaps found during audit.

## Scope

- **In scope:** RLS policies, HTTP security headers, Edge Function hardening, client-side auth/session improvements, input validation, dependency audit.
- **Out of scope:** Infrastructure-level changes (Supabase project settings, Vercel WAF), penetration testing, SOC2/HIPAA compliance mapping.

---

## Task Index

| ID | Task | Severity | Sprint | Layer |
|----|------|----------|--------|-------|
| 1 | Fix `profiles_self_update` RLS -- role escalation | Critical | 1 | Database |
| 2 | Fix `food_name_suggestions` cross-user leak | High | 1 | Database |
| 3 | Add security headers to `vercel.json` | High | 1 | Deployment |
| 4 | Restrict Edge Function CORS to production origin | High | 1 | Edge Function |
| 5 | Harden Edge Function against prompt injection | Medium | 1 | Edge Function |
| 6 | Add idle session timeout | Medium | 1 | Frontend |
| 7 | Add login attempt throttling | Low | 1 | Frontend |
| 8 | Add Zod validation schemas for forms | Medium | 1 | Frontend |
| 9 | Dependency audit | Low | 1 | Ops |
| 10 | Sanitize error output for production | Low | 1 | Frontend |
| 11 | Audit staff write access to `food_logs` | Low | 1 | Database |
| 12 | Audit `anon` role grants | Low | 1 | Database |

## Sprint Plan

| Sprint | Focus | Duration | Tasks |
|--------|-------|----------|-------|
| [Sprint 1](sprint-1.md) | Full security hardening | 1 week | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 |

---

## Task Details

### Task 1 -- Fix `profiles_self_update` RLS (Critical)

**Problem:** The `profiles_self_update` policy has no column restriction. Any authenticated user can escalate their role to `admin` via a direct Supabase client call from browser DevTools.

**File:** `supabase/schema.sql` line 198-199

**Current code:**

```sql
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);
```

**Steps:**
1. Drop the existing `profiles_self_update` policy
2. Create a replacement policy with a `WITH CHECK` clause that freezes `role` and `is_active` to their current values
3. Create a new migration file `supabase/migration_harden_self_update.sql` with the change
4. Update `supabase/schema.sql` to reflect the new policy

**Target policy:**

```sql
create policy "profiles_self_update" on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    AND role = (select p.role from public.profiles p where p.id = auth.uid())
    AND is_active = (select p.is_active from public.profiles p where p.id = auth.uid())
  );
```

**Acceptance criteria:**
- A `klien` user calling `.update({ role: 'admin' })` receives a policy violation error
- A `klien` user calling `.update({ is_active: true })` after being deactivated is blocked
- A `klien` user can still update allowed fields (e.g. `nomor_wa`, `phone_whatsapp`)
- Staff `for all` policy remains unaffected

---

### Task 2 -- Fix `food_name_suggestions` View (High)

**Problem:** The `food_name_suggestions` view aggregates all `food_log_items` globally. Any authenticated user sees food names logged by every other user. Views bypass RLS by default in Postgres.

**File:** `supabase/schema.sql` line 102-106

**Steps:**
1. Drop the existing `food_name_suggestions` view
2. Replace it with a `security_invoker = true` view (Postgres 15+, which Supabase supports), so RLS on `food_log_items` is enforced through the view
3. Alternatively, if the autocomplete feature intentionally uses a global corpus (all users' food names to improve suggestions), document this as an explicit design decision and add a code comment

**Acceptance criteria:**
- Either: the view is filtered per-user via `security_invoker`, or: the global scope is documented as intentional with a comment in `schema.sql`
- No regression in the food entry autocomplete feature

---

### Task 3 -- Add Security Headers (High)

**Problem:** No Content-Security-Policy, HSTS, X-Frame-Options, or other security headers are set. The app is vulnerable to clickjacking, MIME sniffing, and has no script execution restrictions.

**File:** `vercel.json`

**Steps:**
1. Add a `headers` array to `vercel.json` applying to all routes `/(.*)`
2. Include these headers:
   - `Content-Security-Policy` -- restrict `script-src` to `'self'`, allow `style-src 'unsafe-inline'` (required by Tailwind/Radix), allow `connect-src` to `*.supabase.co`, allow `font-src` to `fonts.gstatic.com`, allow `img-src` to `'self' data: https:`
   - `Strict-Transport-Security` -- `max-age=63072000; includeSubDomains; preload`
   - `X-Content-Type-Options` -- `nosniff`
   - `X-Frame-Options` -- `DENY`
   - `Referrer-Policy` -- `strict-origin-when-cross-origin`
   - `Permissions-Policy` -- `camera=(), microphone=(), geolocation=()`
3. Deploy to a Vercel preview and verify no console errors from blocked resources

**Acceptance criteria:**
- All six headers are present in production response headers
- No broken fonts, styles, images, or API calls due to CSP
- Lighthouse "Best Practices" score does not regress

---

### Task 4 -- Restrict Edge Function CORS (High)

**Problem:** The Edge Function returns `Access-Control-Allow-Origin: *`, allowing any website to call the function with a user's JWT if obtained.

**File:** `supabase/functions/estimate-calories/index.ts` line 4

**Steps:**
1. Read `ALLOWED_ORIGIN` from `Deno.env.get()`
2. Use it as the `Access-Control-Allow-Origin` value; fall back to `*` only when not set (local dev)
3. Document the new secret in `.env.example` and `README.md`
4. Set the secret: `supabase secrets set ALLOWED_ORIGIN=https://<production-domain>`

**Acceptance criteria:**
- Production responses have `Access-Control-Allow-Origin` set to the exact production domain
- Local development (`supabase functions serve`) still works without setting the secret
- Cross-origin requests from unauthorized domains are rejected by the browser

---

### Task 5 -- Harden Edge Function Against Prompt Injection (Medium)

**Problem:** User-supplied `nama_makanan` and `unit_nama` are interpolated directly into the OpenAI prompt. A crafted input can manipulate AI output (e.g. return 0 calories for everything).

**File:** `supabase/functions/estimate-calories/index.ts` lines 12-36, 118-122

**Steps:**
1. Add a `sanitize` function that caps string length (100 chars), strips newlines/control characters, and removes non-food characters
2. Apply `sanitize` to `nama_makanan` and `unit_nama` during normalization (line 118-122)
3. Split the prompt into a `system` message (instructions, output format) and a `user` message (food data only)
4. Add a max `jumlah` cap (e.g. 10000) to reject absurd quantities

**Acceptance criteria:**
- Input containing newlines, backticks, or instruction-like text is sanitized before reaching OpenAI
- The prompt uses `system` + `user` message roles instead of a single `user` message
- Normal food entries (Indonesian names, Unicode) still work correctly
- Strings longer than 100 chars are truncated

---

### Task 6 -- Add Idle Session Timeout (Medium)

**Problem:** Sessions persist indefinitely. On shared hospital tablets, a `klien` session left open gives the next user full access to that patient's health data.

**File:** `src/hooks/useAuth.jsx`

**Steps:**
1. Create a `useIdleTimeout` hook that tracks last-activity timestamp via `mousemove`, `keydown`, `touchstart`, and `visibilitychange` events
2. After 30 minutes of inactivity, call `supabase.auth.signOut()` and redirect to `/login`
3. Show a warning toast 2 minutes before timeout to give users a chance to stay active
4. Make the timeout duration configurable via a constant (not env -- this is a UX setting)

**Acceptance criteria:**
- User is signed out after 30 minutes of no interaction
- A warning toast appears at the 28-minute mark
- Any user interaction (mouse, keyboard, touch) resets the timer
- Tab visibility changes are handled (hidden tab counts as idle)

---

### Task 7 -- Add Login Attempt Throttling (Low)

**Problem:** No client-side rate limiting on login attempts. While Supabase has platform-level limits, repeated failures produce rapid error toasts and could be used for credential stuffing.

**File:** `src/pages/auth/LoginPage.jsx`

**Steps:**
1. Track consecutive failed login attempts in component state
2. After 5 failures, disable the submit button for 30 seconds (show a countdown)
3. Double the lockout on each subsequent failure batch (30s, 60s, 120s, max 5 min)
4. Reset the counter on successful login or page refresh

**Acceptance criteria:**
- After 5 failed attempts, the form is disabled with a visible countdown
- The lockout duration doubles each time (capped at 5 minutes)
- Successful login resets the counter
- Page refresh resets the counter (this is client-side only, not a security boundary)

---

### Task 8 -- Add Zod Validation Schemas (Medium)

**Problem:** No systematic input validation. Forms rely on HTML `required` and ad-hoc regex. Malformed data can reach Supabase and cause confusing RLS or constraint errors.

**Steps:**
1. Install `zod` as a dependency
2. Create `src/lib/validators.js` with schemas for:
   - **Login:** `z.object({ email: z.string().email(), password: z.string().min(6) })`
   - **User creation:** `z.object({ nama, email, role, nomor_wa?, instalasi?, tgl_lahir?, ... })`
   - **Food entry item:** `z.object({ nama_makanan: z.string().min(1).max(100), jumlah: z.number().positive().max(10000), unit_nama: z.string().min(1) })`
   - **Body measurement:** `z.object({ tanggal: z.string().date(), berat_badan: z.number().positive()?, ... })`
3. Integrate schemas into form submit handlers (validate before Supabase call, show field-level errors)

**Acceptance criteria:**
- All major forms validate input before API calls
- Validation errors are shown inline (not just toast)
- No regression in existing form behavior
- Schemas are reusable and centralized in one file

---

### Task 9 -- Dependency Audit (Low)

**Steps:**
1. Run `npm audit` and review findings
2. Fix or upgrade packages with known vulnerabilities
3. Run `npm audit --production` to check runtime-only deps
4. Add `npm audit` to CI if a pipeline exists

**Acceptance criteria:**
- `npm audit --production` reports 0 critical/high vulnerabilities
- `npm run build` still succeeds after upgrades

---

### Task 10 -- Sanitize Error Output (Low)

**Problem:** `console.error` in `useAuth.jsx` logs raw Supabase errors that may reveal table names, column names, or RLS policy details to anyone with DevTools open.

**Files:** `src/hooks/useAuth.jsx`, `src/lib/openai.js`

**Steps:**
1. Replace `console.error(error)` with a generic log in production (`import.meta.env.PROD`)
2. Keep detailed logging in development mode
3. Ensure user-facing error messages from Supabase are generic ("Terjadi kesalahan. Silakan coba lagi.") rather than raw API responses

**Acceptance criteria:**
- In production builds, no raw Supabase error objects appear in the console
- User-facing toasts show generic Indonesian messages, not internal error strings
- Development mode retains full error logging for debugging

---

### Task 11 -- Audit Staff Write Access to `food_logs` (Low)

**Problem:** Staff (`admin`, `ahli_gizi`) have `for all` on `profiles` but only `for select` on `food_logs`. However, via the `profiles_staff` policy's broad grant, staff could potentially modify food logs through the `food_log_items` -> `food_logs` relationship.

**Steps:**
1. Verify whether staff should be able to insert/update/delete food logs on behalf of clients
2. If yes: document this in `schema.sql` with a comment explaining the intent
3. If no: add explicit `for select` staff policies and remove any `for all` that covers food data

**Acceptance criteria:**
- Staff write access to food data is either restricted or documented as intentional

---

### Task 12 -- Audit `anon` Role Grants (Low)

**Problem:** `schema.sql` line 255 grants `usage on schema public` to `anon`. While current RLS policies require `auth.uid()`, a future policy mistake could expose data to unauthenticated users.

**Steps:**
1. Verify no RLS policy allows `anon` access (all should require `authenticated`)
2. Confirm the `food_name_suggestions` view (if kept) is not accessible to `anon`
3. Document the `anon` grant with a comment explaining it is required by Supabase's architecture but carries no data access risk given current policies

**Acceptance criteria:**
- Confirmed that no table data is accessible without authentication
- A comment in `schema.sql` documents the `anon` grant rationale
