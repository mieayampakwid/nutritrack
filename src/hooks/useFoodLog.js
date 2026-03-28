import { useQuery } from '@tanstack/react-query'
import { toIsoDateLocal } from '@/lib/format'
import { supabase } from '@/lib/supabase'

/** Second arg: `enabled` or `{ enabled, recentDays }` to limit rows to the last N calendar days. */
export function useFoodLogsForUser(userId, enabledOrOptions = true) {
  const options =
    typeof enabledOrOptions === 'boolean'
      ? { enabled: enabledOrOptions, recentDays: undefined }
      : {
          enabled: enabledOrOptions.enabled ?? true,
          recentDays: enabledOrOptions.recentDays,
        }
  const { enabled, recentDays } = options
  const scoped = recentDays != null && recentDays > 0

  return useQuery({
    queryKey: ['food_logs', userId, scoped ? recentDays : 'all'],
    enabled: Boolean(userId) && enabled,
    queryFn: async () => {
      let q = supabase.from('food_logs').select('*').eq('user_id', userId)
      if (scoped) {
        const start = new Date()
        start.setDate(start.getDate() - (recentDays - 1))
        const minTanggal = toIsoDateLocal(start)
        if (minTanggal) q = q.gte('tanggal', minTanggal)
      }
      const { data, error } = await q.order('tanggal', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useFoodUnits() {
  return useQuery({
    queryKey: ['food_units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_units')
        .select('*')
        .order('nama')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useFoodNameSuggestions() {
  return useQuery({
    queryKey: ['food_name_suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_name_suggestions')
        .select('nama_makanan, frekuensi')
        .limit(200)
      if (error) throw error
      return data ?? []
    },
  })
}

/** Slots that already have a log today (for entry form UX; does not block re-saving). */
export function useTodayFoodLogSlots(userId) {
  const today = new Date().toISOString().slice(0, 10)
  return useQuery({
    queryKey: ['food_logs_today_slots', userId, today],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('waktu_makan')
        .eq('user_id', userId)
        .eq('tanggal', today)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useFoodLogItems(logIds, enabled = true) {
  return useQuery({
    queryKey: ['food_log_items', logIds],
    enabled: enabled && logIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_log_items')
        .select('*')
        .in('food_log_id', logIds)
      if (error) throw error
      return data ?? []
    },
  })
}
