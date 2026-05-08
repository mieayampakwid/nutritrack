import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, TrendingUp, Calendar, Activity, Utensils, Circle } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { VitalMetricCard } from '@/components/participants/VitalMetricCard'
import { ProgressTimeline } from '@/components/participants/ProgressTimeline'
import { SectionScrollCards } from '@/components/participants/SectionScrollCards'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useMeasurements } from '@/hooks/useMeasurement'
import { useFoodLogsForUser } from '@/hooks/useFoodLog'
import { getBMICategoryAsiaPacific } from '@/lib/bmiCalculator'
import { supabase } from '@/lib/supabase'
import { useMemo, useState } from 'react'
import { differenceInYears, format } from 'date-fns'

export function ParticipantDetail() {
  const { id } = useParams()
  const [selectedMetric, setSelectedMetric] = useState('berat_badan')

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

  const { data: measurements = [], isLoading: loadingM } = useMeasurements(id, Boolean(id))
  const { data: logs = [], isLoading: loadingL } = useFoodLogsForUser(id, Boolean(id))

  const lastMeasurement = useMemo(() => {
    if (!measurements.length) return null
    return [...measurements].sort((a, b) => {
      const dateCompare = b.tanggal.localeCompare(a.tanggal)
      if (dateCompare !== 0) return dateCompare
      // Secondary sort by created_at for same tanggal
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    })[0]
  }, [measurements])

  const ageYears = useMemo(() => {
    if (!client?.tgl_lahir) return null
    const birth = new Date(String(client.tgl_lahir).slice(0, 10))
    if (isNaN(birth.getTime())) return null
    return differenceInYears(new Date(), birth)
  }, [client])

  const sexLabel =
    client?.jenis_kelamin === 'male'
      ? 'Laki-laki'
      : client?.jenis_kelamin === 'female'
        ? 'Perempuan'
        : '—'

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
            <Button variant="outline" asChild>
              <Link to="/gizi/my-group">Kembali</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      {/* Back Navigation */}
      <div className="mb-6">
        <Link
          to="/gizi/my-group"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke kelompok
        </Link>
      </div>

      {/* Client Hero */}
      <div className="mb-8 border-b border-border/60 pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {client.nama}
            </h1>
            <p className="mt-2 text-sm text-foreground/70 sm:text-base">
              {ageYears != null ? `${ageYears} tahun` : ''} • {sexLabel}
              {lastMeasurement?.tanggal && (
                <span> • Terakhir diperbarui {format(new Date(lastMeasurement.tanggal), 'd MMM yyyy')}</span>
              )}
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link to={`/gizi/participants/${id}/assessment`}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Data
            </Link>
          </Button>
        </div>
      </div>

      {/* Vital Metrics Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <VitalMetricCard
          label="Berat Badan"
          value={lastMeasurement?.berat_badan}
          unit="kg"
          icon={<Activity className="h-5 w-5" />}
          trend={measurements.length > 1 ? calculateTrend(measurements, 'berat_badan') : null}
        />
        <VitalMetricCard
          label="BMI"
          value={lastMeasurement?.bmi}
          unit=""
          icon={<TrendingUp className="h-5 w-5" />}
          category={lastMeasurement?.bmi ? getBMICategoryAsiaPacific(lastMeasurement.bmi).label : null}
          trend={measurements.length > 1 ? calculateTrend(measurements, 'bmi') : null}
        />
        <VitalMetricCard
          label="Massa Otot"
          value={lastMeasurement?.massa_otot}
          unit="kg"
          icon={<Activity className="h-5 w-5" />}
        />
        <VitalMetricCard
          label="Massa Lemak"
          value={lastMeasurement?.massa_lemak}
          unit="%"
          icon={<Activity className="h-5 w-5" />}
        />
        <VitalMetricCard
          label="Lingkar Perut"
          value={lastMeasurement?.lingkar_pinggang}
          unit="cm"
          icon={<Circle className="h-5 w-5" />}
          trend={measurements.length > 1 ? calculateTrend(measurements, 'lingkar_pinggang') : null}
        />
      </div>

      {/* Progress Timeline */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Perkembangan</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/gizi/participants/${id}/change-log`}>Lihat Semua</Link>
          </Button>
        </div>
        <ProgressTimeline
          measurements={measurements}
          selectedMetric={selectedMetric}
          onMetricChange={setSelectedMetric}
        />
      </div>

      {/* Section Cards */}
      <SectionScrollCards
        participantId={id}
        measurements={measurements}
        foodLogs={logs}
        loadingMeasurements={loadingM}
        loadingFoodLogs={loadingL}
      />
    </AppShell>
  )
}

function calculateTrend(measurements, metric) {
  if (measurements.length < 2) return null
  const sorted = [...measurements].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
  const latest = sorted[sorted.length - 1][metric]
  const previous = sorted[sorted.length - 2][metric]
  if (latest == null || previous == null) return null
  const change = ((latest - previous) / previous) * 100
  return change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
}
