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
import { formatDateId, formatNumberId } from '@/lib/format'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'
import { ClientNutritionSummaryCard } from '@/components/clients/ClientNutritionSummaryCard'

export function ClientDetail() {
  const { id } = useParams()
  const loc = useLocation()
  const { profile: staff } = useAuth()
  const listPath = loc.pathname.startsWith('/admin') ? '/admin/clients' : '/gizi/clients'
  const staffBase = loc.pathname.startsWith('/admin') ? '/admin' : '/gizi'

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
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link to={listPath}>
            <ArrowLeft className="h-4 w-4" />
            Kembali ke daftar
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to={`${listPath}/${id}/data-entry`}>Entri data (BMI &amp; asesmen)</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to={`${staffBase}/bmi/${id}`}>BMI</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to={`${staffBase}/calorie-needs/${id}`}>Kebutuhan energi</Link>
        </Button>
      </div>

      <ClientNutritionSummaryCard profile={client} className="mb-6" />

      <Tabs defaultValue="antro">
        <TabsList>
          <TabsTrigger value="antro">Antropometri</TabsTrigger>
          <TabsTrigger value="makan">Log makan</TabsTrigger>
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
                    </TableRow>
                  ))}
                {measurements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
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
