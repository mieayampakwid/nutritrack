import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronDown, Clock, Cookie, Loader2, Moon, Pencil, Plus, Sparkles, Sunrise, Sun, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TimeScroller } from '@/components/food/TimeScroller'
import { useFoodNameSuggestions, useFoodUnits } from '@/hooks/useFoodLog'
import { analyzeFood } from '@/lib/openai'
import { KaloriValue } from '@/components/shared/KaloriValue'
import { formatNumberId, toIsoDateLocal } from '@/lib/format'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { foodEntrySchema } from '@/lib/validators'
import { logError } from '@/lib/logger'

function safeUUID() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
  } catch { /* fall through */ }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

const WAKTU = [
  {
    key: 'pagi', label: 'Sarapan', icon: Sunrise, defaultJam: '07:00',
    pill: 'border-emerald-500/40 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100/90',
    active: 'border-emerald-600/60 bg-emerald-100/95 text-emerald-950 shadow-sm shadow-emerald-500/15 ring-2 ring-emerald-500/25',
  },
  {
    key: 'siang', label: 'Makan siang', icon: Sun, defaultJam: '12:00',
    pill: 'border-orange-400/40 bg-orange-50/80 text-orange-800 hover:bg-orange-100/90',
    active: 'border-orange-500/60 bg-orange-100/95 text-orange-950 shadow-sm shadow-orange-500/15 ring-2 ring-orange-500/25',
  },
  {
    key: 'malam', label: 'Makan malam', icon: Moon, defaultJam: '19:00',
    pill: 'border-blue-500/40 bg-blue-50/80 text-blue-800 hover:bg-blue-100/90',
    active: 'border-blue-600/60 bg-blue-100/95 text-blue-950 shadow-sm shadow-blue-500/15 ring-2 ring-blue-500/25',
  },
  {
    key: 'snack', label: 'Snack', icon: Cookie, defaultJam: '15:00',
    pill: 'border-rose-400/40 bg-rose-50/80 text-rose-800 hover:bg-rose-100/90',
    active: 'border-[#7a1e2c]/60 bg-rose-100/95 text-rose-950 shadow-sm shadow-rose-500/15 ring-2 ring-rose-500/25',
  },
]

function mealLabelFromKey(key) {
  return WAKTU.find((w) => w.key === key)?.label ?? key
}

function defaultJamForMeal(key) {
  return WAKTU.find((w) => w.key === key)?.defaultJam ?? '12:00'
}

const MEAL_RECEIPT_BADGE = {
  pagi: 'border-emerald-600/40 bg-emerald-50/90 text-emerald-950',
  siang: 'border-orange-500/45 bg-orange-50/95 text-orange-950',
  malam: 'border-blue-950/45 bg-blue-50 text-blue-950',
  snack: 'border-[#7a1e2c]/45 bg-rose-50 text-rose-950',
}

const MEAL_CARD_COLORS = {
  pagi: { card: 'border-emerald-200/60 bg-emerald-50/70', accent: 'border-emerald-300/60 text-emerald-800', border: 'border-emerald-200/50', divider: 'border-emerald-200/30', hover: 'hover:bg-emerald-100/50' },
  siang: { card: 'border-orange-200/60 bg-orange-50/70', accent: 'border-orange-300/60 text-orange-800', border: 'border-orange-200/50', divider: 'border-orange-200/30', hover: 'hover:bg-orange-100/50' },
  malam: { card: 'border-blue-200/60 bg-blue-50/70', accent: 'border-blue-300/60 text-blue-800', border: 'border-blue-200/50', divider: 'border-blue-200/30', hover: 'hover:bg-blue-100/50' },
  snack: { card: 'border-rose-200/60 bg-rose-50/70', accent: 'border-rose-300/60 text-rose-800', border: 'border-rose-200/50', divider: 'border-rose-200/30', hover: 'hover:bg-rose-100/50' },
}

const ANALYZE_STATUS_LINES = [
  'Memetakan bahan dan porsi ke basis data gizi…',
  'Menghitung estimasi energi dan zat gizi (makro) per item…',
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

const foodRowControlShell =
  'flex h-10 min-h-[44px] w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-background/80 px-3.5 py-2 text-base shadow-sm ring-offset-background transition-[color,box-shadow,border-color] duration-200 md:h-9 md:min-h-0 md:px-3 md:py-1'

const foodRowSelectMobileType = 'food-row-select-sync'

const foodRowSelectFocus =
  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1'

const foodSuggestPanelClass =
  'absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border bg-popover text-popover-foreground shadow-lg ring-1 ring-black/5'

const foodQtyStepperShellClass =
  'flex h-10 min-h-[44px] w-full min-w-0 items-center overflow-hidden rounded-md border border-input bg-background/80 md:h-9 md:min-h-0'

const foodQtyStepperInnerInputClass =
  'food-entry-compact-input h-full min-h-0 min-w-0 w-12 flex-1 rounded-none border-0 bg-transparent px-0 text-center text-base tabular-nums leading-tight shadow-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:w-14 sm:flex-none md:text-sm placeholder:text-[13.25px]'

const foodQtyStepperBtnClass =
  'flex h-full w-9 shrink-0 items-center justify-center text-sm font-medium text-muted-foreground transition-colors hover:bg-accent sm:w-10 md:w-8 md:text-xs'

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
        className="food-entry-compact-input bg-background/80 text-base leading-tight transition-shadow duration-200 md:text-sm placeholder:text-[13.25px]"
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
  return { id: safeUUID(), nama: '', jumlah: '', unitId: '' }
}

function foodRowSummaryLine(r, unitMap) {
  const nama = r.nama.trim()
  const jum = String(r.jumlah ?? '').trim()
  const unitNama = r.unitId ? String(unitMap[r.unitId]?.nama ?? '').trim() : ''
  const parts = [nama, jum, unitNama].filter(Boolean)
  return parts.length ? parts.join(' ') : 'Item baru'
}

export function FoodEntryForm({ userId, tanggal: tanggalProp, onSaved }) {
  const reduceMotion = useReducedMotion()
  const qc = useQueryClient()
  const { data: units = [] } = useFoodUnits()
  const { data: suggestions = [] } = useFoodNameSuggestions()

  const [mealKey, setMealKey] = useState('')
  const [jamMakan, setJamMakan] = useState('')
  const [jamCustomOpen, setJamCustomOpen] = useState(false)
  const [jamHour, setJamHour] = useState('')
  const [jamMinute, setJamMinute] = useState('')
  const [rows, setRows] = useState(() => [emptyRow()])
  const [expandedRowId, setExpandedRowId] = useState(() => rows[0].id)
  const [suggestionsOpenRowId, setSuggestionsOpenRowId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [jamError, setJamError] = useState(false)
  const [rowErrorsById, setRowErrorsById] = useState(() => ({}))
  const [pendingResult, setPendingResult] = useState(null)
  const [result, setResult] = useState(null)
  const [addFormOpen, setAddFormOpen] = useState(false)
  const [addRows, setAddRows] = useState(() => [emptyRow()])
  const [addLoading, setAddLoading] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const idempotencyKeyRef = useRef(null)
  const resultRef = useRef(null)
  const analyzingAnchorRef = useRef(null)
  const rowErrorAnchorRef = useRef(null)

  const suggestionNames = useMemo(
    () => suggestions.map((s) => s.nama_makanan).filter(Boolean),
    [suggestions],
  )

  const unitMap = useMemo(() => Object.fromEntries(units.map((u) => [u.id, u])), [units])
  const hasRowErrors = Object.keys(rowErrorsById).length > 0

  const filledCount = useMemo(() => {
    return rows.reduce((acc, r) => {
      const namaOk = Boolean(r.nama?.trim())
      const jumlah = r.jumlah === '' ? NaN : Number(r.jumlah)
      const jumlahOk = Number.isFinite(jumlah) && jumlah > 0
      const unitOk = Boolean(r.unitId)
      return acc + (namaOk && jumlahOk && unitOk ? 1 : 0)
    }, 0)
  }, [rows])

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

  useEffect(() => {
    if (!jamCustomOpen) return
    const [h = '', m = ''] = (jamMakan || '').split(':')
    setJamHour(h)
    setJamMinute(m)
  }, [jamCustomOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleMealSelect(key) {
    if (mealKey !== key) {
      setMealKey(key)
      setJamMakan(defaultJamForMeal(key))
      setJamError(false)
    }
  }

  function handleJamConfirm() {
    const hh = jamHour.padStart(2, '0') || '00'
    const mm = jamMinute.padStart(2, '0') || '00'
    setJamMakan(`${hh}:${mm}`)
    setJamCustomOpen(false)
    setJamError(false)
    setError('')
  }

  function setRow(i, patch) {
    setRows((prev) =>
      prev.map((r, j) => {
        if (j !== i) return r
        if (rowErrorsById[r.id]) {
          if (error) setError('')
          setRowErrorsById((cur) => {
            if (!cur[r.id]) return cur
            const next = { ...cur }
            delete next[r.id]
            return next
          })
        }
        return { ...r, ...patch }
      }),
    )
  }

  function adjustRowJumlah(rowIndex, delta) {
    const STEP = 0.5
    setRows((prev) =>
      prev.map((r, j) => {
        if (j !== rowIndex) return r
        if (rowErrorsById[r.id]) {
          if (error) setError('')
          setRowErrorsById((cur) => {
            if (!cur[r.id]) return cur
            const next = { ...cur }
            delete next[r.id]
            return next
          })
        }
        const base = r.jumlah === '' ? 0 : Number(r.jumlah)
        const n = Number.isFinite(base) ? base : 0
        const next = n + delta * STEP
        const clamped = next < 0 ? 0 : next
        const rounded = Math.round(clamped * 100) / 100
        return { ...r, jumlah: String(rounded) }
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
    setRowErrorsById({})
    setResult(null)

    if (!mealKey) {
      setError('Pilih waktu makan terlebih dahulu.')
      return
    }

    if (!jamMakan) {
      setJamError(true)
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
    const tanggal = tanggalProp || toIsoDateLocal(submittedAt)
    const waktu = mealKey

    setLoading(true)
    try {
      const result = await analyzeFood(
        filled.map((x) => ({
          nama_makanan: x.nama_makanan,
          jumlah: x.jumlah,
          unit_nama: x.unit_nama,
        })),
      )

      if (Array.isArray(result)) {
        const est = result
        const byName = {}
        for (const e of est) {
          if (e?.nama_makanan != null)
            byName[String(e.nama_makanan).trim().toLowerCase()] = e
        }

        const itemsWithKal = filled.map((x) => {
          const key = x.nama_makanan.toLowerCase()
          const e = byName[key] ?? {}
          return {
            ...x,
            kalori_estimasi: Number(e.kalori) || 0,
            karbohidrat: Number(e.karbohidrat) || 0,
            protein: Number(e.protein) || 0,
            lemak: Number(e.lemak) || 0,
            serat: Number(e.serat) || 0,
            natrium: Number(e.natrium) || 0,
          }
        })

        const total = itemsWithKal.reduce((a, x) => a + x.kalori_estimasi, 0)
        const totalKarbohidrat = itemsWithKal.reduce((a, x) => a + (x.karbohidrat || 0), 0)
        const totalProtein = itemsWithKal.reduce((a, x) => a + (x.protein || 0), 0)
        const totalLemak = itemsWithKal.reduce((a, x) => a + (x.lemak || 0), 0)
        const totalSerat = itemsWithKal.reduce((a, x) => a + (x.serat || 0), 0)
        const totalNatrium = itemsWithKal.reduce((a, x) => a + (x.natrium || 0), 0)

        idempotencyKeyRef.current = safeUUID()
        setPendingResult({
          items: itemsWithKal,
          total,
          totalKarbohidrat,
          totalProtein,
          totalLemak,
          totalSerat,
          totalNatrium,
          waktuMakan: waktu,
          tanggal,
        })
        return
      }

      if (result && typeof result === 'object' && result.valid === false) {
        const msg = String(result.message ?? 'Input makanan tidak valid.')
        setError(msg)

        const rowMessages = {}

        if (Array.isArray(result.item_issues) && result.item_issues.length > 0) {
          for (const issue of result.item_issues) {
            const idx = typeof issue?.index === 'number' ? issue.index : -1
            if (idx < 0 || idx >= filled.length) continue
            const rowId = filled[idx]?.row?.id
            if (!rowId) continue
            if (Array.isArray(issue.fields) && issue.fields.length > 0) {
              const fieldMsgs = issue.fields
                .filter((f) => f && typeof f.message === 'string' && f.message.trim())
                .map((f) => f.message.trim())
              if (fieldMsgs.length > 0) {
                rowMessages[rowId] = fieldMsgs.join(' ')
              }
            }
          }
        }

        if (Object.keys(rowMessages).length === 0) {
          const invalidRowIds = new Set()
          if (
            Array.isArray(result.invalid_indices) &&
            result.invalid_indices.length > 0
          ) {
            for (const idx of result.invalid_indices) {
              const rowId = filled[idx]?.row?.id
              if (rowId) invalidRowIds.add(rowId)
            }
          } else if (
            Array.isArray(result.invalid_inputs) &&
            result.invalid_inputs.length > 0
          ) {
            const normalizedBad = new Set(
              result.invalid_inputs
                .map((s) => String(s ?? '').trim().toLowerCase())
                .filter(Boolean),
            )
            for (const x of filled) {
              const key = x.nama_makanan.trim().toLowerCase()
              if (normalizedBad.has(key)) invalidRowIds.add(x.row.id)
            }
          }
          if (invalidRowIds.size === 0 && filled.length === 1 && filled[0]?.row?.id) {
            invalidRowIds.add(filled[0].row.id)
          }
          for (const id of invalidRowIds) {
            rowMessages[id] = msg
          }
        }

        if (Object.keys(rowMessages).length > 0) {
          setRowErrorsById(rowMessages)
          const firstBad = Object.keys(rowMessages)[0]
          setExpandedRowId(firstBad)
          requestAnimationFrame(() => {
            rowErrorAnchorRef.current?.scrollIntoView({
              behavior: reduceMotion ? 'auto' : 'smooth',
              block: 'center',
            })
          })
        }
        return
      }

      throw new Error('Format respons AI tidak valid.')
    } catch (e) {
      logError('FoodEntryForm.handleAnalyze', e)
      setError(e.message ?? 'Terjadi kesalahan.')
      toast.error('Gagal menganalisa.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirmSave() {
    if (!pendingResult) return
    setSaving(true)
    const { items, total, totalKarbohidrat, totalProtein, totalLemak, totalSerat, totalNatrium, waktuMakan, tanggal } = pendingResult
    try {
      const { data: logRow, error: logErr } = await supabase
        .from('food_logs')
        .insert({
          user_id: userId,
          tanggal,
          waktu_makan: waktuMakan,
          jam_makan: jamMakan || null,
          total_kalori: total,
          total_karbohidrat: totalKarbohidrat ?? 0,
          total_protein: totalProtein ?? 0,
          total_lemak: totalLemak ?? 0,
          total_serat: totalSerat ?? 0,
          total_natrium: totalNatrium ?? 0,
          idempotency_key: idempotencyKeyRef.current,
          status: 'saved',
        })
        .select()
        .single()

      if (logErr) throw logErr

      const inserts = items.map((x) => ({
        food_log_id: logRow.id,
        nama_makanan: x.nama_makanan,
        jumlah: x.jumlah,
        unit_id: x.unit_id,
        unit_nama: x.unit_nama,
        kalori_estimasi: x.kalori_estimasi,
        karbohidrat: x.karbohidrat ?? 0,
        protein: x.protein ?? 0,
        lemak: x.lemak ?? 0,
        serat: x.serat ?? 0,
        natrium: x.natrium ?? 0,
      }))

      const { error: itemErr } = await supabase.from('food_log_items').insert(inserts)
      if (itemErr) throw itemErr

      setShowSaved(true)
      setPendingResult(null)
      idempotencyKeyRef.current = null
      qc.invalidateQueries({ queryKey: ['food_logs', userId] })
      qc.invalidateQueries({ queryKey: ['food_name_suggestions'] })

      setTimeout(() => {
        setShowSaved(false)
        const nextRow = emptyRow()
        setRows([nextRow])
        setExpandedRowId(nextRow.id)
        setMealKey('')
        setJamMakan('')
        onSaved?.()
      }, 1000)
    } catch (e) {
      logError('FoodEntryForm.handleConfirmSave', e)

      // Idempotency key collision: a previous attempt partially succeeded on the server.
      // Try to recover by fetching the existing row and inserting items against it.
      if (e?.code === '23505' && idempotencyKeyRef.current) {
        try {
          const { data: existing, error: fetchErr } = await supabase
            .from('food_logs')
            .select('id')
            .eq('idempotency_key', idempotencyKeyRef.current)
            .single()

          if (fetchErr) throw fetchErr

          const inserts = items.map((x) => ({
            food_log_id: existing.id,
            nama_makanan: x.nama_makanan,
            jumlah: x.jumlah,
            unit_id: x.unit_id,
            unit_nama: x.unit_nama,
            kalori_estimasi: x.kalori_estimasi,
            karbohidrat: x.karbohidrat ?? 0,
            protein: x.protein ?? 0,
            lemak: x.lemak ?? 0,
            serat: x.serat ?? 0,
            natrium: x.natrium ?? 0,
          }))

          const { error: itemErr } = await supabase.from('food_log_items').insert(inserts)

          if (itemErr) {
            // Items may also already exist (full previous success). Treat as success.
            if (itemErr.code === '23505') {
              // No-op, treat as success below
            } else {
              throw itemErr
            }
          }

          setShowSaved(true)
          setPendingResult(null)
          idempotencyKeyRef.current = null
          qc.invalidateQueries({ queryKey: ['food_logs', userId] })
          qc.invalidateQueries({ queryKey: ['food_name_suggestions'] })

          setTimeout(() => {
            setShowSaved(false)
            const nextRow = emptyRow()
            setRows([nextRow])
            setExpandedRowId(nextRow.id)
            setMealKey('')
            setJamMakan('')
            onSaved?.()
          }, 1000)
        } catch (recoveryErr) {
          logError('FoodEntryForm.handleConfirmSave recovery', recoveryErr)
          toast.error('Gagal menyimpan data. Silakan coba kembali.')
        }
      } else {
        toast.error('Gagal menyimpan data. Silakan coba kembali.')
      }
    } finally {
      setSaving(false)
    }
  }

  function handleDiscard() {
    idempotencyKeyRef.current = null
    setPendingResult(null)
  }

  function handleRemovePendingItem(index) {
    setPendingResult((prev) => {
      if (!prev) return null
      const newItems = prev.items.filter((_, i) => i !== index)
      if (newItems.length === 0) {
        idempotencyKeyRef.current = null
        return null
      }
      return {
        ...prev,
        items: newItems,
        total: newItems.reduce((a, x) => a + (x.kalori_estimasi || 0), 0),
        totalKarbohidrat: newItems.reduce((a, x) => a + (x.karbohidrat || 0), 0),
        totalProtein: newItems.reduce((a, x) => a + (x.protein || 0), 0),
        totalLemak: newItems.reduce((a, x) => a + (x.lemak || 0), 0),
        totalSerat: newItems.reduce((a, x) => a + (x.serat || 0), 0),
        totalNatrium: newItems.reduce((a, x) => a + (x.natrium || 0), 0),
      }
    })
  }

  async function handleAddItems() {
    const filled = addRows
      .map((r) => {
        const unit = unitMap[r.unitId]
        return {
          row: r,
          nama_makanan: (r.nama ?? '').trim(),
          jumlah: r.jumlah === '' ? NaN : Number(r.jumlah),
          unit_id: r.unitId || null,
          unit_nama: unit?.nama ?? '',
        }
      })
      .filter((x) => x.nama_makanan && !Number.isNaN(x.jumlah) && x.jumlah > 0 && x.unit_nama)

    if (!filled.length) return

    setAddLoading(true)
    try {
      const result = await analyzeFood(
        filled.map((x) => ({ nama_makanan: x.nama_makanan, jumlah: x.jumlah, unit_nama: x.unit_nama })),
      )

      if (Array.isArray(result) && result.length > 0) {
        const byName = {}
        for (const e of result) {
          if (e?.nama_makanan != null) byName[String(e.nama_makanan).trim().toLowerCase()] = e
        }

        const newItems = filled.map((x) => {
          const key = x.nama_makanan.toLowerCase()
          const e = byName[key] ?? {}
          return {
            nama_makanan: x.nama_makanan,
            jumlah: x.jumlah,
            unit_id: x.unit_id,
            unit_nama: x.unit_nama,
            kalori_estimasi: Number(e.kalori) || 0,
            karbohidrat: Number(e.karbohidrat) || 0,
            protein: Number(e.protein) || 0,
            lemak: Number(e.lemak) || 0,
            serat: Number(e.serat) || 0,
            natrium: Number(e.natrium) || 0,
          }
        })

        setPendingResult((prev) => {
          if (!prev) return prev
          const merged = [...prev.items, ...newItems]
          return {
            ...prev,
            items: merged,
            total: merged.reduce((a, x) => a + (x.kalori_estimasi || 0), 0),
            totalKarbohidrat: merged.reduce((a, x) => a + (x.karbohidrat || 0), 0),
            totalProtein: merged.reduce((a, x) => a + (x.protein || 0), 0),
            totalLemak: merged.reduce((a, x) => a + (x.lemak || 0), 0),
            totalSerat: merged.reduce((a, x) => a + (x.serat || 0), 0),
            totalNatrium: merged.reduce((a, x) => a + (x.natrium || 0), 0),
          }
        })

        setAddRows([emptyRow()])
        setAddFormOpen(false)
      } else {
        toast.error('Gagal menganalisa makanan.')
      }
    } catch (e) {
      logError('FoodEntryForm.handleAddItems', e)
      toast.error('Gagal menganalisa.')
    } finally {
      setAddLoading(false)
    }
  }

  function addAddRow() {
    setAddRows((prev) => [...prev, emptyRow()])
  }

  function removeAddRow(i) {
    setAddRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)))
  }

  function setAddRow(i, patch) {
    setAddRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  function handleSelesai() {
    idempotencyKeyRef.current = null
    setResult(null)
    const nextRow = emptyRow()
    setRows([nextRow])
    setExpandedRowId(nextRow.id)
    setMealKey('')
    setJamMakan('')
    onSaved?.()
  }

  const displayResult = result || pendingResult
  const isPending = Boolean(pendingResult)

  return (
    <div className="space-y-2 sm:space-y-3 p-4 sm:p-5">
      {showSaved ? (
        <div className="flex items-center justify-center py-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-300">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-6 w-6 text-emerald-600 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-200" />
            </div>
            <span className="text-sm font-medium text-emerald-700">Tersimpan</span>
          </div>
        </div>
      ) : null}
      {displayResult ? (
            <div
              ref={resultRef}
              id="food-entry-result"
              tabIndex={-1}
              className="scroll-mt-24 text-left outline-none sm:scroll-mt-28"
              aria-live="polite"
            >
              <div
                className={cn(
                  'rounded-2xl border px-5 py-4 shadow-sm ring-1 ring-black/5',
                  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:fill-mode-both',
                  isPending
                    ? (MEAL_CARD_COLORS[displayResult.waktuMakan]?.card ?? MEAL_CARD_COLORS.pagi.card)
                    : 'border-border/70 bg-card',
                )}
              >
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
                        MEAL_RECEIPT_BADGE[displayResult.waktuMakan] ?? MEAL_RECEIPT_BADGE.pagi,
                      )}
                    >
                      {mealLabelFromKey(displayResult.waktuMakan)}
                    </span>
                    {isPending ? null : (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                        Tersimpan
                      </span>
                    )}
                  </div>

                  <ul className="mt-3 divide-y divide-border/40">
                    {displayResult.items.map((x, idx) => (
                      <li key={idx} className="py-2.5 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold leading-snug text-foreground">
                                {x.nama_makanan}
                                <span className="ml-1.5 font-normal text-muted-foreground">
                                  {formatNumberId(x.jumlah)} {x.unit_nama}
                                </span>
                              </p>
                              <KaloriValue
                                value={x.kalori_estimasi}
                                className="shrink-0 text-sm font-bold tabular-nums text-teal-800"
                                unitClassName="text-[0.65em] font-normal text-teal-700/70"
                              />
                            </div>
                            <p className="mt-1 truncate text-[11px] text-muted-foreground/70">
                              P: {formatNumberId(x.protein, { maximumFractionDigits: 1 })}g
                              <span className="mx-1 text-border">·</span>
                              K: {formatNumberId(x.karbohidrat, { maximumFractionDigits: 1 })}g
                              <span className="mx-1 text-border">·</span>
                              L: {formatNumberId(x.lemak, { maximumFractionDigits: 1 })}g
                              <span className="mx-1 text-border">·</span>
                              S: {formatNumberId(x.serat, { maximumFractionDigits: 1 })}g
                              <span className="mx-1 text-border">·</span>
                              Na: {formatNumberId(x.natrium, { maximumFractionDigits: 0 })}mg
                            </p>
                          </div>
                          {isPending ? (
                            <div className="flex shrink-0 items-center self-center">
                              <div className="h-7 w-px bg-border" aria-hidden />
                              <button
                                type="button"
                                onClick={() => handleRemovePendingItem(idx)}
                                className="ml-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                                aria-label={`Hapus ${x.nama_makanan}`}
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {isPending ? (
                    <div className={cn('mt-2 border-t pt-2', (MEAL_CARD_COLORS[displayResult.waktuMakan]?.border ?? MEAL_CARD_COLORS.pagi.border))}>
                      <button
                        type="button"
                        className={cn('flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-xs font-medium transition-colors', (MEAL_CARD_COLORS[displayResult.waktuMakan]?.accent ?? MEAL_CARD_COLORS.pagi.accent), (MEAL_CARD_COLORS[displayResult.waktuMakan]?.hover ?? MEAL_CARD_COLORS.pagi.hover))}
                        onClick={() => setAddFormOpen((v) => !v)}
                      >
                        <span className="flex items-center gap-1.5">
                          <Plus className="h-3.5 w-3.5" />
                          Ada yang lupa ditambahkan?
                        </span>
                        <ChevronDown
                          className={cn('h-4 w-4 transition-transform duration-200', addFormOpen && 'rotate-180')}
                        />
                      </button>
                      {addFormOpen ? (
                        <div className="mt-2 space-y-2">
                          {addRows.map((r, i) => (
                            <div key={r.id} className="space-y-2 rounded-lg border border-border/40 bg-background/50 p-2.5">
                              <Input
                                placeholder="Nama makanan"
                                className="food-entry-compact-input h-8 flex-1 text-[13px] placeholder:text-[13px]"
                                value={r.nama}
                                onChange={(e) => setAddRow(i, { nama: e.target.value })}
                              />
                              <div className="flex gap-2">
                                <div className={cn(foodQtyStepperShellClass, 'h-8 min-h-0 w-24 shrink-0 shadow-sm')}>
                                  <button type="button" className={cn(foodQtyStepperBtnClass, 'w-8 sm:w-8')} onClick={() => setAddRow(i, { jumlah: String(Math.max(0, (Number(r.jumlah) || 0) - 0.5)) })} aria-label="Kurangi jumlah">-</button>
                                  <Input
                                    type="number" inputMode="decimal" step="any" min={0} placeholder="0"
                                    className={cn(foodQtyStepperInnerInputClass, 'text-[13px] placeholder:text-[13px]')}
                                    value={r.jumlah}
                                    onChange={(e) => setAddRow(i, { jumlah: e.target.value })}
                                  />
                                  <button type="button" className={cn(foodQtyStepperBtnClass, 'w-8 sm:w-8')} onClick={() => setAddRow(i, { jumlah: String((Number(r.jumlah) || 0) + 0.5) })} aria-label="Tambah jumlah">+</button>
                                </div>
                                <Select value={r.unitId || undefined} onValueChange={(v) => setAddRow(i, { unitId: v })}>
                                  <SelectTrigger className={cn(foodRowControlShell, foodRowSelectFocus, 'h-8 min-h-0 flex-1 text-[13px]')}>
                                    <SelectValue placeholder="Satuan" />
                                  </SelectTrigger>
                                  <SelectContent align="end" className="text-[13px]">
                                    {units.map((u) => (
                                      <SelectItem key={u.id} value={u.id} className="text-[13px]">{u.nama}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {addRows.length > 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => removeAddRow(i)}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive"
                                    aria-label="Hapus baris"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                          <Button
                            type="button" variant="outline" size="sm"
                            className={cn('w-full text-xs', (MEAL_CARD_COLORS[displayResult.waktuMakan]?.accent ?? MEAL_CARD_COLORS.pagi.accent), (MEAL_CARD_COLORS[displayResult.waktuMakan]?.hover ?? MEAL_CARD_COLORS.pagi.hover))}
                            onClick={addAddRow}
                          >
                             <Plus className="mr-1 h-3.5 w-3.5" />
                             Tambah makanan
                          </Button>
                          <div className={cn('flex justify-end gap-2 !mt-3 border-t pt-2', (MEAL_CARD_COLORS[displayResult.waktuMakan]?.divider ?? MEAL_CARD_COLORS.pagi.divider))}>
                            <Button
                              type="button" variant="ghost" size="sm" className="text-xs"
                              onClick={() => { setAddFormOpen(false); setAddRows([emptyRow()]) }}
                            >
                              Batal
                            </Button>
                            <Button
                              type="button" size="sm"
                              className="bg-gradient-to-r from-primary to-primary/90 text-xs shadow-sm shadow-primary/20"
                              onClick={handleAddItems}
                              disabled={addLoading}
                            >
                              {addLoading ? (
                                <Loader2 className={cn('mr-1 h-3.5 w-3.5', !reduceMotion && 'motion-safe:animate-spin')} />
                              ) : (
                                <Sparkles className="mr-1 h-3.5 w-3.5" />
                              )}
                              Analisa
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-3 flex items-end justify-between gap-2 border-t border-border/50 pt-3">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total</p>
                      <p className="text-[11px] text-muted-foreground/60">
                        K: {formatNumberId(displayResult.totalKarbohidrat ?? 0, { maximumFractionDigits: 1 })}g
                        <span className="mx-1">·</span>
                        P: {formatNumberId(displayResult.totalProtein ?? 0, { maximumFractionDigits: 1 })}g
                        <span className="mx-1">·</span>
                        L: {formatNumberId(displayResult.totalLemak ?? 0, { maximumFractionDigits: 1 })}g
                      </p>
                    </div>
                    <KaloriValue
                      value={displayResult.total}
                      className="text-2xl font-bold tracking-tight text-teal-800"
                      unitClassName="text-base font-semibold text-teal-700/75"
                    />
                  </div>

                  {isPending ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={handleDiscard}
                        disabled={saving}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Batal
                      </Button>
                      <Button
                        type="button"
                        className={cn(
                          'w-full sm:w-auto',
                          'bg-gradient-to-r from-primary to-primary/90',
                          'shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/25',
                        )}
                        onClick={handleConfirmSave}
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <Loader2 className={cn('mr-2 h-4 w-4', !reduceMotion && 'motion-safe:animate-spin')} aria-hidden />
                            Menyimpan…
                          </>
                        ) : (
                          <>
                            <Check className="mr-1 h-4 w-4" />
                            Simpan
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={handleSelesai}
                      >
                        <Pencil className="mr-1 h-4 w-4" />
                        Catat lagi
                      </Button>
                      <Button
                        type="button"
                        className={cn(
                          'w-full sm:w-auto',
                          'bg-gradient-to-r from-primary to-primary/90',
                          'shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/25',
                        )}
                        onClick={handleSelesai}
                      >
                        Selesai
                      </Button>
                    </div>
                  )}
                </div>
            </div>
          ) : null}

          {!pendingResult && !showSaved && (
            <>
              <section className="space-y-2">

                <section className="space-y-2">
                  <div
                    className="grid grid-cols-4 gap-1.5"
                    role="radiogroup"
                    aria-label="Waktu makan"
                  >
                    {WAKTU.map((w) => {
                      const Icon = w.icon
                      const isActive = mealKey === w.key
                      return (
                        <button
                          key={w.key}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          onClick={() => handleMealSelect(w.key)}
                          className={cn(
                            'group relative flex flex-col items-center justify-center gap-0.5 rounded-lg border px-1.5 py-1.5 text-center transition-all duration-200',
                            'min-h-[52px]',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            'motion-safe:active:scale-[0.97]',
                            isActive ? w.active : w.pill,
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                          <span className="text-[10px] font-semibold leading-tight">{w.label}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Sesuaikan waktu makan</span>
                    <button
                      type="button"
                      className={cn(
                        'flex h-10 min-h-[44px] w-14 shrink-0 items-center justify-center gap-1 rounded-xl border px-2 text-xs font-semibold tabular-nums transition-all duration-200',
                        'md:h-9 md:min-h-0 md:w-16',
                        mealKey
                          ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                          : 'border-border bg-muted/30 text-muted-foreground',
                        jamError && 'border-destructive/55 ring-1 ring-destructive/25',
                      )}
                      aria-label="Atur jam makan"
                      onClick={() => { setJamCustomOpen(true); setJamError(false) }}
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {jamMakan ? (
                        <span>{jamMakan.slice(0, 5)}</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/50">—:—</span>
                      )}
                    </button>
                    {jamCustomOpen && createPortal(
                      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setJamCustomOpen(false)}>
                        <div
                          className="w-72 rounded-xl border bg-popover p-0 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 duration-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-5 p-6">
                            <div className="flex items-center justify-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground/60" />
                              <span className="text-sm font-semibold tracking-tight text-foreground">Jam makan</span>
                            </div>
                            <div className="flex items-center justify-center gap-4">
                              <TimeScroller min={0} max={23} value={jamHour} onChange={setJamHour} ariaLabel="Jam" />
                              <span className="text-lg font-light text-muted-foreground/60 md:text-base">:</span>
                              <TimeScroller min={0} max={59} value={jamMinute} onChange={setJamMinute} ariaLabel="Menit" />
                            </div>
                          </div>
                          <div className="border-t border-border/60 px-6 py-3">
                            <Button
                              type="button"
                              className="w-full text-sm"
                              onClick={handleJamConfirm}
                            >
                              Simpan
                            </Button>
                          </div>
                        </div>
                      </div>
                    , document.body)
                    }
                  </div>
                  {jamError && (
                    <p className="text-xs leading-relaxed text-destructive" role="alert">Pilih jam makan.</p>
                  )}
                </section>

                <AnimatePresence initial={false}>
                  <div className="space-y-2.5">
                    {rows.map((r, i) => {
                      const isExpanded = r.id === expandedRowId
                      const summary = foodRowSummaryLine(r, unitMap)
                      const rowError = rowErrorsById[r.id]
                      return (
                        <Motion.div
                          key={r.id}
                          initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -12, scale: 0.97 }}
                          transition={{ duration: reduceMotion ? 0.1 : 0.25, ease: [0.22, 1, 0.36, 1] }}
                          role="group"
                          aria-label={`Diary makanan ke-${i + 1}`}
                          data-invalid={rowError ? 'true' : 'false'}
                          ref={rowError ? rowErrorAnchorRef : null}
                          className={cn(
                            'group flex overflow-visible rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm',
                            'ring-1 ring-border/30',
                            'transition-[border-color,box-shadow,ring-color] duration-200',
                            'motion-safe:hover:border-primary/30 motion-safe:hover:shadow-md motion-safe:hover:ring-primary/20',
                            rowError &&
                              'border-destructive/55 ring-destructive/25 bg-destructive/3 motion-safe:hover:border-destructive/55 motion-safe:hover:ring-destructive/25',
                            isExpanded &&
                              'focus-within:border-primary/35 focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring/35',
                          )}
                        >
                          <div className="shrink-0 self-stretch overflow-hidden rounded-l-xl" aria-hidden>
                            <div className="h-full w-1 bg-linear-to-b from-primary/55 via-primary/35 to-primary/15 motion-safe:transition-opacity motion-safe:group-hover:opacity-100 sm:w-1.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 border-b border-border/50 bg-muted/25 px-4 py-3 sm:px-5 sm:py-3.5">
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
                                <span
                                  className={cn(
                                    'min-w-0 flex-1 truncate text-sm font-medium',
                                    summary === 'Item baru' ? 'text-muted-foreground italic' : 'text-foreground',
                                  )}
                                >
                                  {summary === 'Item baru' ? 'Ketuk untuk mengisi makanan...' : summary}
                                </span>
                                {rowError ? (
                                  <span className="shrink-0 rounded-md bg-destructive/10 px-2 py-1 text-[11px] font-semibold text-destructive">
                                    Periksa
                                  </span>
                                ) : null}
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

                            <div
                              id={`food-row-panel-${r.id}`}
                              role="region"
                              aria-labelledby={`food-row-label-${r.id}`}
                              className="collapsible-content"
                              data-open={isExpanded ? 'true' : undefined}
                            >
                              <div className="px-4 py-3 sm:px-5 sm:py-4">
                                {rowError ? (
                                  <p className="mb-2 text-xs leading-relaxed text-destructive" role="alert">
                                    {rowError}
                                  </p>
                                ) : null}
                                <div className="space-y-2">
                                  <div>
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
                                  <div className="flex gap-2">
                                    <div className={cn(foodQtyStepperShellClass, 'flex-1')}>
                                      <button type="button" className={foodQtyStepperBtnClass} onClick={() => adjustRowJumlah(i, -1)} aria-label="Kurangi jumlah">-</button>
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
                                      <button type="button" className={foodQtyStepperBtnClass} onClick={() => adjustRowJumlah(i, 1)} aria-label="Tambah jumlah">+</button>
                                    </div>
                                    <Select value={r.unitId || undefined} onValueChange={(v) => setRow(i, { unitId: v })}>
                                      <SelectTrigger
                                        id={`food-unit-${r.id}`}
                                        aria-label="Satuan"
                                        className={cn(foodRowControlShell, foodRowSelectFocus, foodRowSelectMobileType, 'flex-1 min-w-0 placeholder:text-[13.25px]')}
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
                            </div>
                          </div>
                        </Motion.div>
                      )
                    })}
                  </div>
                </AnimatePresence>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-sm transition-all duration-200 motion-safe:active:scale-[0.99]"
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
                {error && !hasRowErrors ? (
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
                  className={cn(
                    'order-1 h-9 w-full text-sm transition-all duration-200 motion-safe:active:scale-[0.99] sm:order-2 sm:w-auto sm:min-w-44',
                    'bg-gradient-to-r from-primary to-primary/90',
                    'shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/25',
                  )}
                  disabled={loading || saving || !mealKey || !jamMakan || filledCount !== rows.length}
                  onClick={handleAnalyze}
                >
                  {loading ? (
                    <Loader2 className={cn('h-4 w-4', !reduceMotion && 'motion-safe:animate-spin')} aria-hidden />
                  ) : (
                    <Sparkles
                      className={cn(
                        'h-4 w-4',
                        !reduceMotion && !loading && !saving && filledCount === rows.length && mealKey && 'motion-safe:animate-pulse',
                      )}
                      aria-hidden
                    />
                  )}
                  {loading ? 'Menganalisa…' : 'Analisa'}
                </Button>
              </div>
            </>
          )}
    </div>
  )
}
