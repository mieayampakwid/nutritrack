import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Cookie, Coffee, Moon, Plus, Sparkles, Sun, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { CalorieDisclaimer } from '@/components/shared/CalorieDisclaimer'
import {
  useFoodNameSuggestions,
  useFoodUnits,
  useTodayFoodLogSlots,
} from '@/hooks/useFoodLog'
import { estimateCalories } from '@/lib/openai'
import { KaloriValue } from '@/components/shared/KaloriValue'
import { formatNumberId } from '@/lib/format'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const WAKTU = [
  { key: 'pagi', label: 'Sarapan pagi', icon: Coffee },
  { key: 'siang', label: 'Makan siang', icon: Sun },
  { key: 'malam', label: 'Makan malam', icon: Moon },
  { key: 'snack', label: 'Snack', icon: Cookie },
]

const typeLabel = 'text-sm font-medium leading-none text-foreground'
const typeMuted = 'text-sm leading-normal text-muted-foreground'

/** Same chrome as `SelectTrigger` (select.jsx): flex, h-9, border, padding, shadow. */
const foodRowControlShell =
  'flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-background/80 px-3 py-2 text-xs shadow-sm ring-offset-background transition-[color,box-shadow,border-color] duration-200'

/** Mobile: match `input { font-size: 16px }` in index.css (SelectTrigger is a button). */
const foodRowSelectMobileType = 'food-row-select-sync'

const foodRowSelectFocus =
  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1'

/** Dapurasri OrderEntryDialog “Nama Pemesan” panel (popover list under input). */
const foodSuggestPanelClass =
  'absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border bg-popover text-popover-foreground shadow-lg ring-1 ring-black/5'

/** Dapurasri SalesEntryDialog: inline − / number / + inside bordered shell. */
const foodQtyStepperShellClass =
  'inline-flex h-9 shrink-0 items-center overflow-hidden rounded-md border border-input bg-background/80'

const foodQtyStepperInnerInputClass =
  'food-entry-compact-input h-full min-w-0 w-14 rounded-none border-0 bg-transparent px-0 text-center text-xs tabular-nums leading-tight shadow-none [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none focus-visible:ring-0 focus-visible:ring-offset-0'

const foodQtyStepperBtnClass =
  'flex h-full w-8 shrink-0 items-center justify-center text-xs font-medium text-muted-foreground transition-colors hover:bg-accent'

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
        className="food-entry-compact-input bg-background/80 text-xs leading-tight transition-shadow duration-200"
        value={value}
        onChange={(e) => {
          const v = e.target.value
          onChangeNama(v)
          if (v.trim()) onOpen()
          else onClosePanel()
        }}
        onBlur={onCloseRowBlur}
      />
      {open ? (
        <div className={foodSuggestPanelClass} role="listbox">
          {suggestionNames.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">
              Belum ada saran dari log Anda. Lanjut mengetik nama makanan.
            </p>
          ) : null}
          {suggestionNames.length > 0 && filtered.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">
              Tidak ada saran yang cocok. Lanjut dengan nama yang Anda ketik.
            </p>
          ) : null}
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

export function FoodEntryForm({ userId }) {
  const qc = useQueryClient()
  const { data: units = [] } = useFoodUnits()
  const { data: suggestions = [] } = useFoodNameSuggestions()
  const { data: todaySlots = [], isPending: slotsPending } = useTodayFoodLogSlots(userId)

  const [waktu, setWaktu] = useState('pagi')
  const [rows, setRows] = useState([emptyRow()])
  const [suggestionsOpenRowId, setSuggestionsOpenRowId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const filledSlotsToday = useMemo(
    () => new Set(todaySlots.map((r) => r.waktu_makan).filter(Boolean)),
    [todaySlots],
  )
  const allSlotsFilledToday = WAKTU.every(({ key }) => filledSlotsToday.has(key))

  useEffect(() => {
    if (!filledSlotsToday.has(waktu)) return
    const next = WAKTU.find(({ key }) => !filledSlotsToday.has(key))?.key
    if (next) setWaktu(next)
  }, [waktu, filledSlotsToday])

  const suggestionNames = useMemo(
    () => suggestions.map((s) => s.nama_makanan).filter(Boolean),
    [suggestions],
  )

  const unitMap = useMemo(() => Object.fromEntries(units.map((u) => [u.id, u])), [units])

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
    setRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(i) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)))
  }

  async function handleAnalyze() {
    setError('')
    setResult(null)

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

    if (filledSlotsToday.has(waktu)) {
      setError('Waktu makan ini sudah tercatat untuk hari ini.')
      toast.error('Waktu makan ini sudah tercatat hari ini.')
      return
    }

    setLoading(true)
    try {
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

      const tanggal = new Date().toISOString().slice(0, 10)

      const { data: existing, error: existErr } = await supabase
        .from('food_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('tanggal', tanggal)
        .eq('waktu_makan', waktu)
        .maybeSingle()

      if (existErr) throw existErr
      if (existing) {
        setError('Waktu makan ini sudah tercatat untuk hari ini.')
        toast.error('Waktu makan ini sudah tercatat hari ini.')
        qc.invalidateQueries({ queryKey: ['food_logs_today_slots', userId] })
        return
      }

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

      if (logErr) {
        if (logErr.code === '23505') {
          setError('Waktu makan ini sudah tercatat untuk hari ini.')
          toast.error('Waktu makan ini sudah tercatat hari ini.')
          qc.invalidateQueries({ queryKey: ['food_logs_today_slots', userId] })
          return
        }
        throw logErr
      }

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

      setResult({ items: itemsWithKal, total })
      qc.invalidateQueries({ queryKey: ['food_logs', userId] })
      qc.invalidateQueries({ queryKey: ['food_logs_today_slots', userId] })
      qc.invalidateQueries({ queryKey: ['food_name_suggestions'] })
      setRows([emptyRow()])
      toast.success('Data tersimpan.')
    } catch (e) {
      console.error(e)
      setError(e.message ?? 'Terjadi kesalahan.')
      toast.error('Gagal menganalisa atau menyimpan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      <section className="space-y-1.5">
        <div className="flex w-full gap-1.5" aria-label="Waktu makan">
          {WAKTU.map(({ key, label, icon }) => {
            const MealIcon = icon
            const hasSavedToday = filledSlotsToday.has(key)
            const active = waktu === key && !allSlotsFilledToday
            return (
              <Button
                key={key}
                type="button"
                variant={active ? 'default' : 'outline'}
                aria-pressed={active}
                disabled={hasSavedToday}
                aria-label={
                  hasSavedToday ? `${label}, sudah tercatat hari ini` : label
                }
                className={cn(
                  'h-auto min-h-0 flex-1 flex-col gap-0.5 whitespace-normal rounded-lg px-1 py-1.5 text-[0.65rem] font-medium leading-tight transition-all duration-200 motion-safe:active:scale-[0.98] sm:gap-1 sm:px-1.5 sm:py-2 sm:text-xs [&_svg]:h-4 [&_svg]:w-4 sm:[&_svg]:h-5 sm:[&_svg]:w-5',
                  active && 'shadow-sm',
                )}
                onClick={() => setWaktu(key)}
              >
                <MealIcon className="shrink-0 opacity-90" aria-hidden />
                <span className="max-w-full text-center leading-snug">{label}</span>
                {hasSavedToday ? (
                  <span className="max-w-full text-center text-[0.6rem] font-normal leading-tight text-muted-foreground sm:text-[0.65rem]">
                    ✓
                  </span>
                ) : null}
              </Button>
            )
          })}
        </div>
        <p className={typeMuted}>
          Tiap waktu makan hanya sekali per hari. Yang sudah tercatat tidak bisa dipilih lagi. Untuk
          camilan terpisah gunakan waktu &quot;Snack&quot;, atau gabungkan beberapa makanan dalam satu
          daftar sebelum menyimpan.
        </p>
        {allSlotsFilledToday ? (
          <p className="text-sm font-medium text-foreground" role="status">
            Semua waktu makan hari ini sudah tercatat.
          </p>
        ) : null}
      </section>

      <section className="space-y-2 border-t border-border/60 pt-3 sm:pt-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <div className="min-w-0 space-y-0.5">
            <h2 className="text-sm font-semibold leading-tight tracking-tight">
              Daftar makanan
            </h2>
            <p className={typeMuted}>Satu baris = satu jenis makanan beserta porsi dan satuan.</p>
          </div>
          <Badge
            variant="secondary"
            className="w-fit shrink-0 text-sm font-medium tabular-nums transition-colors duration-200"
          >
            {rows.length} item
          </Badge>
        </div>

        <div
          className="hidden gap-2 text-sm font-medium leading-none text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] sm:items-center sm:px-0.5"
          aria-hidden
        >
          <span>Makanan</span>
          <div className="flex min-w-0 items-center gap-2">
            <span className="w-[7.25rem] shrink-0 sm:text-left">Jumlah</span>
            <span className="min-w-0 flex-1">Satuan</span>
          </div>
          <span className="sr-only">Hapus</span>
        </div>

        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div
              key={r.id}
              role="group"
              aria-label={`Entri makanan ke-${i + 1}`}
              className={cn(
                'group flex overflow-visible rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm',
                'ring-1 ring-border/30 dark:ring-border/50',
                'transition-[border-color,box-shadow,ring-color] duration-200',
                'motion-safe:hover:border-primary/30 motion-safe:hover:shadow-md motion-safe:hover:ring-primary/20',
                'focus-within:border-primary/35 focus-within:shadow-md focus-within:ring-2 focus-within:ring-ring/35',
              )}
            >
              <div
                className="w-1 shrink-0 bg-gradient-to-b from-primary/55 via-primary/35 to-primary/15 motion-safe:transition-opacity motion-safe:group-hover:opacity-100 sm:w-1.5"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 border-b border-border/50 bg-muted/25 px-3 py-2 sm:hidden">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="outline"
                      className="h-7 min-w-7 justify-center rounded-lg border-primary/25 bg-background/80 px-0 font-mono text-xs font-semibold tabular-nums text-primary"
                    >
                      {i + 1}
                    </Badge>
                    <span className="truncate text-sm font-medium text-muted-foreground">
                      Item makanan
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeRow(i)}
                    aria-label="Hapus baris"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="p-3 sm:p-3.5">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] sm:items-end">
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
                    <div className="flex min-w-0 flex-wrap items-end gap-2">
                      <div className="grid shrink-0 gap-1.5">
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
                      <div className="grid min-w-0 flex-1 basis-[10rem] gap-1.5">
                        <Label className={cn(typeLabel, 'sm:sr-only')} htmlFor={`food-unit-${r.id}`}>
                          Satuan
                        </Label>
                        <Select
                          value={r.unitId || undefined}
                          onValueChange={(v) => setRow(i, { unitId: v })}
                        >
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
                    <div className="hidden justify-end sm:flex">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeRow(i)}
                        aria-label="Hapus baris"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
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
          disabled={loading || slotsPending || allSlotsFilledToday || filledSlotsToday.has(waktu)}
          onClick={handleAnalyze}
        >
          <Sparkles className="h-4 w-4" />
          {loading ? 'Menganalisa & menyimpan…' : 'Analisa & simpan'}
        </Button>
      </div>

      {result ? (
        <Card
          className={cn(
            'border-primary/20 bg-primary/5 shadow-sm',
            'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:fill-mode-both',
          )}
        >
          <CardHeader className="space-y-1 p-4 pb-2 sm:p-4 sm:pb-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="min-w-0 space-y-0.5">
                <CardTitle className="text-sm font-semibold leading-tight tracking-tight">
                  Tersimpan
                </CardTitle>
                <CardDescription className="text-sm leading-normal">
                  Estimasi kalori untuk entri yang baru saja Anda simpan.
                </CardDescription>
              </div>
              <Badge className="w-fit shrink-0 px-2.5 py-0.5 text-sm font-medium tabular-nums">
                Total <KaloriValue value={result.total} />
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0 sm:space-y-2.5">
            <div className="overflow-x-auto rounded-md border border-border bg-background text-sm shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 text-sm font-medium">Makanan</TableHead>
                    <TableHead className="h-9 text-right text-sm font-medium">Jumlah</TableHead>
                    <TableHead className="h-9 text-sm font-medium">Satuan</TableHead>
                    <TableHead className="h-9 text-right text-sm font-medium">Kkal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((x, idx) => (
                    <TableRow
                      key={idx}
                      className="transition-colors duration-150 motion-safe:hover:bg-muted/40"
                    >
                      <TableCell className="py-2 text-sm font-medium leading-normal">
                        {x.nama_makanan}
                      </TableCell>
                      <TableCell className="py-2 text-right text-sm tabular-nums leading-normal">
                        {formatNumberId(x.jumlah)}
                      </TableCell>
                      <TableCell className="py-2 text-sm leading-normal">{x.unit_nama}</TableCell>
                      <TableCell className="py-2 text-right text-sm tabular-nums leading-normal">
                        <KaloriValue value={x.kalori_estimasi} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <CalorieDisclaimer />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
