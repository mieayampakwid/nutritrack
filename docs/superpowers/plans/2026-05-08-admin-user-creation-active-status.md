# Admin User Creation Active Status Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-created users should have `is_active = true` (Approved status) instead of requiring manual approval.

**Architecture:** Create a Supabase RPC function `admin_create_user` that atomically creates auth user and profile with `is_active = true`. Replace the multi-step user creation flow in the admin panel with a single RPC call.

**Tech Stack:** Supabase PostgreSQL (RPC function), React Query mutations, existing Supabase client

---

## File Structure

**Files to create:**
- `supabase/migrations/20260508_admin_create_user_function.sql` - Database migration for the RPC function

**Files to modify:**
- `src/pages/admin/UserManagement.jsx:107-169` - Replace `createMutation` to use RPC function

---

### Task 1: Create SQL Migration for RPC Function

**Files:**
- Create: `supabase/migrations/20260508_admin_create_user_function.sql`

- [ ] **Step 1: Create the migration file with the RPC function**

```sql
-- Migration: admin_create_user RPC function
-- This function allows admins to create users with is_active=true
-- Replaces the multi-step signup + edge function + profile update flow

create function admin_create_user(
  p_email text,
  p_password text,
  p_nama text,
  p_role text,
  p_phone text default null,
  p_tgl_lahir text default null,
  p_instalasi text default null
) returns json
  security definer
  set search_path = public
language plpgsql
$$
declare
  v_user_id uuid;
  v_existing_user uuid;
  v_profile_role text;
begin
  -- Verify caller is authenticated
  if auth.uid() is null then
    return json_build_object('error', 'Unauthorized: not authenticated');
  end if;

  -- Verify caller is admin
  select role into v_profile_role from profiles where id = auth.uid();
  if v_profile_role != 'admin' then
    return json_build_object('error', 'Unauthorized: admin role required');
  end if;

  -- Check if user already exists
  select id into v_existing_user
  from auth.users
  where email = p_email;

  if v_existing_user is not null then
    return json_build_object('error', 'User with this email already exists');
  end if;

  -- Create auth user
  insert into auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
  values (
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object(
      'nama', p_nama,
      'role', p_role,
      'phone', coalesce(p_phone, ''),
      'tgl_lahir', coalesce(p_tgl_lahir, ''),
      'instalasi', coalesce(p_instalasi, '')
    )
  )
  returning id into v_user_id;

  -- Create profile with is_active = true
  insert into profiles (id, email, nama, role, phone, tgl_lahir, instalasi, is_active)
  values (
    v_user_id,
    p_email,
    p_nama,
    p_role,
    p_phone,
    case
      when p_tgl_lahir ~ '^\d{4}-\d{2}-\d{2}$' then p_tgl_lahir::date
      else null
    end,
    p_instalasi,
    true  -- Admin-created users are active
  );

  return json_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email
  );
end;
$$;

-- Grant execute to authenticated users
grant execute on function admin_create_user to authenticated;

-- Add comment for documentation
comment on function admin_create_user is 'Creates a new user with active status. Only accessible by admins.';
```

- [ ] **Step 2: Commit the migration file**

```bash
git add supabase/migrations/20260508_admin_create_user_function.sql
git commit -m "feat: add admin_create_user RPC function

Creates users with is_active=true for admin-created accounts.
Replaces multi-step signup flow with single atomic operation.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Update UserManagement.jsx to Use RPC Function

**Files:**
- Modify: `src/pages/admin/UserManagement.jsx:107-169`

- [ ] **Step 1: Replace the createMutation implementation**

Find the `createMutation` definition (lines 107-169) and replace it with:

```javascript
  const createMutation = useMutation({
    mutationFn: async () => {
      const result = userCreateSchema.safeParse(form)
      if (!result.success) {
        throw new Error(result.error.issues[0].message)
      }
      const pw = form.password || randomPassword()

      const { data, error } = await supabase.rpc('admin_create_user', {
        p_email: form.email.trim(),
        p_password: pw,
        p_nama: form.nama.trim(),
        p_role: form.role,
        p_phone: form.phone.trim() || null,
        p_tgl_lahir: form.tgl_lahir.trim() || null,
        p_instalasi: form.instalasi.trim() || null,
      })

      if (error) throw error
      if (data && typeof data === 'object' && data.error) {
        throw new Error(String(data.error))
      }

      return { password: pw }
    },
    onSuccess: ({ password }) => {
      toast.success('Pengguna dibuat.')
      setOpenPw(password)
      qc.invalidateQueries({ queryKey: ['profiles_admin'] })
      qc.invalidateQueries({ queryKey: ['client_directory'] })
      setForm({
        nama: '',
        email: '',
        phone: '',
        tgl_lahir: '',
        instalasi: '',
        role: 'klien',
        password: '',
      })
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal membuat pengguna.')
    },
  })
```

- [ ] **Step 2: Remove unused imports (if present)**

Check if there are any imports that were only used for the old flow. The `admin-update-user-phone` Edge Function reference should now be unused. Look for any unused imports after the change and remove them. (In this case, no imports need to be removed as `supabase` and `toast` are still used.)

- [ ] **Step 3: Run the linter to check for issues**

```bash
npm run lint
```

Expected: No linting errors

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 5: Commit the changes**

```bash
git add src/pages/admin/UserManagement.jsx
git commit -m "refactor: use admin_create_user RPC for user creation

Replaces multi-step signup + edge function + profile update with
single RPC call. Admin-created users now have is_active=true.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Apply Migration to Database

**Files:**
- Database (Supabase)

- [ ] **Step 1: Apply the migration to your Supabase project**

Run the migration in Supabase SQL Editor or via Supabase CLI:

**Option A - Via Supabase Dashboard:**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Paste the contents of `supabase/migrations/20260508_admin_create_user_function.sql`
5. Run the query

**Option B - Via Supabase CLI (if configured):**
```bash
supabase db push
```

Expected output: Success message confirming function creation

- [ ] **Step 2: Verify the function was created**

Run this query in Supabase SQL Editor:

```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'admin_create_user';
```

Expected: One row returned with `admin_create_user` as `routine_name`

---

### Task 4: Manual Testing

**Files:**
- None (manual testing in browser)

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Login as admin and navigate to user management**

1. Open browser to `http://localhost:5174`
2. Login with admin credentials
3. Navigate to `/admin/users`

- [ ] **Step 3: Create a new user via admin panel**

1. Click "Tambah pengguna" button
2. Fill in the form:
   - Nama: Test User
   - Email: test@example.com
   - Phone: +628123456789
   - Tanggal lahir: 1990-01-01
   - Instalasi: Test Instalasi
   - Peran: klien
3. Click "Simpan"
4. Copy the temporary password

Expected: Success toast "Pengguna dibuat." and password dialog appears

- [ ] **Step 4: Verify the user appears as "Approved"**

1. Look at the user list for the newly created user
2. Check the status badge

Expected: Green "Approved" badge (NOT red "Pending" badge)

- [ ] **Step 5: Verify the user can login**

1. Open an incognito/private browser window
2. Navigate to `http://localhost:5174/login`
3. Login with the newly created user's email and temporary password
4. Verify user is redirected to their dashboard (not the approval pending page)

Expected: User can login and access their dashboard

- [ ] **Step 6: Verify self-registration still creates pending users**

1. Logout
2. Navigate to `/register`
3. Create a new account via self-registration
4. Check the admin user list

Expected: Self-registered user appears with red "Pending" badge

---

### Task 5: Update Documentation

**Files:**
- Modify: `README.md` (if it documents Edge Functions)
- Modify: `AGENTS.md` (if it documents user creation patterns)

- [ ] **Step 1: Check if README.md documents the admin-update-user-phone Edge Function**

Read `README.md` and search for references to `admin-update-user-phone`.

If found, add a note that this Edge Function is deprecated for admin user creation (but may still be used elsewhere):

```markdown
> **Note:** The `admin-update-user-phone` Edge Function is no longer used for admin user creation.
> New admin-created users should use the `admin_create_user` RPC function instead.
```

If not found, no change needed.

- [ ] **Step 2: Check if AGENTS.md documents user creation patterns**

Read `AGENTS.md` and search for user creation or admin user management patterns.

If it documents the old multi-step approach, update it to reference the new RPC function:

```markdown
## Admin User Creation

Admin-created users should use the `admin_create_user` RPC function:

\`\`\`javascript
const { data, error } = await supabase.rpc('admin_create_user', {
  p_email: email,
  p_password: password,
  p_nama: name,
  p_role: role,
  // ... optional fields
})
\`\`\`

This ensures admin-created users have `is_active=true` and don't require manual approval.
```

If not found, no change needed.

- [ ] **Step 3: Commit documentation updates (if any changes made)**

```bash
git add README.md AGENTS.md
git commit -m "docs: update user creation documentation

Note that admin_create_user RPC function is now used for
admin user creation instead of multi-step flow.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

If no documentation updates were needed, skip this step.

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ RPC function `admin_create_user` created with admin role check
- ✅ Function sets `is_active = true` for admin-created users
- ✅ Frontend updated to use RPC instead of multi-step flow
- ✅ Testing steps included
- ✅ Documentation updates addressed

**Placeholder Scan:**
- ✅ No TBDs or TODOs
- ✅ All code blocks are complete
- ✅ All steps include actual content
- ✅ No "similar to Task N" references

**Type Consistency:**
- ✅ RPC parameter names consistent (p_email, p_password, etc.)
- ✅ Frontend uses same parameter names as RPC function
- ✅ Variable names consistent throughout

---

## Completion

After all tasks are complete:
1. All tests pass
2. Manual testing confirms admin-created users are "Approved"
3. Self-registration still creates "Pending" users
4. Documentation is updated (if applicable)
5. All changes committed to `fix/user-creation-anomaly` branch

Ready for code review and merge to main.
