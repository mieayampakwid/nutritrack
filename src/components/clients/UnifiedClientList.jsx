import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, Plus, Search, Upload, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { FoodLogTable } from '@/components/food/FoodLogTable'
import { MeasurementChart } from '@/components/measurement/MeasurementChart'
import { MeasurementForm } from '@/components/measurement/MeasurementForm'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { BmiClientForm } from '@/pages/staff/BmiStandalonePage'
import { CalorieClientForm } from '@/pages/staff/CalorieNeedsStandalonePage'
import { useAuth } from '@/hooks/useAuth'
import { useFoodLogsForUser } from '@/hooks/useFoodLog'
import { useMeasurements } from '@/hooks/useMeasurement'
import { USERS_PAGE_SIZE } from '@/lib/adminUsers'
import { getInitials } from '@/lib/profileDisplay'
import { compareIsoDates } from '@/lib/foodLogRange'
import { formatDateId, formatDisplayName, formatNumberId, toIsoDateLocal } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'
import { AdminUserListSection } from '@/components/admin/AdminUserListSection'

const CLIENT_PAGE_SIZE = USERS_PAGE_SIZE
const MEAS_HISTORY_PAGE = 8
const EVAL_HISTORY_PAGE = 8
const TAB_STORAGE = 'nutritrack_unified_client_tab'
const VALID_TABS = new Set(['profil', 'antro', 'evaluasi', 'log', 'bmi'])

function readTabMap() {
  try {
    const raw = sessionStorage.getItem(TAB_STORAGE)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeTabForClient(clientId, tab) {
  const m = { ...readTabMap(), [clientId]: tab }
  sessionStorage.setItem(TAB_STORAGE, JSON.stringify(m))
}

function tabForClient(clientId) {
  const t = readTabMap()[clientId]
  return VALID_TABS.has(t) ? t : 'profil'
}

function randomPassword() {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join('')
}

function waDisplay(p) {
  return p?.nomor_wa || p?.phone_whatsapp || '—'
}

function ExpandedProfil({
  clientId,
  isAdmin,
  staffId,
  onDirtyChange,
  onSaved,
}) {
  const qc = useQueryClient()
  const { data: row, isLoading } = useQuery({
    queryKey: ['profile', clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', clientId).single()
      if (error) throw error
      return data
    },
  })

  const [draft, setDraft] = useState(null)
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    if (row) {
      setDraft({
        nama: row.nama ?? '',
        email: row.email ?? '',
        nomor_wa: row.nomor_wa ?? '',
        phone_whatsapp: row.phone_whatsapp ?? '',
        instalasi: row.instalasi ?? '',
        jenis_kelamin: row.jenis_kelamin ?? '',
        tgl_lahir: row.tgl_lahir ? String(row.tgl_lahir).slice(0, 10) : '',
      })
    }
  }, [row])

  useEffect(() => {
    if (!isAdmin || !row || !draft) {
      onDirtyChange(false)
      return
    }
    const same =
      (draft.nama ?? '') === (row.nama ?? '') &&
      (draft.email ?? '') === (row.email ?? '') &&
      (draft.nomor_wa ?? '') === (row.nomor_wa ?? '') &&
      (draft.phone_whatsapp ?? '') === (row.phone_whatsapp ?? '') &&
      (draft.instalasi ?? '') === (row.instalasi ?? '') &&
      (draft.jenis_kelamin ?? '') === (row.jenis_kelamin ?? '') &&
      (draft.tgl_lahir ?? '') === (row.tgl_lahir ? String(row.tgl_lahir).slice(0, 10) : '')
    onDirtyChange(!same)
  }, [draft, row, isAdmin, onDirtyChange])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Data belum siap.')
      const email = draft.email.trim().toLowerCase()
      const { data: clash, error: e0 } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .neq('id', clientId)
        .maybeSingle()
      if (e0) throw e0
      if (clash) {
        setEmailError('Email sudah dipakai akun lain.')
        throw new Error('Email sudah dipakai akun lain.')
      }
      setEmailError('')
      const tgl = (draft.tgl_lahir ?? '').trim()
      const { error } = await supabase
        .from('profiles')
        .update({
          nama: draft.nama.trim(),
          email: email,
          nomor_wa: draft.nomor_wa.trim() || null,
          phone_whatsapp: draft.phone_whatsapp.trim() || null,
          instalasi: draft.instalasi.trim() || null,
          jenis_kelamin: draft.jenis_kelamin === 'male' || draft.jenis_kelamin === 'female' ? draft.jenis_kelamin : null,
          tgl_lahir: tgl && /^\d{4}-\d{2}-\d{2}$/.test(tgl) ? tgl : null,
        })
        .eq('id', clientId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Profil disimpan.')
      qc.invalidateQueries({ queryKey: ['profile', clientId] })
      qc.invalidateQueries({ queryKey: ['staff_clients_unified'] })
      onDirtyChange(false)
      onSaved?.()
    },
    onError: (e) => toast.error(e.message ?? 'Gagal menyimpan.'),
  })

  const toggleActive = useMutation({
    mutationFn: async (activate) => {
      const { error } = await supabase.from('profiles').update({ is_active: activate }).eq('id', clientId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Status akun diperbarui.')
      qc.invalidateQueries({ queryKey: ['profile', clientId] })
      qc.invalidateQueries({ queryKey: ['staff_clients_unified'] })
      onSaved?.()
    },
    onError: (e) => toast.error(e.message ?? 'Gagal memperbarui status.'),
  })

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', clientId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Akun dinonaktifkan.')
      qc.invalidateQueries({ queryKey: ['profile', clientId] })
      qc.invalidateQueries({ queryKey: ['staff_clients_unified'] })
      onSaved?.()
    },
    onError: (e) => toast.error(e.message ?? 'Gagal menonaktifkan.'),
  })

  const resetEmailMutation = useMutation({
    mutationFn: async () => {
      const email = (row?.email ?? '').trim()
      if (!email) throw new Error('Email klien tidak ada.')
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Email reset kata sandi telah dikirim ke alamat klien.')
    },
    onError: (e) => toast.error(e.message ?? 'Gagal mengirim email reset.'),
  })

  if (isLoading || !row) {
    return (
      <div className="grid gap-3 rounded-xl border border-dashed border-border/70 bg-muted/15 p-4 sm:grid-cols-2">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md sm:col-span-2" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <dl className="grid gap-4 rounded-xl border border-border/60 bg-muted/10 p-4 text-sm sm:grid-cols-2 sm:p-5">
        <div className="space-y-1">
          <dt className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Nama</dt>
          <dd className="font-medium text-foreground">{formatDisplayName(row.nama) || row.nama}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Email</dt>
          <dd className="break-all text-foreground">{row.email ?? '—'}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-sm font-medium uppercase tracking-wide text-muted-foreground">WhatsApp</dt>
          <dd className="text-foreground">{waDisplay(row)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Instalasi</dt>
          <dd className="text-foreground">{row.instalasi ?? '—'}</dd>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <dt className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Status</dt>
          <dd className="text-foreground">{row.is_active === false ? 'Nonaktif' : 'Aktif'}</dd>
        </div>
      </dl>
    )
  }

  if (!draft) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Nama</Label>
          <Input value={draft.nama} onChange={(e) => setDraft((d) => ({ ...d, nama: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Email</Label>
          <Input
            type="email"
            value={draft.email}
            onChange={(e) => {
              setDraft((d) => ({ ...d, email: e.target.value }))
              setEmailError('')
            }}
          />
          {emailError ? <p className="text-xs text-destructive">{emailError}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">WhatsApp</Label>
          <Input value={draft.nomor_wa} onChange={(e) => setDraft((d) => ({ ...d, nomor_wa: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">WA resume (opsional)</Label>
          <Input
            value={draft.phone_whatsapp}
            onChange={(e) => setDraft((d) => ({ ...d, phone_whatsapp: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-sm font-medium text-muted-foreground">Instalasi</Label>
          <Input value={draft.instalasi} onChange={(e) => setDraft((d) => ({ ...d, instalasi: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Tanggal lahir</Label>
          <Input type="date" value={draft.tgl_lahir} onChange={(e) => setDraft((d) => ({ ...d, tgl_lahir: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Jenis kelamin</Label>
          <Select
            value={draft.jenis_kelamin || '__none'}
            onValueChange={(v) => setDraft((d) => ({ ...d, jenis_kelamin: v === '__none' ? '' : v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">—</SelectItem>
              <SelectItem value="male">Laki-laki</SelectItem>
              <SelectItem value="female">Perempuan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-4">
        <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          Simpan profil
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={toggleActive.isPending}
          onClick={() => toggleActive.mutate(row.is_active === false)}
        >
          {row.is_active === false ? 'Aktifkan akun' : 'Nonaktifkan akun'}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={resetEmailMutation.isPending} onClick={() => resetEmailMutation.mutate()}>
          Kirim email reset kata sandi
        </Button>
      </div>

      {staffId && clientId === staffId ? (
        <p className="text-sm text-destructive">Tindakan penonaktifan untuk akun Anda sendiri tidak diizinkan.</p>
      ) : (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={deactivateMutation.isPending}
          onClick={() => {
            if (window.confirm('Nonaktifkan akun klien ini?')) deactivateMutation.mutate()
          }}
        >
          Nonaktifkan klien
        </Button>
      )}
    </div>
  )
}

function ExpandedAntro({ clientId, staffId }) {
  const { data: client } = useQuery({
    queryKey: ['profile', clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', clientId).single()
      if (error) throw error
      return data
    },
  })
  const { data: measurements = [], isLoading } = useMeasurements(clientId, Boolean(clientId))
  const [metric, setMetric] = useState('berat_badan')
  const [histPage, setHistPage] = useState(1)

  const lastMeasurement = useMemo(() => {
    if (!measurements.length) return null
    return [...measurements].sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0]
  }, [measurements])

  const sortedMeas = useMemo(
    () => [...measurements].sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    [measurements],
  )
  const measPages = Math.max(1, Math.ceil(sortedMeas.length / MEAS_HISTORY_PAGE))
  const measSafe = Math.min(histPage, measPages)
  const measSlice = sortedMeas.slice((measSafe - 1) * MEAS_HISTORY_PAGE, measSafe * MEAS_HISTORY_PAGE)

  if (isLoading && !client) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <MeasurementForm
        targetUserId={clientId}
        staffId={staffId}
        clientProfile={client}
        lastMeasurement={lastMeasurement}
      />
      <Card className={cn('md:rounded-xl', MOBILE_DASHBOARD_CARD_SHELL)}>
        <CardHeader className="flex flex-wrap items-center gap-3">
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
        </CardHeader>
        <CardContent>{isLoading ? <LoadingSpinner /> : <MeasurementChart measurements={measurements} metric={metric} />}</CardContent>
      </Card>

      <Card className={cn('overflow-hidden', MOBILE_DASHBOARD_CARD_SHELL)}>
        <CardHeader className="border-b py-3">
          <CardTitle className="text-base">Riwayat pengukuran</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">BB</TableHead>
                  <TableHead className="text-right">TB</TableHead>
                  <TableHead className="text-right">BMI</TableHead>
                  <TableHead className="text-right">Otot</TableHead>
                  <TableHead className="text-right">Lemak</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {measSlice.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{formatDateId(m.tanggal)}</TableCell>
                    <TableCell className="text-right">{formatNumberId(m.berat_badan)}</TableCell>
                    <TableCell className="text-right">{formatNumberId(m.tinggi_badan)}</TableCell>
                    <TableCell className="text-right">{formatNumberId(m.bmi)}</TableCell>
                    <TableCell className="text-right">{formatNumberId(m.massa_otot)}</TableCell>
                    <TableCell className="text-right">{formatNumberId(m.massa_lemak)}</TableCell>
                  </TableRow>
                ))}
                {sortedMeas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Belum ada riwayat pengukuran.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          {measPages > 1 ? (
            <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
              <span>
                Halaman {measSafe} / {measPages}
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" disabled={measSafe <= 1} onClick={() => setHistPage((p) => p - 1)}>
                  Sebelumnya
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={measSafe >= measPages}
                  onClick={() => setHistPage((p) => p + 1)}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function ExpandedEvaluasi({ clientId, staffId, onDirtyChange }) {
  const qc = useQueryClient()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState(() => toIsoDateLocal(new Date()))
  const [exerciseFreq, setExerciseFreq] = useState('')
  const [sleepEnough, setSleepEnough] = useState('')
  const [vegTimesPerDay, setVegTimesPerDay] = useState('')
  const [usageNotes, setUsageNotes] = useState('')
  const [bmi, setBmi] = useState('')
  const [histPage, setHistPage] = useState(1)

  const { dateFrom: df, dateTo: dt } = useMemo(() => {
    let a = dateFrom
    let b = dateTo
    if (a && b && compareIsoDates(a, b) > 0) {
      ;[a, b] = [b, a]
    }
    return { dateFrom: a, dateTo: b }
  }, [dateFrom, dateTo])
  const rangeReady = Boolean(df && dt)

  useEffect(() => {
    const dirty =
      exerciseFreq.trim() !== '' ||
      sleepEnough !== '' ||
      vegTimesPerDay.trim() !== '' ||
      usageNotes.trim() !== '' ||
      bmi.trim() !== ''
    onDirtyChange(dirty)
  }, [exerciseFreq, sleepEnough, vegTimesPerDay, usageNotes, bmi, onDirtyChange])

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['user_evaluations', clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_evaluations')
        .select('*')
        .eq('user_id', clientId)
        .order('date_to', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const sortedHist = useMemo(() => [...history], [history])
  const histPages = Math.max(1, Math.ceil(sortedHist.length / EVAL_HISTORY_PAGE))
  const histSafe = Math.min(histPage, histPages)
  const histSlice = sortedHist.slice((histSafe - 1) * EVAL_HISTORY_PAGE, histSafe * EVAL_HISTORY_PAGE)

  const saveEvaluation = useMutation({
    mutationFn: async () => {
      if (!rangeReady) throw new Error('Isi rentang tanggal evaluasi.')
      const veg = vegTimesPerDay === '' ? null : Number(vegTimesPerDay)
      const bmiNum = bmi === '' ? null : Number(bmi)
      if (veg != null && (!Number.isFinite(veg) || veg < 0)) {
        throw new Error('Konsumsi sayur harus angka ≥ 0.')
      }
      if (bmiNum != null && (!Number.isFinite(bmiNum) || bmiNum <= 0)) {
        throw new Error('BMI harus angka > 0.')
      }
      const payload = {
        user_id: clientId,
        date_from: df,
        date_to: dt,
        exercise_freq: exerciseFreq.trim() || null,
        sleep_enough: sleepEnough === '' ? null : sleepEnough === 'yes',
        veg_times_per_day: veg,
        usage_notes: usageNotes.trim() || null,
        bmi: bmiNum,
        created_by: staffId ?? null,
      }
      const { error } = await supabase.from('user_evaluations').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Evaluasi disimpan.')
      qc.invalidateQueries({ queryKey: ['user_evaluations', clientId] })
      setExerciseFreq('')
      setSleepEnough('')
      setVegTimesPerDay('')
      setUsageNotes('')
      setBmi('')
      onDirtyChange(false)
    },
    onError: (e) => toast.error(e.message ?? 'Gagal menyimpan evaluasi.'),
  })

  return (
    <div className="space-y-6">
      <Card className={cn('md:rounded-xl', MOBILE_DASHBOARD_CARD_SHELL)}>
        <CardHeader>
          <CardTitle className="text-base">Evaluasi rutin</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              saveEvaluation.mutate()
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-muted-foreground">Tanggal mulai</Label>
                <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Mulai" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-muted-foreground">Tanggal selesai</Label>
                <DatePicker value={dateTo} onChange={(v) => setDateTo(v || toIsoDateLocal(new Date()))} placeholder="Selesai" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-muted-foreground">Frekuensi olahraga</Label>
                <Input value={exerciseFreq} onChange={(e) => setExerciseFreq(e.target.value)} placeholder="Contoh: 3x/minggu" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-muted-foreground">Istirahat cukup</Label>
                <Select value={sleepEnough} onValueChange={setSleepEnough}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Ya</SelectItem>
                    <SelectItem value="no">Tidak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-muted-foreground">Konsumsi sayur (kali/hari)</Label>
                <Input inputMode="decimal" value={vegTimesPerDay} onChange={(e) => setVegTimesPerDay(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-muted-foreground">BMI</Label>
                <Input inputMode="decimal" value={bmi} onChange={(e) => setBmi(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">Catatan konsumsi / pemakaian</Label>
              <Textarea rows={3} value={usageNotes} onChange={(e) => setUsageNotes(e.target.value)} />
            </div>
            <Button type="submit" size="sm" disabled={!rangeReady || saveEvaluation.isPending}>
              Simpan evaluasi
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className={cn('overflow-hidden', MOBILE_DASHBOARD_CARD_SHELL)}>
        <CardHeader className="border-b py-3">
          <CardTitle className="text-base">Riwayat evaluasi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-10">
              <LoadingSpinner />
            </div>
          ) : sortedHist.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada evaluasi tersimpan.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Periode</TableHead>
                      <TableHead>Olahraga</TableHead>
                      <TableHead className="text-right">BMI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {histSlice.map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDateId(ev.date_from)} — {formatDateId(ev.date_to)}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs">{ev.exercise_freq ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{ev.bmi != null ? formatNumberId(ev.bmi) : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {histPages > 1 ? (
                <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-xs">
                  <span className="text-muted-foreground">
                    Halaman {histSafe} / {histPages}
                  </span>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={histSafe <= 1} onClick={() => setHistPage((p) => p - 1)}>
                      Sebelumnya
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={histSafe >= histPages}
                      onClick={() => setHistPage((p) => p + 1)}
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ExpandedLogMakan({ clientId }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState(() => toIsoDateLocal(new Date()))
  const { dateFrom, dateTo } = useMemo(() => {
    let a = from
    let b = to
    if (a && b && compareIsoDates(a, b) > 0) {
      ;[a, b] = [b, a]
    }
    return { dateFrom: a, dateTo: b }
  }, [from, to])
  const rangeReady = Boolean(dateFrom && dateTo)
  const { data: logs = [], isLoading, isError, refetch } = useFoodLogsForUser(clientId, {
    enabled: Boolean(clientId) && rangeReady,
    dateFrom,
    dateTo,
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Dari</Label>
          <DatePicker value={from} onChange={setFrom} placeholder="Mulai" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">Sampai</Label>
          <DatePicker value={to} onChange={(v) => setTo(v || toIsoDateLocal(new Date()))} placeholder="Selesai" />
        </div>
      </div>
      {!rangeReady ? (
        <p className="text-sm text-muted-foreground">Pilih rentang tanggal untuk memuat log makan.</p>
      ) : isLoading ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">
          Gagal memuat log.
          <Button type="button" variant="outline" size="sm" className="ml-3" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada entri log pada rentang ini.</p>
      ) : (
        <FoodLogTable logs={logs} pageSize={10} embedded />
      )}
    </div>
  )
}

function ExpandedBmiKalori({ clientId, listBase, clientsListPath }) {
  return (
    <div className="space-y-8">
      <BmiClientForm clientId={clientId} listBase={listBase} clientsListPath={clientsListPath} embedded />
      <Separator />
      <CalorieClientForm clientId={clientId} listBase={listBase} clientsListPath={clientsListPath} embedded />
    </div>
  )
}

/**
 * @param {{ linkPrefix: string; staffBase: '/admin' | '/gizi'; isAdmin: boolean }} props
 */
export function UnifiedClientList({ linkPrefix, staffBase, isAdmin }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile: staff } = useAuth()
  const qc = useQueryClient()
  const adminListPengguna = isAdmin && searchParams.get('list') === 'pengguna'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [detailClientId, setDetailClientId] = useState(null)
  const [activeTab, setActiveTab] = useState('profil')
  const [profilDirty, setProfilDirty] = useState(false)
  const [evalDirty, setEvalDirty] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [addForm, setAddForm] = useState({
    nama: '',
    email: '',
    password: '',
    nomor_wa: '',
    phone_whatsapp: '',
    instalasi: '',
  })

  const {
    data: clients = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['staff_clients_unified'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nama, email, nomor_wa, phone_whatsapp, instalasi, is_active, role')
        .eq('role', 'klien')
        .order('nama')
      if (error) throw error
      return data ?? []
    },
  })

  const filtered = useMemo(() => {
    let rows = clients
    if (statusFilter === 'active') rows = rows.filter((c) => c.is_active !== false)
    if (statusFilter === 'inactive') rows = rows.filter((c) => c.is_active === false)
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (c) =>
        (c.nama || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.instalasi || '').toLowerCase().includes(q) ||
        (c.nomor_wa || '').toLowerCase().includes(q) ||
        (c.phone_whatsapp || '').toLowerCase().includes(q),
    )
  }, [clients, search, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / CLIENT_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const slice = useMemo(() => {
    const start = (safePage - 1) * CLIENT_PAGE_SIZE
    return filtered.slice(start, start + CLIENT_PAGE_SIZE)
  }, [filtered, safePage])

  useEffect(() => {
    const id = searchParams.get('client')
    const tab = searchParams.get('tab')
    if (!id) {
      setDetailClientId(null)
      return
    }
    if (!clients.some((c) => c.id === id)) return
    setDetailClientId(id)
    if (VALID_TABS.has(tab)) {
      setActiveTab(tab)
      writeTabForClient(id, tab)
    } else {
      setActiveTab(tabForClient(id))
    }
  }, [searchParams, clients])

  const syncUrl = useCallback(
    (id, tab) => {
      const next = new URLSearchParams(searchParams)
      if (id) {
        next.set('client', id)
        if (tab) next.set('tab', tab)
      } else {
        next.delete('client')
        next.delete('tab')
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const requestTabChange = useCallback(
    (nextTab) => {
      if (activeTab === 'profil' && profilDirty) {
        if (!window.confirm('Profil belum disimpan. Ganti tab?')) return
        setProfilDirty(false)
      }
      if (activeTab === 'evaluasi' && evalDirty) {
        if (!window.confirm('Evaluasi belum disimpan. Ganti tab?')) return
        setEvalDirty(false)
      }
      setActiveTab(nextTab)
      if (detailClientId) {
        writeTabForClient(detailClientId, nextTab)
        syncUrl(detailClientId, nextTab)
      }
    },
    [activeTab, profilDirty, evalDirty, detailClientId, syncUrl],
  )

  const closeDetail = useCallback(() => {
    if (profilDirty || evalDirty) {
      if (!window.confirm('Ada perubahan yang belum disimpan. Tutup jendela ini?')) return
      setProfilDirty(false)
      setEvalDirty(false)
    }
    setDetailClientId(null)
    syncUrl(null)
  }, [profilDirty, evalDirty, syncUrl])

  const openDetail = useCallback(
    (id) => {
      if (detailClientId === id) return
      if (detailClientId && (profilDirty || evalDirty)) {
        if (!window.confirm('Ada perubahan yang belum disimpan. Buka klien lain?')) return
        setProfilDirty(false)
        setEvalDirty(false)
      }
      setDetailClientId(id)
      const t = tabForClient(id)
      setActiveTab(t)
      syncUrl(id, t)
    },
    [detailClientId, profilDirty, evalDirty, syncUrl],
  )

  const createClient = useMutation({
    mutationFn: async () => {
      const pw = addForm.password.trim() || randomPassword()
      const { data, error } = await supabase.auth.signUp({
        email: addForm.email.trim(),
        password: pw,
        options: {
          data: {
            nama: addForm.nama.trim(),
            nomor_wa: addForm.nomor_wa.trim(),
            phone_whatsapp: addForm.phone_whatsapp.trim(),
            instalasi: addForm.instalasi.trim(),
            role: 'klien',
          },
        },
      })
      if (error) throw error
      const uid = data.user?.id
      if (uid) {
        const ph = addForm.phone_whatsapp.trim()
        const { error: upErr } = await supabase
          .from('profiles')
          .update({
            phone_whatsapp: ph || null,
          })
          .eq('id', uid)
        if (upErr) throw upErr
      }
      return pw
    },
    onSuccess: (pw) => {
      toast.success('Klien dibuat.')
      setNewPw(pw)
      qc.invalidateQueries({ queryKey: ['staff_clients_unified'] })
      qc.invalidateQueries({ queryKey: ['profiles_admin'] })
      qc.invalidateQueries({ queryKey: ['client_directory'] })
      setAddForm({
        nama: '',
        email: '',
        password: '',
        nomor_wa: '',
        phone_whatsapp: '',
        instalasi: '',
      })
    },
    onError: (e) => toast.error(e.message ?? 'Gagal membuat klien.'),
  })

  const listBase = staffBase

  const detailRow = useMemo(
    () => (detailClientId ? clients.find((c) => c.id === detailClientId) : null),
    [clients, detailClientId],
  )
  const detailTitle = detailRow ? formatDisplayName(detailRow.nama) || detailRow.nama : 'Klien'

  return (
    <div className="mx-auto max-w-6xl">
      <Card className="overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-sm ring-1 ring-black/[0.04]">
        <CardContent className="p-0">
          <div className="border-b border-border/60 px-4 py-5 md:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Users className="h-5 w-5" aria-hidden />
                  </div>
                  <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                    {adminListPengguna ? 'Semua pengguna' : 'Daftar klien'}
                  </h1>
                </div>
                {isAdmin ? (
                  <div className="flex w-full max-w-md gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
                    <Button
                      type="button"
                      variant={adminListPengguna ? 'ghost' : 'default'}
                      size="sm"
                      className="h-8 flex-1"
                      onClick={() => {
                        const next = new URLSearchParams(searchParams)
                        next.delete('list')
                        next.delete('user')
                        setSearchParams(next, { replace: true })
                      }}
                    >
                      Klien
                    </Button>
                    <Button
                      type="button"
                      variant={adminListPengguna ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 flex-1"
                      onClick={() => {
                        const next = new URLSearchParams(searchParams)
                        next.set('list', 'pengguna')
                        next.delete('client')
                        next.delete('tab')
                        next.delete('user')
                        setSearchParams(next, { replace: true })
                      }}
                    >
                      Pengguna
                    </Button>
                  </div>
                ) : null}
              </div>
              {isAdmin && !adminListPengguna ? (
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <Button type="button" size="sm" className="w-full gap-2 sm:w-auto" onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Tambah klien
                  </Button>
                  <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto" asChild>
                    <Link to="/admin/import">
                      <Upload className="h-4 w-4" />
                      Impor Excel
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {adminListPengguna ? (
            <AdminUserListSection />
          ) : (
            <>
          <div className="border-b border-border/60 bg-muted/20 px-4 py-3 md:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
              <div className="relative min-w-0 flex-1 sm:max-w-md">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70"
                  aria-hidden
                />
                <Input
                  id="client-search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Cari nama, email, instalasi, WhatsApp…"
                  autoComplete="off"
                  className="h-10 border-input bg-background pl-9 shadow-sm"
                />
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                <div className="w-full space-y-1 sm:w-40">
                  <Label className="text-sm font-medium text-muted-foreground">Status akun</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                      setStatusFilter(v)
                      setPage(1)
                    }}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      <SelectItem value="active">Aktif saja</SelectItem>
                      <SelectItem value="inactive">Nonaktif saja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="shrink-0 text-xs tabular-nums text-muted-foreground sm:pb-2 sm:pl-1">
                  {filtered.length} cocok
                  {search || statusFilter !== 'all' ? ` · ${clients.length} total` : ''}
                </p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : isError ? (
            <div className="border-t border-border/60 px-4 py-12 text-center md:px-6">
              <p className="text-sm font-medium text-destructive">Gagal memuat daftar klien.</p>
              <p className="mt-1 text-xs text-muted-foreground">Periksa koneksi lalu coba lagi.</p>
              <Button type="button" variant="outline" size="sm" className="mt-5" onClick={() => refetch()}>
                Coba lagi
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="border-t border-border/60 px-4 py-14 text-center md:px-6">
              <div className="mx-auto flex max-w-sm flex-col items-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Users className="h-6 w-6 text-muted-foreground" aria-hidden />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {clients.length === 0 ? 'Belum ada klien' : 'Tidak ada yang cocok'}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {clients.length === 0
                    ? 'Tambahkan klien baru atau impor dari Excel untuk mulai.'
                    : 'Sesuaikan kata kunci pencarian atau filter status.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border border-t border-border/60 md:hidden">
                {slice.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openDetail(c.id)}
                    className={cn(
                      'flex w-full min-h-[3.25rem] items-center gap-3 bg-card px-4 py-3 text-left text-sm transition-colors',
                      'hover:bg-muted/45 active:bg-muted/60',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      detailClientId === c.id && 'bg-muted/35',
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                      {getInitials(c.nama)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="truncate font-medium text-foreground">{formatDisplayName(c.nama) || c.nama}</span>
                        {c.is_active === false ? (
                          <Badge variant="destructive" className="shrink-0 px-1.5 py-0 text-[10px]">
                            Nonaktif
                          </Badge>
                        ) : (
                          <Badge className="shrink-0 bg-primary/12 px-1.5 py-0 text-[10px] text-primary">Aktif</Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground" title={c.email}>
                        {c.email}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/80" aria-hidden />
                  </button>
                ))}
              </div>

              <div className="hidden border-t border-border/60 md:block">
                <div className="max-h-[min(70vh,720px)] overflow-auto">
                  <Table className="text-sm">
                    <TableHeader className="sticky top-0 z-[1] bg-table-header shadow-[0_1px_0_0_var(--color-table-line)]">
                      <TableRow className="border-table-line hover:bg-transparent">
                        <TableHead className="h-9 min-w-[9rem] py-2 pl-4 pr-2 text-xs font-semibold uppercase tracking-wide text-table-header-foreground md:pl-5">
                          Nama
                        </TableHead>
                        <TableHead className="h-9 min-w-[11rem] py-2 px-2 text-xs font-semibold uppercase tracking-wide text-table-header-foreground">
                          Email
                        </TableHead>
                        <TableHead className="h-9 min-w-[7rem] py-2 px-2 text-xs font-semibold uppercase tracking-wide text-table-header-foreground">
                          WhatsApp
                        </TableHead>
                        <TableHead className="h-9 min-w-[8rem] py-2 px-2 text-xs font-semibold uppercase tracking-wide text-table-header-foreground">
                          Instalasi
                        </TableHead>
                        <TableHead className="h-9 w-[6.5rem] py-2 pl-2 pr-4 text-xs font-semibold uppercase tracking-wide text-table-header-foreground md:pr-5">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slice.map((c) => (
                        <TableRow
                          key={c.id}
                          className={cn(
                            'cursor-pointer border-border/60 transition-[background,box-shadow] hover:bg-muted/40',
                            'focus-within:bg-muted/30',
                            detailClientId === c.id && 'bg-primary/[0.06] hover:bg-primary/[0.08]',
                          )}
                          onClick={() => openDetail(c.id)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              openDetail(c.id)
                            }
                          }}
                        >
                          <TableCell className="py-3 pl-4 font-medium text-foreground md:pl-5">
                            {formatDisplayName(c.nama) || c.nama}
                          </TableCell>
                          <TableCell className="max-w-[14rem] truncate text-muted-foreground" title={c.email}>
                            {c.email}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{waDisplay(c)}</TableCell>
                          <TableCell className="text-muted-foreground">{c.instalasi ?? '—'}</TableCell>
                          <TableCell className="pr-4 md:pr-5">
                            {c.is_active === false ? (
                              <Badge variant="destructive" className="font-normal">
                                Nonaktif
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-primary/10 font-normal text-primary hover:bg-primary/15">
                                Aktif
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/10 px-4 py-3 text-xs text-muted-foreground md:px-5">
                {pageCount > 1 ? (
                  <>
                    <span className="tabular-nums">
                      Halaman <span className="font-medium text-foreground">{safePage}</span> dari {pageCount}
                      <span className="mx-1.5 text-border">·</span>
                      {filtered.length} klien
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 min-w-[5.5rem]"
                        disabled={safePage <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        Sebelumnya
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 min-w-[5.5rem]"
                        disabled={safePage >= pageCount}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Berikutnya
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="w-full text-center tabular-nums md:text-left">
                    Menampilkan <span className="font-medium text-foreground">{filtered.length}</span> klien
                  </p>
                )}
              </div>
            </>
          )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(detailClientId)}
        onOpenChange={(next) => {
          if (!next) closeDetail()
        }}
      >
        <DialogContent className="flex max-h-[min(92vh,900px)] w-[calc(100%-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border-border/80 p-0 shadow-2xl sm:max-w-4xl">
          <DialogHeader className="shrink-0 space-y-3 border-b border-border/60 bg-gradient-to-b from-muted/50 to-background px-5 pb-5 pt-7 pr-14 text-left sm:px-7 sm:pr-16">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-base font-bold text-primary">
                {detailRow ? getInitials(detailRow.nama) : '?'}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <DialogTitle className="text-left text-xl font-semibold tracking-tight sm:text-2xl">
                  {detailTitle}
                </DialogTitle>
                {detailRow ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span className="truncate" title={detailRow.email}>
                      {detailRow.email}
                    </span>
                    <span className="hidden text-border sm:inline" aria-hidden>
                      ·
                    </span>
                    {detailRow.is_active === false ? (
                      <Badge variant="destructive" className="text-[10px]">
                        Nonaktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-primary/12 text-[10px] text-primary">
                        Aktif
                      </Badge>
                    )}
                  </div>
                ) : null}
                <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground [text-wrap:pretty]">
                  Kelola profil, pengukuran, evaluasi rutin, log makan, serta perhitungan BMI dan kebutuhan energi.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {detailClientId ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-7 pt-5 sm:px-7">
              <Tabs value={activeTab} onValueChange={requestTabChange} className="w-full">
                <TabsList className="mb-5 flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/70 p-1.5">
                  <TabsTrigger value="profil" className="shrink-0 rounded-lg px-3 py-2 text-sm leading-snug">
                    Profil
                  </TabsTrigger>
                  <TabsTrigger value="antro" className="shrink-0 rounded-lg px-3 py-2 text-sm leading-snug">
                    Antropometri
                  </TabsTrigger>
                  <TabsTrigger value="evaluasi" className="shrink-0 rounded-lg px-3 py-2 text-sm leading-snug">
                    Evaluasi
                  </TabsTrigger>
                  <TabsTrigger value="log" className="shrink-0 rounded-lg px-3 py-2 text-sm leading-snug">
                    Log makan
                  </TabsTrigger>
                  <TabsTrigger value="bmi" className="shrink-0 rounded-lg px-3 py-2 text-sm leading-snug">
                    BMI &amp; Kalori
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="profil" className="mt-0 outline-none">
                  {activeTab === 'profil' ? (
                    <ExpandedProfil
                      clientId={detailClientId}
                      isAdmin={isAdmin}
                      staffId={staff?.id}
                      onDirtyChange={setProfilDirty}
                      onSaved={() => qc.invalidateQueries({ queryKey: ['staff_clients_unified'] })}
                    />
                  ) : null}
                </TabsContent>
                <TabsContent value="antro" className="mt-0 outline-none">
                  {activeTab === 'antro' ? (
                    <ExpandedAntro clientId={detailClientId} staffId={staff?.id} />
                  ) : (
                    <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-muted/20 p-6">
                      <Skeleton className="h-4 w-32 max-w-[40%]" />
                      <Skeleton className="h-24 w-full rounded-lg" />
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="evaluasi" className="mt-0 outline-none">
                  {activeTab === 'evaluasi' ? (
                    <ExpandedEvaluasi clientId={detailClientId} staffId={staff?.id} onDirtyChange={setEvalDirty} />
                  ) : (
                    <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-muted/20 p-6">
                      <Skeleton className="h-4 w-32 max-w-[40%]" />
                      <Skeleton className="h-24 w-full rounded-lg" />
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="log" className="mt-0 outline-none">
                  {activeTab === 'log' ? (
                    <ExpandedLogMakan clientId={detailClientId} />
                  ) : (
                    <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-muted/20 p-6">
                      <Skeleton className="h-4 w-32 max-w-[40%]" />
                      <Skeleton className="h-24 w-full rounded-lg" />
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="bmi" className="mt-0 outline-none">
                  {activeTab === 'bmi' ? (
                    <ExpandedBmiKalori
                      clientId={detailClientId}
                      listBase={listBase}
                      clientsListPath={linkPrefix}
                    />
                  ) : (
                    <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-muted/20 p-6">
                      <Skeleton className="h-4 w-32 max-w-[40%]" />
                      <Skeleton className="h-32 w-full rounded-lg" />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o)
          if (!o) setNewPw('')
        }}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl border-border/80 sm:max-w-md">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle className="text-xl">Tambah klien</DialogTitle>
            <DialogDescription>
              Buat akun klien baru. Kata sandi dapat diisi manual atau dibiarkan kosong untuk generate otomatis.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">Nama</Label>
              <Input value={addForm.nama} onChange={(e) => setAddForm((f) => ({ ...f, nama: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">Kata sandi (opsional)</Label>
              <Input
                type="text"
                autoComplete="new-password"
                value={addForm.password}
                onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Kosongkan untuk generate otomatis"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">WhatsApp</Label>
              <Input value={addForm.nomor_wa} onChange={(e) => setAddForm((f) => ({ ...f, nomor_wa: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">WA resume (opsional)</Label>
              <Input
                value={addForm.phone_whatsapp}
                onChange={(e) => setAddForm((f) => ({ ...f, phone_whatsapp: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-muted-foreground">Instalasi</Label>
              <Input value={addForm.instalasi} onChange={(e) => setAddForm((f) => ({ ...f, instalasi: e.target.value }))} />
            </div>
            {newPw ? (
              <div className="rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-xs leading-relaxed">
                <p className="font-medium text-primary">Kata sandi sementara — simpan sekali</p>
                <p className="mt-1 break-all font-mono text-[13px] text-foreground">{newPw}</p>
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2 border-t border-border/60 pt-4 sm:gap-0">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Tutup
            </Button>
            <Button disabled={createClient.isPending} onClick={() => createClient.mutate()}>
              {createClient.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
