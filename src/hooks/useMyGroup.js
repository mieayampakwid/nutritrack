import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useMyGroup() {
  return useQuery({
    queryKey: ['my_group'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_group')
      if (error) throw error
      return data
    },
  })
}
