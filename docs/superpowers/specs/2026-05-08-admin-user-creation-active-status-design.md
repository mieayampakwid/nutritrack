# Admin User Creation: Active Status Fix

**Date:** 2026-05-08
**Status:** Approved
**Branch:** `fix/user-creation-anomaly`

## Problem Statement

When an admin creates a new user through the admin panel, the user's `is_active` status is set to `false` (Pending). This is inconsistent with the admin's intent — by explicitly creating a user, the admin has already approved them. The newly created user appears with a "Pending" badge and requires a second manual approval action.

## Current Behavior

1. Admin creates user via "Tambah pengguna" form in `UserManagement.jsx`
2. `supabase.auth.signUp()` is called, which triggers a database function
3. Database trigger sets `is_active = false` for all new users (line: `v_is_active := false`)
4. Additional calls to update phone (Edge Function) and birth date (profiles update)
5. User appears in admin list with "Pending" badge
6. Admin must manually click approve button to set `is_active = true`

## Root Cause

The database trigger in `supabase/schema.sql` unconditionally sets `is_active = false`:

```sql
v_is_active := false;
```

This applies to both self-registered users (correct) and admin-created users (incorrect).

## Proposed Solution

Create a dedicated Supabase RPC function `admin_create_user` that handles admin user creation as an atomic operation with `is_active = true`.

### Database Function

```sql
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
  v_result json;
begin
  -- Verify caller is admin
  if (select role from profiles where id = auth.uid()) != 'admin' then
    return json_build_object('error', 'Unauthorized: admin role required');
  end if;

  -- Create auth user
  insert into auth.users (email, encrypted_password, email_confirmed_at)
  values (
    p_email,
    crypt(p_password, gen_salt('bf')),
    now()
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
    p_tgl_lahir::date,
    p_instalasi,
    true  -- Admin-created users are active
  );

  return json_build_object(
    'success', true,
    'user_id', v_user_id
  );
end;
$$;

-- Grant execute to authenticated users
grant execute on function admin_create_user to authenticated;
```

### Frontend Changes

In `src/pages/admin/UserManagement.jsx`, replace the multi-step `createMutation`:

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
    if (data?.error) throw new Error(data.error)
    
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

## Implementation Checklist

- [ ] Create SQL migration file for `admin_create_user` function
- [ ] Update `UserManagement.jsx` to use new RPC function
- [ ] Remove unused Edge Function call (`admin-update-user-phone`)
- [ ] Remove unused profile update for `tgl_lahir`
- [ ] Test: Admin creates user → appears as "Approved"
- [ ] Test: Self-registration → still creates "Pending" users
- [ ] Test: Non-admin attempts RPC → returns error

## Benefits

1. **Security**: Admin-only access enforced at database level
2. **Atomicity**: Single transaction, no race conditions
3. **Simplicity**: Replaces 3 separate operations with 1 RPC call
4. **Maintainability**: Clear separation between self-registration and admin creation
5. **Consistency**: Admin intent matches system behavior

## Out of Scope

- Existing pending users will remain unchanged (fix-forward approach)
- No bulk activation of existing users
- Database trigger for self-registration remains unchanged
