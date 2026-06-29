import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export function useWaterIntakeByDate(userId, tanggal) {
  return useQuery({
    queryKey: ['water_intakes', userId, tanggal],
    enabled: Boolean(userId) && Boolean(tanggal),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('water_intakes')
        .select('*')
        .eq('user_id', userId)
        .eq('tanggal', tanggal)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAddWaterIntake(options = {}) {
  const { silent = false } = options
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, tanggal, volumeMl }) => {
      const { data, error } = await supabase
        .from('water_intakes')
        .insert({ user_id: userId, tanggal, volume_ml: volumeMl })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, { userId, tanggal }) => {
      qc.invalidateQueries({ queryKey: ['water_intakes', userId, tanggal] })
      if (!silent) toast.success('Asupan air tercatat.')
    },
    onError: (error) => {
      if (!silent) toast.error(error.message ?? 'Gagal mencatat asupan air.')
    },
  })
}

export function useDeleteWaterIntake(options = {}) {
  const { silent = false } = options
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ intakeId, userId, volumeMl, tanggal, createdAt }) => {
      const { error: auditError } = await supabase
        .from('water_intake_deletions')
        .insert({
          user_id: userId,
          water_intake_id: intakeId,
          volume_ml: volumeMl,
          tanggal,
          created_at: createdAt,
        })
      if (auditError) throw auditError
      const { error } = await supabase
        .from('water_intakes')
        .delete()
        .eq('id', intakeId)
      if (error) throw error
    },
    onSuccess: (_, { userId, tanggal }) => {
      qc.invalidateQueries({ queryKey: ['water_intakes', userId, tanggal] })
      if (!silent) toast.success('Entri asupan air dihapus.')
    },
    onError: (error) => {
      if (!silent) toast.error(error.message ?? 'Gagal menghapus entri.')
    },
  })
}
