# Sprint 3 -- Validation, Audit & Cleanup

**Duration:** 1 week
**Focus:** Add systematic input validation with Zod, audit dependencies, sanitize error output, and verify remaining RLS policy assumptions.
**Priority:** Medium and Low severity. Sprints 1-2 must be completed first.

---

## Sprint Goal

After this sprint, all major forms validate input before API calls, production error output is sanitized, dependencies are audited, and remaining RLS assumptions are documented.

---

## Checklist

- [ ] **Task 8** -- Add Zod validation schemas for forms
- [ ] **Task 9** -- Dependency audit
- [ ] **Task 10** -- Sanitize error output for production
- [ ] **Task 11** -- Audit staff write access to `food_logs`
- [ ] **Task 12** -- Audit `anon` role grants

---

## Task 8 -- Add Zod Validation Schemas (Medium)

**Severity:** Medium
**Layer:** Frontend
**File:** New file `src/lib/validators.js`, then integrate into form components
**Estimated effort:** 3-4 hours

### Problem

No systematic input validation library. Forms rely on HTML `required` and ad-hoc regex. Malformed data reaches Supabase and produces confusing constraint or RLS errors instead of helpful field-level messages.

### Implementation

**Step 1 -- Install Zod:**

```bash
npm install zod
```

**Step 2 -- Create `src/lib/validators.js`:**

```javascript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
})

export const userCreateSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi').max(200),
  email: z.string().email('Format email tidak valid'),
  role: z.enum(['admin', 'ahli_gizi', 'klien']),
  nomor_wa: z.string().optional(),
  instalasi: z.string().optional(),
  tgl_lahir: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional().or(z.literal('')),
  jenis_kelamin: z.enum(['male', 'female']).optional(),
})

export const foodEntryItemSchema = z.object({
  nama_makanan: z.string().min(1, 'Nama makanan wajib diisi').max(100),
  jumlah: z.number().positive('Jumlah harus lebih dari 0').max(10000, 'Jumlah terlalu besar'),
  unit_nama: z.string().min(1, 'Satuan wajib dipilih'),
})

export const foodEntrySchema = z.object({
  items: z.array(foodEntryItemSchema).min(1, 'Minimal 1 makanan'),
})

export const bodyMeasurementSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid'),
  berat_badan: z.number().positive().max(500).optional(),
  tinggi_badan: z.number().positive().max(300).optional(),
  massa_otot: z.number().min(0).max(200).optional(),
  massa_lemak: z.number().min(0).max(100).optional(),
  catatan: z.string().max(1000).optional(),
})
```

**Step 3 -- Integrate into form submit handlers:**

Pattern for each form:

```javascript
import { loginSchema } from '@/lib/validators'

async function handleSubmit(e) {
  e.preventDefault()
  const result = loginSchema.safeParse({ email, password })
  if (!result.success) {
    const firstError = result.error.issues[0]
    toast.error(firstError.message)
    return
  }
  // proceed with Supabase call
}
```

### Forms to Update

| Form | File | Schema |
|------|------|--------|
| Login | `src/pages/auth/LoginPage.jsx` | `loginSchema` |
| User creation | `src/pages/admin/UserManagement.jsx` | `userCreateSchema` |
| Food entry | `src/pages/klien/FoodEntry.jsx` (or FoodEntryForm component) | `foodEntrySchema` |
| Body measurement | `src/components/measurement/MeasurementForm.jsx` | `bodyMeasurementSchema` |
| Bulk import | `src/pages/admin/ImportData.jsx` | `userCreateSchema` per row |

### Acceptance Criteria

- [ ] `zod` added to `package.json` dependencies
- [ ] `src/lib/validators.js` created with all schemas
- [ ] Login, user creation, food entry, and measurement forms validate before API call
- [ ] Validation errors shown as toast or inline (not raw Supabase errors)
- [ ] No regression in existing form behavior
- [ ] Schemas match database constraints (role enum, numeric ranges, etc.)

### Negative Scenarios

| # | Scenario | Input | Expected Result |
|---|----------|-------|-----------------|
| N1 | Invalid email on login | `email: "not-an-email"` | Validation error: "Format email tidak valid"; no API call |
| N2 | Short password | `password: "123"` | Validation error: "Kata sandi minimal 6 karakter" |
| N3 | Empty food name | `nama_makanan: ""` | Validation error: "Nama makanan wajib diisi" |
| N4 | Negative food quantity | `jumlah: -3` | Validation error: "Jumlah harus lebih dari 0" |
| N5 | Extreme food quantity | `jumlah: 99999` | Validation error: "Jumlah terlalu besar" |
| N6 | Invalid role in user creation | `role: "superadmin"` | Validation error (Zod enum mismatch); no API call |
| N7 | Malformed date | `tgl_lahir: "21-04-2026"` (DD-MM-YYYY instead of YYYY-MM-DD) | Validation error: "Format: YYYY-MM-DD" |
| N8 | Body weight out of range | `berat_badan: 600` | Validation error (max 500); no API call |
| N9 | Body fat > 100% | `massa_lemak: 150` | Validation error (max 100) |
| N10 | Valid Indonesian food name | `nama_makanan: "Rendang Padang"` | Passes validation; API call proceeds |
| N11 | Empty food entry submission | Submit with 0 food items | Validation error: "Minimal 1 makanan" |
| N12 | XSS in text field | `nama: "<script>alert(1)</script>"` | Passes Zod (string validation only); React escapes on render; CSP blocks execution |

---

## Task 9 -- Dependency Audit (Low)

**Severity:** Low
**Layer:** Ops
**Estimated effort:** 30 minutes - 1 hour

### Problem

No evidence of regular dependency auditing. Transitive dependencies may contain known vulnerabilities.

### Implementation

```bash
npm audit
npm audit --production
npm audit fix        # auto-fix where possible
npm audit fix --force # only if auto-fix is insufficient and impact is understood
```

If vulnerabilities remain after `fix`:
1. Check if the vulnerability is in a dev-only dependency (lower risk)
2. Check if the vulnerable code path is actually exercised
3. Pin to a safe version or find an alternative package

### Acceptance Criteria

- [ ] `npm audit --production` reports 0 critical and 0 high vulnerabilities
- [ ] `npm run build` succeeds after any upgrades
- [ ] `npm run dev` starts without errors
- [ ] Results documented (even if "0 vulnerabilities found")

---

## Task 10 -- Sanitize Error Output (Low)

**Severity:** Low
**Layer:** Frontend
**Files:** `src/hooks/useAuth.jsx`, `src/lib/openai.js`
**Estimated effort:** 1 hour

### Problem

`console.error(error)` in `useAuth.jsx` logs raw Supabase error objects to the browser console. On a shared tablet, anyone opening DevTools can see table names, column names, and RLS policy details.

### Implementation

**Step 1 -- Create a production-safe logger utility in `src/lib/logger.js`:**

```javascript
export function logError(context, error) {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error)
  } else {
    console.error(`[${context}] An error occurred.`)
  }
}
```

**Step 2 -- Replace raw `console.error` calls:**

In `useAuth.jsx`:
```javascript
import { logError } from '@/lib/logger'

// Replace: console.error(error)
// With:    logError('useAuth', error)
```

**Step 3 -- Audit user-facing error messages:**

Ensure Supabase error messages shown in toasts are mapped to generic Indonesian messages rather than raw API strings.

### Acceptance Criteria

- [ ] `src/lib/logger.js` created
- [ ] All `console.error` calls in `useAuth.jsx` use the logger
- [ ] In production builds (`npm run build && npm run preview`), no raw error objects in console
- [ ] Development mode retains full error details
- [ ] User-facing toasts show Indonesian messages, not internal errors

### Negative Scenarios

| # | Scenario | Action | Expected Result |
|---|----------|--------|-----------------|
| N1 | RLS error in production | Profile query fails due to RLS on production build | Console shows `[useAuth] An error occurred.` (no table/column names leaked) |
| N2 | RLS error in development | Same failure in dev mode | Console shows full error object with details for debugging |
| N3 | Network error toast | Supabase is unreachable | User sees "Terjadi kesalahan. Silakan coba lagi." -- not `FetchError: Failed to fetch` |
| N4 | OpenAI error toast | Edge Function returns 502 | User sees Indonesian error message, not raw OpenAI API error string |
| N5 | DevTools inspection on tablet | Someone opens DevTools on a shared hospital tablet | No sensitive schema info visible in console |

---

## Task 11 -- Audit Staff Write Access to `food_logs` (Low)

**Severity:** Low
**Layer:** Database
**File:** `supabase/schema.sql`
**Estimated effort:** 30 minutes

### Problem

Staff have `for select` on `food_logs` and `food_log_items`, but `for all` on `profiles`. Need to verify the intended access pattern is correctly implemented and that no unintended write path exists for staff on food data.

### Implementation

1. Review all RLS policies on `food_logs` and `food_log_items`
2. Test as an `ahli_gizi` user:
   ```sql
   -- Should this work or fail?
   insert into food_logs (user_id, tanggal, waktu_makan) values ('<klien_id>', '2026-04-21', 'pagi');
   ```
3. Based on findings:
   - If staff should NOT write food data: confirm `for select` is the only staff policy on these tables
   - If staff SHOULD write food data (e.g. data entry on behalf of client): add an explicit `for all` staff policy and document it

### Acceptance Criteria

- [ ] Staff access to `food_logs` and `food_log_items` is verified and documented
- [ ] If a gap exists, it is fixed with appropriate policy + comment

---

## Task 12 -- Audit `anon` Role Grants (Low)

**Severity:** Low
**Layer:** Database
**File:** `supabase/schema.sql` line 255-258
**Estimated effort:** 30 minutes

### Problem

The `anon` Postgres role has `usage on schema public`. This is required by Supabase's architecture for the PostgREST gateway, but should be documented to prevent future policy mistakes.

### Implementation

1. Verify that every RLS policy requires `auth.uid()` or `auth.role() = 'authenticated'`
2. Test as anonymous (no JWT):
   ```bash
   curl https://<supabase-url>/rest/v1/profiles \
     -H "apikey: <anon-key>"
   # Should return empty array or 401, not data
   ```
3. Add a comment block in `schema.sql` above the grant lines:

```sql
-- GRANTS
-- The `anon` role requires schema usage for Supabase PostgREST to function,
-- but all RLS policies require auth.uid() or authenticated role.
-- No table data is accessible without a valid JWT.
-- Audit date: YYYY-MM-DD
```

### Acceptance Criteria

- [ ] Confirmed that no table returns data for unauthenticated requests
- [ ] Comment documenting `anon` grant rationale added to `schema.sql`
- [ ] Audit date recorded

---

## Definition of Done (Sprint 3)

- All five tasks have passing acceptance criteria
- Zod is installed and integrated into all major forms
- `npm audit --production` is clean
- Error output is verified in a production build
- RLS audit findings are documented in `schema.sql` comments
- All changes committed and deployed to Vercel preview
