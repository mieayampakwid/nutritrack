export function getInitials(nama) {
  const t = String(nama ?? '').trim()
  if (!t) return '?'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return t.slice(0, 2).toUpperCase()
}

export function profileDisplayName(profile) {
  return profile?.nama?.trim() || profile?.email?.split('@')[0] || 'Pengguna'
}
