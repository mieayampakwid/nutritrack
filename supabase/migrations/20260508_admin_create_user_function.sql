-- Migration: admin_create_user RPC function
-- This function allows admins to create users with is_active=true
-- Replaces the multi-step signup + edge function + profile update flow

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

create function admin_create_user(
  p_email text,
  p_password text,
  p_nama text,
  p_role text,
  p_phone text default null,
  p_tgl_lahir text default null,
  p_instalasi text default null
) returns json
  volatile
  security definer
  set search_path = public, extensions, auth
language plpgsql
AS $$
declare
  v_user_id uuid;
  v_existing_user uuid;
begin
  -- Verify caller is staff (admin or ahli_gizi) using existing security function
  if not public.jwt_is_staff() then
    return json_build_object('error', 'Unauthorized: staff role required');
  end if;

  -- Validate password strength (minimum 8 characters)
  if length(p_password) < 8 then
    return json_build_object('error', 'Password must be at least 8 characters long');
  end if;

  -- Check if user already exists
  select id into v_existing_user
  from auth.users
  where email = p_email;

  if v_existing_user is not null then
    return json_build_object('error', 'User with this email already exists');
  end if;

  -- Create auth user
  insert into auth.users (email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data)
  values (
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    p_phone,
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
  insert into profiles (id, email, nama, role, tgl_lahir, instalasi, is_active)
  values (
    v_user_id,
    p_email,
    p_nama,
    p_role,
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
