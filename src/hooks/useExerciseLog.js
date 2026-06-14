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
export function useExerciseLogsForUser(userId, enabledOrOptions = true) {
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
      'exercise_logs',
      userId,
      scopedRange ? 'range' : scopedRecent ? recentDays : 'all',
      dateFrom ?? '',
      dateTo ?? '',
    ],
    enabled: Boolean(userId) && enabled,
    ...(staleTime !== undefined ? { staleTime } : {}),
    queryFn: async () => {
      let q = supabase.from('exercise_logs').select('*').eq('user_id', userId)
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

export function useDeleteExerciseLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ logId, userId, jenisOlahraga }) => {
      const { error: delError } = await supabase
        .from('exercise_log_deletions')
        .insert({ user_id: userId, exercise_log_id: logId, jenis_olahraga: jenisOlahraga })
      if (delError) throw delError
      const { error } = await supabase
        .from('exercise_logs')
        .delete()
        .eq('id', logId)
      if (error) throw error
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ['exercise_logs', userId] })
      toast.success('Entri log berhasil dihapus.')
    },
    onError: (error) => {
      toast.error(error.message ?? 'Gagal menghapus entri.')
    },
  })
}

