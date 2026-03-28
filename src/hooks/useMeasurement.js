import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useMeasurements(userId, enabled = true) {
  return useQuery({
    queryKey: ['measurements', userId],
    enabled: Boolean(userId) && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('user_id', userId)
        .order('tanggal', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}
