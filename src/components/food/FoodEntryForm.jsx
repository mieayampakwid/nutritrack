import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Cookie, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalorieDisclaimer } from '@/components/shared/CalorieDisclaimer'
import { useFoodNameSuggestions, useFoodUnits } from '@/hooks/useFoodLog'
import { estimateCalories, validateFoodInput } from '@/lib/openai'
import { KaloriValue } from '@/components/shared/KaloriValue'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { APP_ACRONYM } from '@/lib/appMeta'
import { formatDateId, formatNumberId, toIsoDateLocal } from '@/lib/format'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { foodEntrySchema } from '@/lib/validators'
import { logError } from '@/lib/logger'

const WAKTU = [
  { key: 'pagi', label: 'Sarapan' },
  { key: 'siang', label: 'Makan siang' },
  { key: 'malam', label: 'Makan malam' },
  { key: 'snack', label: 'Snack' },
]

function mealLabelFromKey(key) {
  return WAKTU.find((w) => w.key === key)?.label ?? key
}

/** Receipt header pill — matches meal-slot palette. */
const MEAL_RECEIPT_BADGE = {
  pagi: 'border-emerald-600/40 bg-emerald-50/90 text-emerald-950',
  siang: 'border-orange-500/45 bg-orange-50/95 text-orange-950',
  malam: 'border-blue-950/45 bg-blue-50 text-blue-950',
  snack: 'border-[#7a1e2c]/45 bg-rose-50 text-rose-950',
}

const typeLabel = 'text-sm font-medium leading-none text-foreground'
const typeMuted = 'text-sm leading-normal text-muted-foreground'

const ANALYZE_STATUS_LINES = [
  'Memetakan bahan dan porsi ke basis data gizi…',
  'Menghitung estimasi energi (kkal) per item…',
  'Menyelaraskan hasil dengan satuan yang Anda pilih…',
  'Menyiapkan ringkasan untuk disimpan…',
]

function FoodEntryAiAnalyzingPanel({ active, reduceMotion }) {
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
          aria-label="Menganalisa makanan dengan AI"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] via-background to-teal-500/[0.06] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset]"
        >
          {!reduceMotion ? (
            <Motion.div
              className="pointer-events-none absolute -left-1/2 top-0 h-px w-[200%] bg-gradient-to-r from-transparent via-primary/40 to-transparent"
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
            <div className="relative flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center sm:h-14 sm:w-14">
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
                <p className="font-[family-name:var(--font-greeting)] text-sm font-semibold tracking-tight text-foreground sm:text-base">
                  Menganalisa dengan AI
                </p>
                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  tunggu sebentar
                </span>
              </div>
              <div className="relative min-h-[2.75rem] sm:min-h-[2.5rem]">
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
                      className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-gradient-to-r from-primary/20 via-primary to-primary/20"
                      initial={false}
                      animate={{ left: ['-40%', '100%'] }}
                      transition={barTransition}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
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

/** Same chrome as `Input` / `SelectTrigger`: mobile 44px, md compact 36px. */
const foodRowControlShell =
  'flex h-10 min-h-[44px] w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-background/80 px-3.5 py-2 text-base shadow-sm ring-offset-background transition-[color,box-shadow,border-color] duration-200 md:h-9 md:min-h-0 md:px-3 md:py-1'

/** Mobile: match `input { font-size: 16px }` in index.css (SelectTrigger is a button). */
const foodRowSelectMobileType = 'food-row-select-sync'

const foodRowSelectFocus =
  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1'

/** Dapurasri OrderEntryDialog “Nama Pemesan” panel (popover list under input). */
const foodSuggestPanelClass =
  'absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border bg-popover text-popover-foreground shadow-lg ring-1 ring-black/5'

/** Dapurasri SalesEntryDialog: inline − / number / + inside bordered shell. */
const foodQtyStepperShellClass =
  'inline-flex h-10 min-h-[44px] shrink-0 items-center overflow-hidden rounded-md border border-input bg-background/80 md:h-9 md:min-h-0'

const foodQtyStepperInnerInputClass =
  'food-entry-compact-input h-full min-h-0 min-w-0 w-14 rounded-none border-0 bg-transparent px-0 text-center text-base tabular-nums leading-tight shadow-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-sm'

const foodQtyStepperBtnClass =
  'flex h-full w-10 shrink-0 items-center justify-center text-sm font-medium text-muted-foreground transition-colors hover:bg-accent md:w-8 md:text-xs'

function FoodNameSuggestField({
  inputId,
  value,
  suggestionNames,
  open,
  onOpen,
  onClosePanel,
  onCloseRowBlur,
  onPick,
  onChangeNama,
}) {
  const filtered = useMemo(() => {
    const t = value.trim()
    if (!t || !suggestionNames.length) return []
    const low = t.toLowerCase()
    return suggestionNames.filter((n) => n.toLowerCase().includes(low)).slice(0, 20)
  }, [suggestionNames, value])

  const suggestRowClass =
    'w-full px-3 py-2 text-left text-sm transition-colors duration-100 hover:bg-accent hover:text-accent-foreground'

  return (
    <div className="relative w-full">
      <Input
        id={inputId}
        placeholder="Nama makanan"
        autoComplete="off"
        className="food-entry-compact-input bg-background/80 text-base leading-tight transition-shadow duration-200 md:text-sm"
        value={value}
        onChange={(e) => {
          const v = e.target.value
          onChangeNama(v)
          if (v.trim()) onOpen()
          else onClosePanel()
        }}
        onBlur={onCloseRowBlur}
      />
      {open && filtered.length > 0 ? (
        <div className={foodSuggestPanelClass} role="listbox">
          {filtered.map((n, idx) => (
            <button
              key={`${n}-${idx}`}
              type="button"
              role="option"
              className={suggestRowClass}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPick(n)}
            >
              {n}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function emptyRow() {
  return { id: crypto.randomUUID(), nama: '', jumlah: '', unitId: '' }
}

/** Live summary for collapsed row header, e.g. "sate 1 bungkus". */
function foodRowSummaryLine(r, unitMap) {
  const nama = r.nama.trim()
  const jum = String(r.jumlah ?? '').trim()
  const unitNama = r.unitId ? String(unitMap[r.unitId]?.nama ?? '').trim() : ''
  const parts = [nama, jum, unitNama].filter(Boolean)
  return parts.length ? parts.join(' ') : 'Item baru'
}

export function FoodEntryForm({ userId }) {
  const reduceMotion = useReducedMotion()
  const qc = useQueryClient()
  const { data: units = [] } = useFoodUnits()
  const { data: suggestions = [] } = useFoodNameSuggestions()

  const [mealKey, setMealKey] = useState('')
  const [rows, setRows] = useState(() => [emptyRow()])
  const [expandedRowId, setExpandedRowId] = useState(() => rows[0].id)
  const [suggestionsOpenRowId, setSuggestionsOpenRowId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const resultRef = useRef(null)
  const analyzingAnchorRef = useRef(null)

  const suggestionNames = useMemo(
    () => suggestions.map((s) => s.nama_makanan).filter(Boolean),
    [suggestions],
  )

  const unitMap = useMemo(() => Object.fromEntries(units.map((u) => [u.id, u])), [units])

  useEffect(() => {
    setExpandedRowId((ex) => {
      if (!rows.length) return ex
      if (rows.some((row) => row.id === ex)) return ex
      return rows[0].id
    })
  }, [rows])

  useEffect(() => {
    if (!result) return
    const el = resultRef.current
    if (!el) return
    const id = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(id)
  }, [result])

  useEffect(() => {
    if (!loading) return
    const el = analyzingAnchorRef.current
    if (!el) return
    const id = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' })
    })
    return () => cancelAnimationFrame(id)
  }, [loading, reduceMotion])

  function setRow(i, patch) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  function adjustRowJumlah(rowIndex, delta) {
    setRows((prev) =>
      prev.map((r, j) => {
        if (j !== rowIndex) return r
        const base = r.jumlah === '' ? 0 : Number(r.jumlah)
        const n = Number.isFinite(base) ? base : 0
        const next = n + delta
        const clamped = next < 0 ? 0 : next
        return { ...r, jumlah: String(clamped) }
      }),
    )
  }

  function addRow() {
    const nr = emptyRow()
    setRows((prev) => [...prev, nr])
    setExpandedRowId(nr.id)
    setSuggestionsOpenRowId(null)
  }

  function removeRow(i) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)))
  }

  async function handleAnalyze() {
    setError('')
    setResult(null)

    if (!mealKey) {
      setError('Pilih waktu makan terlebih dahulu.')
      return
    }

    const filled = rows
      .map((r) => {
        const unit = unitMap[r.unitId]
        return {
          row: r,
          nama_makanan: r.nama.trim(),
          jumlah: r.jumlah === '' ? NaN : Number(r.jumlah),
          unit_id: r.unitId || null,
          unit_nama: unit?.nama ?? '',
        }
      })
      .filter((x) => x.nama_makanan && !Number.isNaN(x.jumlah) && x.jumlah > 0 && x.unit_nama)

    if (!filled.length) {
      setError('Isi minimal satu baris lengkap (nama, jumlah, satuan).')
      return
    }

    const vResult = foodEntrySchema.safeParse({
      items: filled.map((x) => ({
        nama_makanan: x.nama_makanan,
        jumlah: x.jumlah,
        unit_nama: x.unit_nama,
      })),
    })
    if (!vResult.success) {
      setError(vResult.error.issues[0].message)
      return
    }

    const submittedAt = new Date()
    const tanggal = toIsoDateLocal(submittedAt)
    const waktu = mealKey

    setLoading(true)
    try {
      const validation = await validateFoodInput(filled.map((x) => x.nama_makanan))
      if (validation.valid === false) {
        setError(validation.message)
        return
      }

      const est = await estimateCalories(
        filled.map((x) => ({
          nama_makanan: x.nama_makanan,
          jumlah: x.jumlah,
          unit_nama: x.unit_nama,
        })),
      )

      if (!Array.isArray(est)) throw new Error('Format respons AI tidak valid.')

      const byName = {}
      for (const e of est) {
        if (e?.nama_makanan != null)
          byName[String(e.nama_makanan).trim().toLowerCase()] = Number(e.kalori)
      }

      const itemsWithKal = filled.map((x, i) => {
        const fromIdx = est[i]?.kalori != null ? Number(est[i].kalori) : null
        const fromName =
          byName[x.nama_makanan.toLowerCase()] ??
          byName[x.nama_makanan.trim().toLowerCase()]
        const k = fromIdx != null && !Number.isNaN(fromIdx) ? fromIdx : (fromName ?? 0)
        return { ...x, kalori_estimasi: k }
      })

      const total = itemsWithKal.reduce((a, x) => a + x.kalori_estimasi, 0)

      const { data: logRow, error: logErr } = await supabase
        .from('food_logs')
        .insert({
          user_id: userId,
          tanggal,
          waktu_makan: waktu,
          total_kalori: total,
          status: 'saved',
        })
        .select()
        .single()

      if (logErr) throw logErr

      const inserts = itemsWithKal.map((x) => ({
        food_log_id: logRow.id,
        nama_makanan: x.nama_makanan,
        jumlah: x.jumlah,
        unit_id: x.unit_id,
        unit_nama: x.unit_nama,
        kalori_estimasi: x.kalori_estimasi,
      }))

      const { error: itemErr } = await supabase.from('food_log_items').insert(inserts)
      if (itemErr) throw itemErr

      setResult({ items: itemsWithKal, total, waktuMakan: waktu })
      qc.invalidateQueries({ queryKey: ['food_logs', userId] })
      qc.invalidateQueries({ queryKey: ['food_name_suggestions'] })
      const nextRow = emptyRow()
      setRows([nextRow])
      setExpandedRowId(nextRow.id)
      setMealKey('')
      toast.success('Data tersimpan.')
    } catch (e) {
      logError('FoodEntryForm.handleAnalyze', e)
      setError(e.message ?? 'Terjadi kesalahan.')
      toast.error('Gagal menganalisa atau menyimpan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {result ? (
        <div
          ref={resultRef}
          id="food-entry-result"
          tabIndex={-1}
          className="scroll-mt-24 text-left outline-none sm:scroll-mt-28"
          aria-live="polite"
        >
          <Card
            className={cn(
              'food-entry-result-receipt relative overflow-hidden border-2 border-dashed border-stone-400/55',
              'bg-[linear-gradient(168deg,#faf7f2_0%,#ffffff_42%,#ecfdf8_96%)]',
              'text-neutral-900 shadow-[0_2px_0_rgba(15,118,110,0.06),0_18px_48px_-12px_rgba(0,151,178,0.18)]',
              '',
              '',
              'rounded-2xl max-md:rounded-3xl',
              'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:fill-mode-both',
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              }}
              aria-hidden
            />
            <div className="relative">
              <header className="px-5 pb-1 pt-6 text-center sm:px-7 sm:pt-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-teal-700/85">
                  Struk estimasi
                </p>
                <p className="mt-2 font-[family-name:var(--font-greeting)] text-[1.35rem] font-semibold leading-tight tracking-tight text-neutral-900 sm:text-2xl">
                  Tersimpan
                </p>
                <p className="mx-auto mt-2 max-w-[18rem] text-xs leading-relaxed text-neutral-600">
                  Ringkasan asupan yang baru dicatat — nilai berikut bersifat estimasi.
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-neutral-500">
                  <span className="font-medium tracking-wide text-neutral-700">
                    {APP_ACRONYM}
                  </span>
                  <span className="text-neutral-300" aria-hidden>
                    |
                  </span>
                  <time className="tabular-nums" dateTime={new Date().toISOString()}>
                    {formatDateId(new Date())}
                  </time>
                  <span className="text-neutral-300" aria-hidden>
                    ·
                  </span>
                  <span className="tabular-nums">{format(new Date(), 'HH:mm', { locale: localeId })}</span>
                </div>
                <div className="mt-4 flex justify-center">
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-3.5 py-1 text-[11px] font-semibold tracking-wide',
                      MEAL_RECEIPT_BADGE[result.waktuMakan] ?? MEAL_RECEIPT_BADGE.pagi,
                    )}
                  >
                    {mealLabelFromKey(result.waktuMakan)}
                  </span>
                </div>
              </header>

              <div
                className="mx-5 mt-5 h-px border-t border-dashed border-stone-400/70 sm:mx-7"
                role="presentation"
              />

              <div className="px-5 py-4 sm:px-7">
                <div className="flex items-end justify-between gap-2 border-b border-stone-800/10 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                    Rincian
                  </span>
                  <span className="text-[10px] font-medium tabular-nums text-neutral-400">
                    {result.items.length} baris
                  </span>
                </div>
                <ul className="mt-1 divide-y divide-dotted divide-stone-300/80">
                  {result.items.map((x, idx) => (
                    <li key={idx} className="py-3.5 first:pt-2">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-snug text-neutral-900 sm:text-[0.9375rem]">
                            {x.nama_makanan}
                          </p>
                          <p className="mt-1.5 text-[11px] tabular-nums leading-none text-neutral-500">
                            <span className="font-medium text-neutral-600">
                              {formatNumberId(x.jumlah)}
                            </span>
                            <span className="mx-1 text-neutral-400">×</span>
                            <span>{x.unit_nama}</span>
                          </p>
                        </div>
                        <div className="shrink-0 border-l border-dashed border-stone-300/70 pl-3">
                          <span className="block text-right font-mono text-sm font-semibold tabular-nums text-teal-800 sm:text-base">
                            <KaloriValue
                              value={x.kalori_estimasi}
                              unitClassName="text-[0.65em] font-normal text-teal-700/65"
                            />
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="mx-5 border-t-2 border-double border-teal-700/25 sm:mx-7"
                role="presentation"
              />

              <div className="relative bg-gradient-to-r from-teal-600/[0.09] via-teal-600/[0.05] to-transparent px-5 py-5 sm:px-7">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-900/70">
                      Total estimasi
                    </p>
                    <p className="text-xs text-neutral-600">
                      Jumlah kalori gabungan untuk waktu makan ini.
                    </p>
                  </div>
                  <KaloriValue
                    value={result.total}
                    className="text-2xl font-bold tracking-tight text-teal-800 sm:text-[1.65rem]"
                    unitClassName="text-sm font-semibold text-teal-700/75"
                  />
                </div>
              </div>

              <div
                className="h-2.5 w-full bg-[repeating-linear-gradient(90deg,transparent_0px,transparent_5px,currentColor_5px,currentColor_7px)] text-stone-400/45"
                role="presentation"
                aria-hidden
              />

              <div className="px-5 pb-5 pt-1 sm:px-7 sm:pb-6">
                <CalorieDisclaimer className="border-amber-200/70 bg-amber-50/70 shadow-none" />
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      <section className="space-y-2 border-t border-border/60 pt-3 sm:pt-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <div className="min-w-0 space-y-0.5">
            <h2 className="text-sm font-semibold leading-tight tracking-tight">
              Daftar makanan
            </h2>
            <p className={typeMuted}>
              Satu baris = satu jenis makanan beserta porsi dan satuan. Misalnya Anda makan nasi ayam
              geprek, tuliskan nasi kisaran berapa porsi, lalu tambah lagi baris dibawahnya untuk ayam
              gepreknya, lalu klik Analisa
            </p>
          </div>
          <Badge
            variant="secondary"
            className="w-fit shrink-0 text-sm font-medium tabular-nums transition-colors duration-200"
          >
            {rows.length} item
          </Badge>
        </div>

        <section className="space-y-2">
          <div
            className={cn(
              'group flex overflow-visible rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm',
              'ring-1 ring-border/30',
              'transition-[border-color,box-shadow,ring-color] duration-200',
              'motion-safe:hover:border-primary/30 motion-safe:hover:shadow-md motion-safe:hover:ring-primary/20',
              'focus-within:border-primary/35 focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring/35',
            )}
          >
            <div className="shrink-0 self-stretch overflow-hidden rounded-l-xl" aria-hidden>
              <div className="h-full w-1 bg-gradient-to-b from-primary/55 via-primary/35 to-primary/15 sm:w-1.5" />
            </div>
            <div className="min-w-0 flex-1 p-3 sm:p-3.5">
              <div className="flex items-start gap-3">
                <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor="food-entry-meal" className={typeLabel}>
                    Waktu makan
                  </Label>
                  <p className={cn(typeMuted, 'text-xs leading-snug')}>
                    Pilih kategori waktu makan sebelum menyimpan.
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <Select value={mealKey} onValueChange={setMealKey}>
                  <SelectTrigger id="food-entry-meal" className="w-full bg-background/80">
                    <SelectValue placeholder="Pilih waktu makan" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {WAKTU.map((w) => (
                      <SelectItem key={w.key} value={w.key}>
                        {w.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-2.5">
          {rows.map((r, i) => {
            const isExpanded = r.id === expandedRowId
            const summary = foodRowSummaryLine(r, unitMap)
            return (
              <div
                key={r.id}
                role="group"
                aria-label={`Entri makanan ke-${i + 1}`}
                className={cn(
                  'group flex overflow-visible rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm',
                  'ring-1 ring-border/30',
                  'transition-[border-color,box-shadow,ring-color] duration-200',
                  'motion-safe:hover:border-primary/30 motion-safe:hover:shadow-md motion-safe:hover:ring-primary/20',
                  isExpanded &&
                    'focus-within:border-primary/35 focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring/35',
                )}
              >
                <div
                  className="shrink-0 self-stretch overflow-hidden rounded-l-xl"
                  aria-hidden
                >
                  <div className="h-full w-1 bg-gradient-to-b from-primary/55 via-primary/35 to-primary/15 motion-safe:transition-opacity motion-safe:group-hover:opacity-100 sm:w-1.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 border-b border-border/50 bg-muted/25 px-3 py-2">
                    <Badge
                      variant="outline"
                      className="h-7 min-w-7 shrink-0 justify-center rounded-lg border-primary/25 bg-background/80 px-0 font-mono text-xs font-semibold tabular-nums text-primary"
                    >
                      {i + 1}
                    </Badge>
                    <button
                      type="button"
                      id={`food-row-label-${r.id}`}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-0.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      onClick={() => {
                        setExpandedRowId(r.id)
                        setSuggestionsOpenRowId(null)
                      }}
                      aria-expanded={isExpanded}
                      aria-controls={`food-row-panel-${r.id}`}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {summary}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                          isExpanded && 'rotate-180',
                        )}
                        aria-hidden
                      />
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:h-9 sm:w-9"
                      onClick={() => removeRow(i)}
                      aria-label="Hapus baris"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {isExpanded ? (
                    <div
                      id={`food-row-panel-${r.id}`}
                      role="region"
                      aria-labelledby={`food-row-label-${r.id}`}
                      className="p-3 sm:p-3.5"
                    >
                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8.5rem_minmax(0,1fr)] sm:items-end">
                        <div className="grid gap-1.5">
                          <Label className={cn(typeLabel, 'sm:sr-only')} htmlFor={`food-name-${r.id}`}>
                            Makanan
                          </Label>
                          <FoodNameSuggestField
                            inputId={`food-name-${r.id}`}
                            value={r.nama}
                            suggestionNames={suggestionNames}
                            open={suggestionsOpenRowId === r.id}
                            onOpen={() => setSuggestionsOpenRowId(r.id)}
                            onClosePanel={() =>
                              setSuggestionsOpenRowId((cur) => (cur === r.id ? null : cur))
                            }
                            onCloseRowBlur={() => {
                              setTimeout(() => {
                                setSuggestionsOpenRowId((cur) => (cur === r.id ? null : cur))
                              }, 200)
                            }}
                            onPick={(nama) => {
                              setRow(i, { nama })
                              setSuggestionsOpenRowId(null)
                            }}
                            onChangeNama={(nama) => setRow(i, { nama })}
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className={cn(typeLabel, 'sm:sr-only')} htmlFor={`food-qty-${r.id}`}>
                            Jumlah
                          </Label>
                          <div className={foodQtyStepperShellClass}>
                            <button
                              type="button"
                              className={foodQtyStepperBtnClass}
                              onClick={() => adjustRowJumlah(i, -1)}
                              aria-label="Kurangi jumlah"
                            >
                              -
                            </button>
                            <Input
                              id={`food-qty-${r.id}`}
                              type="number"
                              inputMode="decimal"
                              step="any"
                              min={0}
                              placeholder="0"
                              className={foodQtyStepperInnerInputClass}
                              value={r.jumlah}
                              onChange={(e) => setRow(i, { jumlah: e.target.value })}
                              onFocus={(e) => e.target.select()}
                            />
                            <button
                              type="button"
                              className={foodQtyStepperBtnClass}
                              onClick={() => adjustRowJumlah(i, 1)}
                              aria-label="Tambah jumlah"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="grid min-w-0 gap-1.5">
                          <Label className={cn(typeLabel, 'sm:sr-only')} htmlFor={`food-unit-${r.id}`}>
                            Satuan
                          </Label>
                          <Select value={r.unitId || undefined} onValueChange={(v) => setRow(i, { unitId: v })}>
                            <SelectTrigger
                              id={`food-unit-${r.id}`}
                              className={cn(
                                foodRowControlShell,
                                foodRowSelectFocus,
                                foodRowSelectMobileType,
                                'min-w-0 w-full',
                              )}
                            >
                              <SelectValue placeholder="Satuan" />
                            </SelectTrigger>
                            <SelectContent align="end" className="text-xs">
                              {units.map((u) => (
                                <SelectItem key={u.id} value={u.id} className="text-xs">
                                  {u.nama}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full text-sm transition-all duration-200 motion-safe:active:scale-[0.99] sm:w-auto"
          onClick={addRow}
        >
          <Plus className="h-4 w-4" />
          Tambah makanan
        </Button>
      </section>

      <div ref={analyzingAnchorRef} className="mt-3 scroll-mt-4">
        <FoodEntryAiAnalyzingPanel active={loading} reduceMotion={reduceMotion} />
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        {error ? (
          <p
            className="text-sm leading-normal text-destructive order-2 sm:order-1 sm:mr-2 sm:flex-1 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
            role="alert"
          >
            {error}
          </p>
        ) : (
          <span className="order-2 hidden sm:order-1 sm:block sm:flex-1" />
        )}
        <Button
          type="button"
          className="order-1 h-9 w-full text-sm transition-all duration-200 motion-safe:active:scale-[0.99] sm:order-2 sm:w-auto sm:min-w-[11rem]"
          disabled={loading}
          onClick={handleAnalyze}
        >
          {loading ? (
            <Loader2
              className={cn('h-4 w-4', !reduceMotion && 'motion-safe:animate-spin')}
              aria-hidden
            />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden />
          )}
          {loading ? 'Menganalisa & menyimpan…' : 'Analisa & simpan'}
        </Button>
      </div>
    </div>
  )
}
