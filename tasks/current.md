# Current tasks

## Status: Done

### Branch: `fix/user-creation-anomaly`

### What was done
- Fixed anomaly where admin-created users appeared as "Pending" instead of "Approved"
- Created `admin_activate_user` RPC function in Supabase to set `is_active=true`
- Updated `UserManagement.jsx` to save/restore admin session around `signUp()` calls
- Flow: `signUp()` → restore admin session → `admin_activate_user` RPC → update phone/tgl_lahir

### Key decisions
- Used hybrid approach (signUp + RPC) instead of direct auth.users INSERT because PostgreSQL's `crypt()` produces bcrypt hashes incompatible with Supabase Auth's Go-based verification
- `admin_activate_user` uses `jwt_is_staff()` for authorization (consistent with existing admin functions)
- Admin session is saved before signUp and restored immediately after, before any admin-only calls

### Next steps
- Merge PR to main
- Clean up any remaining test users from debugging (user_dummy2 already deleted)
