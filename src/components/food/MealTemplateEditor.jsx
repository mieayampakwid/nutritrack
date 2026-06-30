import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useReducedMotion } from 'framer-motion'
import { ArrowLeft, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { FoodEntryAiAnalyzingPanel } from '@/components/food/FoodEntryAiAnalyzingPanel'
import { FoodNameSuggestField } from '@/components/food/FoodNameSuggestField'
import { useFoodNameSuggestions, useFoodUnits } from '@/hooks/useFoodLog'
import {
  useCreateMealTemplate,
  useUpdateMealTemplate,
} from '@/hooks/useMealTemplates'
import { analyzeFood } from '@/lib/openai'
import { KaloriValue } from '@/components/shared/KaloriValue'
import { formatNumberId } from '@/lib/format'
import { cn } from '@/lib/utils'

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

function emptyRow() {
  return { id: safeUUID(), nama: '', jumlah: '', unitId: '' }
}

const foodQtyStepperShellClass =
  'flex h-10 min-h-[44px] w-full min-w-0 items-center overflow-hidden rounded-md border border-input bg-background/80 md:h-9 md:min-h-0'

const foodQtyStepperInnerInputClass =
  'food-entry-compact-input h-full min-h-0 min-w-0 w-12 flex-1 rounded-none border-0 bg-transparent px-0 text-center text-base tabular-nums leading-tight shadow-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:w-14 sm:flex-none md:text-sm'

const foodQtyStepperBtnClass =
  'flex h-full w-9 shrink-0 items-center justify-center text-sm font-medium text-muted-foreground transition-colors hover:bg-accent sm:w-10 md:w-8 md:text-xs'

export function MealTemplateEditor({ mode, template, userId, onDone }) {
  const reduceMotion = useReducedMotion()
  const { data: units = [] } = useFoodUnits()
  const { data: suggestions = [] } = useFoodNameSuggestions()
  const createTemplate = useCreateMealTemplate()
  const updateTemplate = useUpdateMealTemplate()

  const suggestionNames = useMemo(
    () => suggestions.map((s) => s.nama_makanan).filter(Boolean),
    [suggestions],
  )
  const unitMap = useMemo(() => Object.fromEntries(units.map((u) => [u.id, u])), [units])

  const isEdit = mode === 'edit'
  const [nama, setNama] = useState(isEdit ? template.nama : '')
  const [rows, setRows] = useState(() => {
    if (isEdit && template.meal_template_items?.length) {
      return template.meal_template_items.map((it) => ({
        id: safeUUID(),
        nama: it.nama_makanan ?? '',
        jumlah: String(it.jumlah ?? ''),
        unitId: it.unit_id ?? '',
      }))
    }
    return [emptyRow()]
  })
  const [suggestionsOpenRowId, setSuggestionsOpenRowId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [analyzedItems, setAnalyzedItems] = useState(null)
  const [totals, setTotals] = useState(null)
  const rowsSnapshotRef = useRef(null)

  function setRow(index, patch) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
    setAnalyzedItems(null)
    setTotals(null)
  }

  function adjustRowJumlah(index, delta) {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r
        const cur = r.jumlah === '' ? 0 : Number(r.jumlah)
        const next = Math.max(0, +(cur + delta).toFixed(1))
        return { ...r, jumlah: next === 0 ? '' : String(next) }
      }),
    )
    setAnalyzedItems(null)
    setTotals(null)
  }

  function addRow() {
    const nr = emptyRow()
    setRows((prev) => [...prev, nr])
    setSuggestionsOpenRowId(null)
  }

  function removeRow(index) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
    setAnalyzedItems(null)
    setTotals(null)
  }

  const filledCount = useMemo(() => rows.filter((r) => {
    const n = r.nama.trim()
    const j = r.jumlah === '' ? NaN : Number(r.jumlah)
    const u = r.unitId ? unitMap[r.unitId]?.nama : ''
    return n && !Number.isNaN(j) && j > 0 && u
  }).length, [rows, unitMap])

  const isSaving = createTemplate.isPending || updateTemplate.isPending
  const canAnalyze = !loading && !isSaving && filledCount === rows.length && rows.length > 0

  async function handleAnalyze() {
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

    if (filled.length === 0) return

    setLoading(true)
    try {
      const result = await analyzeFood(
        filled.map((x) => ({
          nama_makanan: x.nama_makanan,
          jumlah: x.jumlah,
          unit_nama: x.unit_nama,
        })),
      )

      if (!Array.isArray(result)) {
        toast.error(result?.message ?? 'Gagal menganalisa.')
        return
      }

      const byName = {}
      for (const e of result) {
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

      rowsSnapshotRef.current = rows
      setAnalyzedItems(itemsWithKal)
      setTotals({ total, totalKarbohidrat, totalProtein, totalLemak, totalSerat, totalNatrium })
    } catch (err) {
      toast.error(err.message ?? 'Terjadi kesalahan saat menganalisa.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    const trimmedNama = nama.trim()
    if (!trimmedNama) {
      toast.error('Nama template harus diisi.')
      return
    }
    if (!analyzedItems || !totals) {
      toast.error('Analisa makanan terlebih dahulu.')
      return
    }

    const items = analyzedItems.map((x) => ({
      nama_makanan: x.nama_makanan,
      jumlah: x.jumlah,
      unit_id: x.unit_id,
      unit_nama: x.unit_nama,
      kalori_estimasi: x.kalori_estimasi,
      karbohidrat: x.karbohidrat,
      protein: x.protein,
      lemak: x.lemak,
      serat: x.serat,
      natrium: x.natrium,
    }))

    try {
      if (isEdit) {
        await updateTemplate.mutateAsync({ templateId: template.id, userId, nama: trimmedNama, items })
      } else {
        await createTemplate.mutateAsync({ userId, nama: trimmedNama, items })
      }
      onDone()
    } catch {
      // mutations handle their own error toasts
    }
  }

  return (
    <div className="space-y-4">
      {/* Back button + title */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDone}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Kembali</span>
        </Button>
        <h2 className="text-lg font-semibold tracking-tight">
          {isEdit ? 'Edit template' : 'Template baru'}
        </h2>
      </div>

      {/* Template name */}
      <div>
        <label htmlFor="template-nama" className="mb-1 block text-sm font-medium text-muted-foreground">
          Nama template
        </label>
        <Input
          id="template-nama"
          placeholder="contoh: Sarapan sehat"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Food items */}
      <div className="space-y-2.5">
        <h3 className="text-sm font-medium text-muted-foreground">Item makanan</h3>

        {rows.map((r, i) => (
          <Card key={r.id} className="p-3 sm:p-4">
            <div className="space-y-2">
              {/* Food name */}
              <FoodNameSuggestField
                inputId={`tpl-food-name-${r.id}`}
                value={r.nama}
                suggestionNames={suggestionNames}
                open={suggestionsOpenRowId === r.id}
                onOpen={() => setSuggestionsOpenRowId(r.id)}
                onClosePanel={() => setSuggestionsOpenRowId((cur) => (cur === r.id ? null : cur))}
                onCloseRowBlur={() => {
                  setTimeout(() => {
                    setSuggestionsOpenRowId((cur) => (cur === r.id ? null : cur))
                  }, 200)
                }}
                onPick={(n) => {
                  setRow(i, { nama: n })
                  setSuggestionsOpenRowId(null)
                }}
                onChangeNama={(v) => setRow(i, { nama: v })}
              />

              {/* Qty + Unit */}
              <div className="flex gap-2">
                <div className={cn(foodQtyStepperShellClass, 'flex-1 shadow-sm')}>
                  <button
                    type="button"
                    className={foodQtyStepperBtnClass}
                    onClick={() => adjustRowJumlah(i, -0.5)}
                    aria-label="Kurangi jumlah"
                  >
                    -
                  </button>
                  <Input
                    id={`tpl-food-qty-${r.id}`}
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
                    onClick={() => adjustRowJumlah(i, 0.5)}
                    aria-label="Tambah jumlah"
                  >
                    +
                  </button>
                </div>
                <Select
                  value={r.unitId || undefined}
                  onValueChange={(v) => setRow(i, { unitId: v })}
                >
                  <SelectTrigger id={`tpl-food-unit-${r.id}`} aria-label="Satuan" className="flex-1 min-w-0">
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
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="shrink-0 p-2 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label="Hapus item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={loading || isSaving} className="w-full">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Tambah makanan
        </Button>
      </div>

      {/* Analyze button + panel */}
      <div className="space-y-3">
        <Button
          type="button"
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className="w-full gap-1.5"
        >
          {loading ? (
            <Loader2 className={cn('h-4 w-4', !reduceMotion && 'motion-safe:animate-spin')} aria-hidden />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden />
          )}
          {loading ? 'Menganalisa…' : 'Analisa'}
        </Button>

        <FoodEntryAiAnalyzingPanel active={loading} reduceMotion={reduceMotion} />
      </div>

      {/* Analyzed results */}
      {analyzedItems && totals && (
        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">Hasil analisa</h3>

          <ul className="divide-y divide-border/50">
            {analyzedItems.map((x, idx) => (
              <li key={idx} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold leading-snug text-foreground">
                    {x.nama_makanan}
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      {formatNumberId(x.jumlah)} {x.unit_nama}
                    </span>
                  </p>
                  <KaloriValue value={x.kalori_estimasi} className="shrink-0 text-sm font-bold tabular-nums text-teal-800" unitClassName="text-[0.65em] font-normal text-teal-700/70" />
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
              </li>
            ))}
          </ul>

          {/* Total */}
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/40 px-3 py-2">
            <span className="text-sm font-medium">Total</span>
            <KaloriValue value={totals.total} className="text-base font-bold tabular-nums text-teal-800" />
          </div>
          <p className="text-[11px] text-muted-foreground text-right">
            P: {formatNumberId(totals.totalProtein, { maximumFractionDigits: 1 })}g
            <span className="mx-1 text-border">·</span>
            K: {formatNumberId(totals.totalKarbohidrat, { maximumFractionDigits: 1 })}g
            <span className="mx-1 text-border">·</span>
            L: {formatNumberId(totals.totalLemak, { maximumFractionDigits: 1 })}g
            <span className="mx-1 text-border">·</span>
            S: {formatNumberId(totals.totalSerat, { maximumFractionDigits: 1 })}g
          </p>
        </div>
      )}

      {/* Save button — only show after analysis */}
      {analyzedItems && totals && (
      <div className="flex items-center gap-2 pt-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || loading || !nama.trim() || !analyzedItems}
        >
          {isSaving ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>
      )}
    </div>
  )
}
