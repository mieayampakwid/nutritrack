# Group Management — Admin Maps Nutritionists to Clients

## Summary

Allow admin to create named groups that assign one nutritionist (ahli_gizi) to multiple clients (klien). Nutritionists can read all clients but only manage those in their own group. Admin retains full oversight.

## Business Rules

- One group per nutritionist (enforced by unique constraint)
- One group per client (enforced by unique constraint)
- No limit on group size
- Groups hold only a name — no additional metadata
- Admin: full CRUD on all groups and members
- Nutritionist: read all clients, manage (write) only own group's members
- Client: no access to group data

## Database Schema

### New tables

```sql
create table public.groups (
  id uuid default gen_random_uuid() primary key,
  nama text not null,
  ahli_gizi_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create unique index groups_ahli_gizi_uniq on public.groups(ahli_gizi_id);

create table public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  klien_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz default now(),
  constraint unique_klien unique(klien_id)
);
```

### RLS Policies

**`groups` table:**
- `groups_admin` — admin: full CRUD (`for all using (public.jwt_is_staff())`, scoped to admin only)
- `groups_ahli_gizi_read` — nutritionists: SELECT only
- No client access

**`group_members` table:**
- `group_members_admin` — admin: full CRUD
- `group_members_ahli_gizi_read` — nutritionists: SELECT all
- `group_members_ahli_gizi_manage_own` — nutritionists: INSERT/UPDATE/DELETE where `group_id` matches their own group

### RPC Functions

- `admin_list_groups()` — returns groups with nutritionist name and member count
- `admin_get_group_detail(p_group_id)` — returns group with full member list
- `get_my_group()` — returns the calling nutritionist's own group with members

### Data Access Impact

Existing write operations by nutritionists (data entry, evaluations) on tables like `food_logs`, `body_measurements`, `assessments`, `user_evaluations` should be scoped to their own group's members. Read access to all clients remains unchanged. Enforced via RLS on the write-side tables.

## Frontend — Admin

### New route

`/admin/groups` in `App.jsx`, wrapped with `RequireAuth roles={['admin']}`

### Page: AdminGroups.jsx

Card layout matching existing admin pages (e.g., UserManagement.jsx):
- Header: "Kelola Grup" with description and "Tambah Grup" button
- Table: group name, nutritionist name, member count, action buttons (edit/delete)
- Responsive: mobile cards + desktop table
- Search/filter by group name or nutritionist

### Modals

- **Create Group** — form: group name (text), select nutritionist (dropdown of ahli_gizi not already in a group), save
- **Edit Group** — same form pre-filled + member management section
- **Manage Members** — list of current members with remove button, search/add client (dropdown of klien not in any group)

### Hooks

- `useAdminGroups()` — query `admin_list_groups()` RPC
- `useAdminGroupDetail(groupId)` — query `admin_get_group_detail()` RPC
- `useCreateGroup()`, `useUpdateGroup()`, `useDeleteGroup()` — mutations with query invalidation

## Frontend — Nutritionist

### Navigation update

Add "Grup Saya" link to nutritionist sidebar/nav.

### New route

`/gizi/my-group` wrapped with `RequireAuth roles={['ahli_gizi']}`

### Page: GiziMyGroup.jsx

Read-only view:
- Group name and assigned clients
- Client list with links to `/gizi/clients/:id`
- No edit capabilities — only admin manages groups
- Empty state when not yet assigned: message to contact admin

### Hooks

- `useMyGroup()` — query `get_my_group()` RPC, enabled only for ahli_gizi role

## Error Handling

- Toast notifications on all mutations (existing pattern)
- Validate uniqueness before submit: nutritionist already in a group, client already in a group — clear Indonesian error messages
- Delete group: cascade with confirmation dialog (removes all member associations)
- All-or-nothing: group creation with member assignment in a single RPC call

## Testing

- Unit tests for hooks: `useAdminGroups`, `useMyGroup`, mutations
- Integration test: create group → assign members → verify list
- RLS tests: nutritionist can only manage own group members, client has no access to groups

## Edge Cases

- Nutritionist deactivated: group stays intact, admin can reassign via edit
- Client deactivated: remains in group but filtered from display
- Nutritionist not yet in a group: "Grup Saya" shows empty state with contact-admin message
