import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useUserEvaluations(userId, enabled = true) {
  return useQuery({
    queryKey: ['user_evaluations', userId],
    enabled: Boolean(userId) && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_evaluations')
        .select('*')
        .eq('user_id', userId)
        .order('date_to', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

