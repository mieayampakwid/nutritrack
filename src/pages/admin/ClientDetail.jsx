import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MeasurementForm } from '@/components/measurement/MeasurementForm'
import { MeasurementChart } from '@/components/measurement/MeasurementChart'
import { FoodLogTable } from '@/components/food/FoodLogTable'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useFoodLogsForUser } from '@/hooks/useFoodLog'
import { useMeasurements } from '@/hooks/useMeasurement'
import { supabase } from '@/lib/supabase'
import { useMemo, useState } from 'react'
import { ExerciseLogHistoryCard } from '@/components/exercise/ExerciseLogHistoryCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { differenceInYears } from 'date-fns'
import { formatDateId, formatNumberId, parseIsoDateLocal } from '@/lib/format'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'
import { ClientNutritionSummaryCard } from '@/components/clients/ClientNutritionSummaryCard'

export function ClientDetail() {
  const { id } = useParams()
  const loc = useLocation()
  const { profile: staff } = useAuth()
  const listPath = loc.pathname.startsWith('/admin') ? '/admin/clients' : '/gizi/clients'

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
    return [...measurements].sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0]
  }, [measurements])

  const ageYears = useMemo(() => {
    if (!client?.tgl_lahir) return null
    const birth = parseIsoDateLocal(String(client.tgl_lahir).slice(0, 10))
    if (!birth) return null
    return differenceInYears(new Date(), birth)
  }, [client])

  const sexLabel =
    client?.jenis_kelamin === 'male'
      ? 'Laki-laki'
      : client?.jenis_kelamin === 'female'
        ? 'Perempuan'
        : '—'

  const [metric, setMetric] = useState('berat_badan')

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
        <p className="text-muted-foreground">Klien tidak ditemukan.</p>
        <Button asChild variant="link" className="mt-2 px-0">
          <Link to={listPath}>Kembali</Link>
        </Button>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="mb-4 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button variant="ghost" size="sm" asChild className="w-full justify-start gap-2 sm:w-auto sm:justify-center">
          <Link to={listPath}>
            <ArrowLeft className="h-4 w-4" />
            Kembali ke daftar
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="w-full justify-start sm:w-auto sm:justify-center">
          <Link to={`${listPath}/${id}/data-entry`}>Entri data (BMI &amp; asesmen)</Link>
        </Button>
        <Button variant="outline" size="sm" asChild className="w-full justify-start sm:w-auto sm:justify-center">
          <Link to={`${listPath}/${id}/change-log`}>Riwayat perubahan antropometri</Link>
        </Button>
      </div>

      <ClientNutritionSummaryCard profile={client} className="mb-6" />

      <Card className={cn('mb-6 md:rounded-xl', MOBILE_DASHBOARD_CARD_SHELL)}>
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-medium">Ringkasan profil</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Umur</dt>
              <dd className="font-medium tabular-nums">{ageYears != null ? `${ageYears} tahun` : '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Jenis kelamin</dt>
              <dd className="font-medium">{sexLabel}</dd>
            </div>
            <div className="flex justify-between gap-2 sm:col-span-2">
              <dt className="text-muted-foreground">Lingkar pinggang (pengukuran terakhir)</dt>
              <dd className="font-medium tabular-nums">
                {lastMeasurement?.lingkar_pinggang != null
                  ? `${formatNumberId(lastMeasurement.lingkar_pinggang)} cm`
                  : '—'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Tabs defaultValue="antro">
        <TabsList>
          <TabsTrigger value="antro">Antropometri</TabsTrigger>
          <TabsTrigger value="makan">Log makan</TabsTrigger>
          <TabsTrigger value="olahraga">Log olahraga</TabsTrigger>
        </TabsList>
        <TabsContent value="antro" className="space-y-6 mt-4">
          <MeasurementForm
            targetUserId={id}
            staffId={staff?.id}
            clientProfile={client}
            lastMeasurement={lastMeasurement}
          />
          <Card className={cn('md:rounded-xl', MOBILE_DASHBOARD_CARD_SHELL)}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-sm font-medium">Grafik</CardTitle>
                <Select value={metric} onValueChange={setMetric}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="berat_badan">Berat badan</SelectItem>
                    <SelectItem value="bmi">BMI</SelectItem>
                    <SelectItem value="massa_otot">Massa otot</SelectItem>
                    <SelectItem value="massa_lemak">Massa lemak</SelectItem>
                    <SelectItem value="lingkar_pinggang">Lingkar pinggang</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingM ? (
                <LoadingSpinner />
              ) : (
                <MeasurementChart measurements={measurements} metric={metric} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="makan" className="mt-4">
          {loadingL ? <LoadingSpinner /> : <FoodLogTable logs={logs} />}
        </TabsContent>
        <TabsContent value="olahraga" className="mt-4">
          <ExerciseLogHistoryCard userId={id} />
        </TabsContent>
      </Tabs>

      <Card className={cn('mt-8 overflow-hidden', MOBILE_DASHBOARD_CARD_SHELL)}>
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base">Riwayat pengukuran</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">BB (kg)</TableHead>
                  <TableHead className="text-right">TB (cm)</TableHead>
                  <TableHead className="text-right">BMI</TableHead>
                  <TableHead className="text-right">Otot</TableHead>
                  <TableHead className="text-right">Lemak %</TableHead>
                  <TableHead className="text-right">LP (cm)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...measurements]
                  .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
                  .map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{formatDateId(m.tanggal)}</TableCell>
                      <TableCell className="text-right">{formatNumberId(m.berat_badan)}</TableCell>
                      <TableCell className="text-right">{formatNumberId(m.tinggi_badan)}</TableCell>
                      <TableCell className="text-right">{formatNumberId(m.bmi)}</TableCell>
                      <TableCell className="text-right">{formatNumberId(m.massa_otot)}</TableCell>
                      <TableCell className="text-right">{formatNumberId(m.massa_lemak)}</TableCell>
                      <TableCell className="text-right">{formatNumberId(m.lingkar_pinggang)}</TableCell>
                    </TableRow>
                  ))}
                {measurements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Belum ada data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}
