-- Migration: admin_activate_user RPC function
-- Activates a user profile so admin-created users skip approval

create function admin_activate_user(p_user_id uuid)
returns json
  security definer
  set search_path = public
language plpgsql
AS $$
begin
  if not public.jwt_is_staff() then
    return json_build_object('error', 'Unauthorized: staff role required');
  end if;

  update profiles set is_active = true where id = p_user_id;

  return json_build_object('success', true);
end;
$$;

-- Grant execute to authenticated users
grant execute on function admin_activate_user to authenticated;

-- Add comment for documentation
comment on function admin_activate_user is 'Activates a user profile. Only accessible by staff.';
