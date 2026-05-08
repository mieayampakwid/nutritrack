import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion'
import { Dumbbell, AlertTriangle, AlertCircle, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toIsoDateLocal } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { estimateExerciseCalories } from '@/lib/openai'
import { logError } from '@/lib/logger'
import { KLIEN_DASHBOARD_LOG_CARD_SHELL } from '@/lib/pageCard'
import { KaloriValue } from '@/components/shared/KaloriValue'
import { cn } from '@/lib/utils'

function sanitizeText(s) {
  let str = String(s ?? '')
  let out = ''
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) >= 32 || str[i] === '\n' || str[i] === '\r' || str[i] === '\t') {
      out += str[i]
    }
  }
  return out.trim()
}

function normalizeText(s) {
  return sanitizeText(s)
}

const ANALYZE_STATUS_LINES = [
  'Menganalisa jenis dan intensitas olahraga…',
  'Menghitung estimasi kalori berdasarkan MET…',
  'Menyesuaikan dengan durasi yang Anda masukkan…',
  'Menyiapkan ringkasan untuk disimpan…',
]

function ExerciseAiAnalyzingPanel({ active, reduceMotion }) {
  const [lineIdx, setLineIdx] = useState(0)

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => {
      setLineIdx((i) => (i + 1) % ANALYZE_STATUS_LINES.length)
    }, 2600)
    return () => window.clearInterval(id)
  }, [active])

  const spinTransition = reduceMotion
    ? { duration: 0 }
    : { repeat: Infinity, duration: 1.05, ease: 'linear' }

  const pulseTransition = reduceMotion
    ? { duration: 0 }
    : { repeat: Infinity, duration: 1.35, ease: 'easeInOut' }

  const barTransition = reduceMotion
    ? { duration: 0 }
    : { repeat: Infinity, duration: 1.35, ease: [0.4, 0, 0.2, 1] }

  return (
    <AnimatePresence initial={false}>
      {active ? (
        <Motion.div
          key="ai-analyzing"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Menganalisa olahraga dengan AI"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-2xl border border-primary/25 bg-linear-to-br from-primary/[0.07] via-background to-teal-500/6 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset]"
        >
          {!reduceMotion ? (
            <Motion.div
              className="pointer-events-none absolute -left-1/2 top-0 h-px w-[200%] bg-linear-to-r from-transparent via-primary/40 to-transparent"
              animate={{ x: ['-30%', '30%'] }}
              transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
            />
          ) : (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/25" />
          )}
          {!reduceMotion ? (
            <Motion.div
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl"
              animate={{ opacity: [0.35, 0.65, 0.35], scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
            />
          ) : null}
          {!reduceMotion ? (
            <Motion.div
              className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-teal-500/10 blur-2xl"
              animate={{ opacity: [0.25, 0.5, 0.25] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut', delay: 0.4 }}
            />
          ) : null}

          <div className="relative flex gap-3.5 sm:gap-4">
            <div className="relative flex h-13 w-13 shrink-0 items-center justify-center sm:h-14 sm:w-14">
              <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
              <Motion.div
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/40"
                animate={reduceMotion ? {} : { rotate: 360 }}
                transition={spinTransition}
              />
              <Motion.div
                className="absolute inset-1 rounded-full border border-dashed border-primary/25"
                animate={reduceMotion ? {} : { rotate: -360 }}
                transition={{ ...spinTransition, duration: reduceMotion ? 0 : 2.1 }}
              />
              <Motion.div
                animate={
                  reduceMotion
                    ? {}
                    : { scale: [1, 1.12, 1], opacity: [0.75, 1, 0.75] }
                }
                transition={pulseTransition}
              >
                <Sparkles className="relative z-10 h-6 w-6 text-primary sm:h-7 sm:w-7" aria-hidden />
              </Motion.div>
            </div>

            <div className="min-w-0 flex-1 space-y-2 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-greeting text-sm font-semibold tracking-tight text-foreground sm:text-base">
                  Menganalisa dengan AI
                </p>
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  tunggu sebentar
                </span>
              </div>
              <div className="relative min-h-11 sm:min-h-10">
                <AnimatePresence mode="wait">
                  <Motion.p
                    key={lineIdx}
                    initial={reduceMotion ? false : { opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -6 }}
                    transition={{ duration: reduceMotion ? 0 : 0.3 }}
                    className="text-xs leading-relaxed text-muted-foreground sm:text-sm"
                  >
                    {ANALYZE_STATUS_LINES[lineIdx]}
                  </Motion.p>
                </AnimatePresence>
              </div>

              <div className="relative mt-1 h-1.5 overflow-hidden rounded-full bg-muted/80">
                {!reduceMotion ? (
                  <>
                    <Motion.div
                      className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-linear-to-r from-primary/20 via-primary to-primary/20"
                      initial={false}
                      animate={{ left: ['-40%', '100%'] }}
                      transition={barTransition}
                    />
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/25 to-transparent" />
                  </>
                ) : (
                  <div className="h-full w-full rounded-full bg-primary/40" />
                )}
              </div>
            </div>
          </div>
        </Motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function ExerciseLogEntryCard({ userId, tanggal: tanggalProp }) {
  const reduceMotion = useReducedMotion()
  const qc = useQueryClient()
  const [jenis, setJenis] = useState('')
  const [durasi, setDurasi] = useState('')
  const [jenisError, setJenisError] = useState('')
  const [durasiError, setDurasiError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const jenisTimerRef = useRef(null)
  const durasiTimerRef = useRef(null)

  const jenisOk = normalizeText(jenis).length > 0
  const durasiOk = normalizeText(durasi).length > 0
  const canAnalyze = Boolean(userId) && !analyzing && jenisOk && durasiOk

  function validateJenisOnBlur() {
    if (jenisError) return
    if (!normalizeText(jenis)) {
      setFieldError('jenis', 'Jenis olahraga wajib diisi.')
    }
  }

  function validateDurasiOnBlur() {
    if (durasiError) return
    if (!normalizeText(durasi)) {
      setFieldError('durasi', 'Durasi wajib diisi.')
    }
  }

  function setFieldError(field, msg) {
    if (field === 'jenis') {
      window.clearTimeout(jenisTimerRef.current)
      setJenisError(msg)
      if (msg) jenisTimerRef.current = window.setTimeout(() => setJenisError(''), 6000)
    } else {
      window.clearTimeout(durasiTimerRef.current)
      setDurasiError(msg)
      if (msg) durasiTimerRef.current = window.setTimeout(() => setDurasiError(''), 6000)
    }
  }

  function handleJenisChange(val) {
    setJenis(val)
    setAnalysisResult(null)
    if (jenisError) setJenisError('')
  }

  function handleDurasiChange(val) {
    setDurasi(val)
    setAnalysisResult(null)
    if (durasiError) setDurasiError('')
  }

  function classifyError(err) {
    const msg = String(err?.message ?? '').toLowerCase()
    if (msg.includes('olahraga') || msg.includes('aktivitas') || msg.includes('dikenal') || msg.includes('fisik') || msg.includes('jenis')) {
      return 'jenis'
    }
    if (msg.includes('durasi') || msg.includes('waktu') || msg.includes('satuan')) {
      return 'durasi'
    }
    return null
  }

  async function handleAnalyze() {
    const jenisVal = normalizeText(jenis)
    const durasiVal = normalizeText(durasi)

    let hasError = false
    if (!jenisVal) {
      setFieldError('jenis', 'Jenis olahraga wajib diisi.')
      hasError = true
    }
    if (!durasiVal) {
      setFieldError('durasi', 'Durasi wajib diisi.')
      hasError = true
    }
    if (hasError) return

    if (!userId) {
      toast.error('Akun belum siap. Coba muat ulang.')
      return
    }

    setAnalyzing(true)
    setJenisError('')
    setDurasiError('')
    setAnalysisResult(null)
    try {
      const result = await estimateExerciseCalories(jenisVal, durasiVal)
      setAnalysisResult({ jenis_olahraga: jenisVal, durasi: durasiVal, kalori_estimasi: result.kalori_estimasi })
    } catch (err) {
      logError('ExerciseLogEntryCard.handleAnalyze', err)
      const field = classifyError(err)
      if (field === 'jenis') {
        setFieldError('jenis', err?.message || 'Jenis olahraga tidak dikenali.')
      } else if (field === 'durasi') {
        setFieldError('durasi', err?.message || 'Format durasi tidak valid.')
      } else {
        toast.error(err?.message || 'Gagal menganalisa kalori olahraga.')
      }
    } finally {
      setAnalyzing(false)
    }
  }

  function handleCancel() {
    setAnalysisResult(null)
  }

  async function handleSave() {
    if (!analysisResult) return
    if (!userId) {
      toast.error('Akun belum siap. Coba muat ulang.')
      return
    }

    setSaving(true)
    try {
      const tanggal = tanggalProp || toIsoDateLocal(new Date())
      const { error } = await supabase.from('exercise_logs').insert({
        user_id: userId,
        tanggal,
        jenis_olahraga: analysisResult.jenis_olahraga,
        durasi: analysisResult.durasi,
        kalori_estimasi: analysisResult.kalori_estimasi,
      })
      if (error) throw error
      setJenis('')
      setDurasi('')
      setAnalysisResult(null)
      qc.invalidateQueries({ queryKey: ['exercise_logs', userId] })
      toast.success('Tersimpan.')
    } catch (err) {
      logError('ExerciseLogEntryCard.handleSave', err)
      toast.error('Gagal menyimpan log olahraga.')
    } finally {
      setSaving(false)
    }
  }

  if (analysisResult) {
    return (
      <Card className={KLIEN_DASHBOARD_LOG_CARD_SHELL}>
        <CardHeader className="space-y-0 p-0 px-4 pb-3 pt-4 sm:px-5 sm:pb-3 sm:pt-5 lg:px-5 lg:pb-3 lg:pt-5">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold leading-tight tracking-tight text-neutral-900 sm:text-sm md:text-sm">
              Estimasi kalori olahraga
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Tinjau sebelum menyimpan.</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4 pt-0 sm:px-5 sm:pb-5 lg:px-5 lg:pb-5 lg:pt-0">
          <div className="rounded-xl border border-dashed border-border bg-[linear-gradient(168deg,#faf7f2_0%,#f7f4ee_100%)] p-4 shadow-sm">
            <div className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
              <Dumbbell className="h-3.5 w-3.5" />
              Ringkasan olahraga
            </div>
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Jenis</span>
                <span className="font-medium text-foreground">{analysisResult.jenis_olahraga}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Durasi</span>
                <span className="font-medium text-foreground">{analysisResult.durasi}</span>
              </div>
              <div className="mt-2 border-t border-border/60 pt-2 flex justify-between gap-4">
                <span className="font-semibold text-foreground">Estimasi kalori terbakar</span>
                <KaloriValue value={analysisResult.kalori_estimasi} className="text-base font-bold text-orange-700" />
              </div>
            </div>
          </div>

          <Card className="border-amber-300 bg-amber-50 text-amber-950 max-md:rounded-3xl max-md:shadow-md">
            <CardContent className="flex gap-2.5 p-3 pt-3 sm:p-4 sm:pt-4 lg:pt-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0 space-y-1 text-sm leading-normal">
                <p className="font-semibold leading-tight">Informasi Kalori — Hanya Estimasi</p>
                <p className="text-amber-900/90">
                  Nilai kalori yang ditampilkan adalah estimasi awal berdasarkan analisa
                  AI dan tidak menggantikan penilaian klinis. Untuk konfirmasi lebih
                  lanjut, silakan konsultasikan dengan Ahli Gizi di instalasi Anda.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={handleCancel} disabled={saving} className="flex-1 sm:flex-initial">
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-initial">
              {saving ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={KLIEN_DASHBOARD_LOG_CARD_SHELL}>
      <CardHeader className="space-y-0 p-0 px-4 pb-3 pt-4 sm:px-5 sm:pb-3 sm:pt-5 lg:px-5 lg:pb-3 lg:pt-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold leading-tight tracking-tight text-neutral-900 sm:text-sm md:text-sm">
              Log olahraga
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Catat sesuai tanggal di atas, lalu analisa kalori dengan AI.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 pt-0 sm:px-5 sm:pb-5 lg:px-5 lg:pb-5 lg:pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-1.5">
            <Input
              value={jenis}
              onChange={(e) => handleJenisChange(e.target.value)}
              onBlur={validateJenisOnBlur}
              placeholder="Jenis olahraga"
              aria-label="Jenis olahraga"
              aria-invalid={jenisError ? 'true' : undefined}
              className={cn('bg-background/80', jenisError && 'border-destructive ring-1 ring-destructive/20')}
              disabled={analyzing}
            />
            {jenisError ? (
              <p className="flex items-center gap-1.5 text-xs text-destructive motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-200" role="alert">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {jenisError}
              </p>
            ) : null}
          </div>
          <div className="flex-1 space-y-1.5">
            <Input
              value={durasi}
              onChange={(e) => handleDurasiChange(e.target.value)}
              onBlur={validateDurasiOnBlur}
              placeholder="Durasi (mis. 30 menit, 3 set, 1 jam)"
              aria-label="Durasi"
              aria-invalid={durasiError ? 'true' : undefined}
              className={cn('bg-background/80', durasiError && 'border-destructive ring-1 ring-destructive/20')}
              disabled={analyzing}
            />
            {durasiError ? (
              <p className="flex items-center gap-1.5 text-xs text-destructive motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-200" role="alert">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {durasiError}
              </p>
            ) : null}
          </div>
        </div>

        <ExerciseAiAnalyzingPanel active={analyzing} reduceMotion={reduceMotion} />

        <Button onClick={handleAnalyze} disabled={!canAnalyze} className={cn('w-full', analyzing && 'hidden')}>
          <Sparkles className="h-4 w-4" aria-hidden />
          Analisa
        </Button>
      </CardContent>
    </Card>
  )
}
