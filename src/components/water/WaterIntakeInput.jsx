import { useState } from 'react'
import { Droplets } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WaterIntakeList } from '@/components/water/WaterIntakeList'
import { useAddWaterIntake } from '@/hooks/useWaterIntake'
import { toIsoDateLocal } from '@/lib/format'
import { KLIEN_DASHBOARD_LOG_CARD_SHELL } from '@/lib/pageCard'

export function WaterIntakeInput({ userId, tanggal: tanggalProp, onSaved }) {
  const [volume, setVolume] = useState('')
  const [error, setError] = useState('')
  const addMutation = useAddWaterIntake()

  const tanggal = tanggalProp || toIsoDateLocal(new Date())

  function validate(v) {
    const n = Number(v)
    if (!v || v.trim() === '') return 'Volume wajib diisi.'
    if (!Number.isFinite(n) || n <= 0) return 'Volume harus lebih besar dari 0.'
    if (n > 10000) return 'Maksimal 10.000 ml per entri.'
    if (!Number.isInteger(n)) return 'Volume harus bilangan bulat.'
    return ''
  }

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
      if (onSaved) onSaved()
    } catch {
      // error toast handled by mutation
    }
  }

  return (
    <Card className={KLIEN_DASHBOARD_LOG_CARD_SHELL}>
      <CardHeader className="space-y-0 p-0 px-4 pb-3 pt-4 sm:px-5 sm:pb-3 sm:pt-5 lg:px-5 lg:pb-3 lg:pt-5">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-sm font-semibold leading-tight tracking-tight text-neutral-900 sm:text-sm md:text-sm">
            Asupan air
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">Catat asupan air minum harian.</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 pt-0 sm:px-5 sm:pb-5 lg:px-5 lg:pb-5 lg:pt-0">
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
          />
          {error && (
            <p className="text-xs text-destructive" role="alert">{error}</p>
          )}
        </div>

        <div className="max-h-48 overflow-y-auto">
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
      </CardContent>
    </Card>
  )
}
