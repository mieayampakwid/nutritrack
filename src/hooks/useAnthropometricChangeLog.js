import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useAnthropometricChangeLog(userId, enabled = true) {
  return useQuery({
    queryKey: ['anthropometric_change_log', userId],
    enabled: Boolean(userId) && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('anthropometric_change_log')
        .select('*')
        .eq('user_id', userId)
        .order('changed_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}
