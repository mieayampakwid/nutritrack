import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export function useMealTemplates(userId) {
  return useQuery({
    queryKey: ['meal_templates', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_templates')
        .select('*, meal_template_items(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateMealTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, nama, items }) => {
      const { data: row, error: parentErr } = await supabase
        .from('meal_templates')
        .insert({ user_id: userId, nama })
        .select()
        .single()
      if (parentErr) throw parentErr

      const childRows = items.map((i) => ({
        meal_template_id: row.id,
        nama_makanan: i.nama_makanan,
        jumlah: i.jumlah,
        unit_id: i.unit_id,
        unit_nama: i.unit_nama,
        kalori_estimasi: i.kalori_estimasi,
      }))
      const { error: childErr } = await supabase
        .from('meal_template_items')
        .insert(childRows)
      if (childErr) throw childErr
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ['meal_templates', userId] })
    },
  })
}

export function useDeleteMealTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ templateId }) => {
      const { error } = await supabase
        .from('meal_templates')
        .delete()
        .eq('id', templateId)
      if (error) throw error
    },
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: ['meal_templates', userId] })
      toast.success('Template berhasil dihapus.')
    },
    onError: (error) => {
      toast.error(error.message ?? 'Gagal menghapus template.')
    },
  })
}
