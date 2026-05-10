import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useMeasurements(userId, optionsOrEnabled = true) {
  const options =
    typeof optionsOrEnabled === 'boolean'
      ? { enabled: optionsOrEnabled, dateFrom: undefined, dateTo: undefined }
      : {
          enabled: optionsOrEnabled.enabled ?? true,
          dateFrom: optionsOrEnabled.dateFrom,
          dateTo: optionsOrEnabled.dateTo,
        }
  const { enabled, dateFrom, dateTo } = options

  return useQuery({
    queryKey: ['assessments', userId, { dateFrom, dateTo }],
    enabled: Boolean(userId) && enabled,
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase.from('assessments').select('*').eq('user_id', userId)
      if (dateFrom) q = q.gte('tanggal', dateFrom)
      if (dateTo) q = q.lte('tanggal', dateTo)
      q = q.order('tanggal', { ascending: true }).order('created_at', { ascending: true })
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
  })
}
