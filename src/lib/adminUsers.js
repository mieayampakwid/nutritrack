export const ROLE_LABELS = {
  admin: 'Admin',
  ahli_gizi: 'Ahli gizi',
  klien: 'Klien',
}

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role
}

/** Client-side list chunk size on the admin user directory. */
export const USERS_PAGE_SIZE = 10
