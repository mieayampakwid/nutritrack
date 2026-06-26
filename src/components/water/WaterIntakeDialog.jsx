import { useState, useMemo, useEffect } from 'react'
import { Droplets } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WaterIntakeList } from '@/components/water/WaterIntakeList'
import { useAddWaterIntake, useWaterIntakeByDate } from '@/hooks/useWaterIntake'
import { getWaterTarget } from '@/lib/waterTargetCalculator'
import { formatNumberId, toIsoDateLocal } from '@/lib/format'

const D = 80
const STROKE = 10
const R = (D - STROKE) / 2
const CIRC = 2 * Math.PI * R

function WaterDonut({ pct, reached, target, consumed, remaining }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const offset = CIRC * (1 - Math.min(pct / 100, 1))
  const color = reached ? '#10b981' : '#3b82f6'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: D, height: D }}>
        <svg viewBox={`0 0 ${D} ${D}`} className="h-full w-full -rotate-90" aria-hidden>
          <circle cx={D / 2} cy={D / 2} r={R} fill="none" stroke="hsl(210 12% 88%)" strokeWidth={STROKE} />
          <circle
            cx={D / 2}
            cy={D / 2}
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={mounted ? offset : CIRC}
            style={{ transition: 'stroke-dashoffset 0.85s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.35s ease-out' }}
          />
          <text
            x={D / 2}
            y={D / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill="currentColor"
            fontSize="15"
            fontWeight="700"
            fontFamily="inherit"
            style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
          >
            {Math.round(pct)}%
          </text>
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formatNumberId(consumed)} ml / {formatNumberId(target)} ml
        </p>
        <p className="text-xs text-muted-foreground">
          {reached ? 'Tercapai' : `Minum ${formatNumberId(remaining)} ml lagi`}
        </p>
      </div>
    </div>
  )
}

export function WaterIntakeDialog({ open, onOpenChange, userId, beratBadan, tanggal: tanggalProp }) {
  const [volume, setVolume] = useState('')
  const [error, setError] = useState('')
  const addMutation = useAddWaterIntake()

  const tanggal = tanggalProp || toIsoDateLocal(new Date())
  const target = getWaterTarget(beratBadan)

  const { data: entries = [] } = useWaterIntakeByDate(
    target != null ? userId : null,
    target != null ? tanggal : null,
  )

  const consumed = useMemo(() => {
    if (!entries.length) return 0
    return entries.reduce((sum, e) => sum + (e.volume_ml || 0), 0)
  }, [entries])

  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0
  const reached = consumed >= target && target > 0
  const remaining = target > 0 ? Math.max(target - consumed, 0) : 0

  function validate(v) {
    const n = Number(v)
    if (!v || v.trim() === '') return 'Volume wajib diisi.'
    if (!Number.isFinite(n) || n <= 0) return 'Volume harus lebih besar dari 0.'
    if (n > 10000) return 'Maksimal 10.000 ml per entri.'
    if (!Number.isInteger(n)) return 'Volume harus bilangan bulat.'
    return ''
  }

  function handlePillClick(amount) {
    setVolume(String(amount))
    setError('')
  }

  const PILLS = [100, 200, 300, 400, 500]

  async function handleAdd() {
    const err = validate(volume)
    if (err) {
      setError(err)
      return
    }
    if (!userId) {
      setError('Akun belum siap. Coba muat ulang.')
      return
    }

    setError('')
    try {
      await addMutation.mutateAsync({
        userId,
        tanggal,
        volumeMl: Number(volume),
      })
      setVolume('')
    } catch {
      // error toast handled by mutation
    }
  }

  function handleOpenChange(o) {
    if (!o) {
      setVolume('')
      setError('')
    }
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asupan air</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {target != null && (
            <div className="flex justify-center py-1">
              <WaterDonut pct={pct} reached={reached} target={target} consumed={consumed} remaining={remaining} />
            </div>
          )}

          <div className="space-y-1">
            <Input
              value={volume}
              onChange={(e) => {
                setVolume(e.target.value)
                if (error) setError('')
              }}
              placeholder="Volume (ml)"
              aria-label="Volume air (ml)"
              inputMode="numeric"
              className={error ? 'border-destructive ring-1 ring-destructive/20' : ''}
              disabled={addMutation.isPending}
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive" role="alert">{error}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PILLS.map((ml) => (
              <button
                key={ml}
                type="button"
                onClick={() => handlePillClick(ml)}
                className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 active:bg-blue-100"
              >
                {ml} ml
              </button>
            ))}
          </div>

          <div className="max-h-40 overflow-y-auto">
            <WaterIntakeList userId={userId} tanggal={tanggal} />
          </div>

          <Button
            onClick={handleAdd}
            disabled={addMutation.isPending || !volume.trim()}
            className="w-full"
          >
            <Droplets className="h-4 w-4" />
            {addMutation.isPending ? 'Mencatat…' : 'Catat Minum'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
