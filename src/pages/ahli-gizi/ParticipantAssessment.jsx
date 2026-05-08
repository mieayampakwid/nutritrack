import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { AssessmentForm } from '@/components/participants/AssessmentForm'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export function ParticipantAssessment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { session } = useAuth()

  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ['profile', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
  })

  const { data: lastAssessment } = useQuery({
    queryKey: ['assessments', id, 'last'],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', id)
        .order('tanggal', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (assessmentData) => {
      const { data, error } = await supabase
        .from('assessments')
        .insert({
          user_id: id,
          created_by: session?.user?.id,
          ...assessmentData,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments', id] })
      queryClient.invalidateQueries({ queryKey: ['profile', id] })
      toast.success('Asesmen berhasil disimpan.')
      navigate(`/gizi/participants/${id}`)
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal menyimpan asesmen.')
    },
  })

  if (loadingClient || !id) {
    return (
      <AppShell>
        <LoadingSpinner />
      </AppShell>
    )
  }

  if (!client) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl px-4 py-12">
          <p className="text-center text-muted-foreground">Peserta tidak ditemukan.</p>
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              Kembali
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mb-6">
        <Link
          to={`/gizi/participants/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke detail peserta
        </Link>
      </div>

      <div className="mb-8 border-b border-border/60 pb-8">
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          Asesmen Klien
        </h1>
        <p className="mt-2 text-sm text-foreground/70 sm:text-base">
          {client.nama} • {client.jenis_kelamin === 'male' ? 'Laki-laki' : 'Perempuan'}
        </p>
      </div>

      <AssessmentForm
        client={client}
        lastAssessment={lastAssessment}
        onSave={saveMutation.mutate}
        isSaving={saveMutation.isPending}
      />
    </AppShell>
  )
}
