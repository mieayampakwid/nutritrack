import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useAdminGroups() {
  return useQuery({
    queryKey: ['admin_groups'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_list_groups')
      if (error) throw error
      return data ?? []
    },
  })
}
