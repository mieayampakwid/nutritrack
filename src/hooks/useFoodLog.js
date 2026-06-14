import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toIsoDateLocal } from '@/lib/format'
import { supabase } from '@/lib/supabase'

/**
 * Second arg: `enabled` or options:
 * - `recentDays` — last N calendar days through today
 * - `dateFrom` / `dateTo` — inclusive YYYY-MM-DD (takes precedence over `recentDays`)
 * - `staleTime` — optional ms for react-query
 */
export function useFoodLogsForUser(userId, enabledOrOptions = true) {
  const options =
    typeof enabledOrOptions === 'boolean'
      ? { enabled: enabledOrOptions, recentDays: undefined, dateFrom: undefined, dateTo: undefined }
      : {
          enabled: enabledOrOptions.enabled ?? true,
          recentDays: enabledOrOptions.recentDays,
          dateFrom: enabledOrOptions.dateFrom,
          dateTo: enabledOrOptions.dateTo,
          staleTime: enabledOrOptions.staleTime,
        }
  const { enabled, recentDays, dateFrom, dateTo, staleTime } = options
  const scopedRange = Boolean(dateFrom || dateTo)
  const scopedRecent = !scopedRange && recentDays != null && recentDays > 0

  return useQuery({
    queryKey: [
      'food_logs',
      userId,
      scopedRange ? 'range' : scopedRecent ? recentDays : 'all',
      dateFrom ?? '',
      dateTo ?? '',
    ],
    enabled: Boolean(userId) && enabled,
    ...(staleTime !== undefined ? { staleTime } : {}),
    queryFn: async () => {
      let q = supabase.from('food_logs').select('*').eq('user_id', userId)
      if (scopedRange) {
        if (dateFrom) q = q.gte('tanggal', dateFrom)
        if (dateTo) q = q.lte('tanggal', dateTo)
      } else if (scopedRecent) {
        const start = new Date()
        start.setDate(start.getDate() - (recentDays - 1))
        const minTanggal = toIsoDateLocal(start)
        if (minTanggal) q = q.gte('tanggal', minTanggal)
      }
      const { data, error } = await q
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })
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

export function useDeleteFoodLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ logId, userId, foodName }) => {
      const { error: logError } = await supabase
        .from('food_log_deletions')
        .insert({ user_id: userId, food_log_id: logId, food_name: foodName })
      if (logError) throw logError
      const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', logId)
      if (error) throw error
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ['food_logs', userId] })
      qc.invalidateQueries({ queryKey: ['food_entry_dates'] })
      toast.success('Entri log berhasil dihapus.')
    },
    onError: (error) => {
      toast.error(error.message ?? 'Gagal menghapus entri.')
    },
  })
}
