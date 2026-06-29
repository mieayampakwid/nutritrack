import { useState, useEffect, useRef } from 'react'
import { Droplets, CircleCheck } from 'lucide-react'
/* eslint-disable-next-line no-unused-vars -- motion.div used in JSX below */
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WaterIntakeList } from '@/components/water/WaterIntakeList'
import { useAddWaterIntake } from '@/hooks/useWaterIntake'

const PILLS = [200, 600, 1000]

// eslint-disable-next-line no-unused-vars
export function WaterIntakeDialog({ open, onOpenChange, userId, beratBadan, tanggal: tanggalProp }) {
  const [volume, setVolume] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const closeTimerRef = useRef(null)
  const addMutation = useAddWaterIntake({ silent: true })

  const tanggal = tanggalProp

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
      setSuccess(true)
      closeTimerRef.current = setTimeout(() => {
        setSuccess(false)
        onOpenChange(false)
      }, 1600)
    } catch {
      // error handled silently
    }
  }

  function handleOpenChange(o) {
    if (!o) {
      setVolume('')
      setError('')
      setSuccess(false)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
    onOpenChange(o)
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  function handleEntryClick(volumeMl) {
    setVolume(String(volumeMl))
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={success ? 'sm:max-w-[220px]' : 'sm:max-w-[320px]'}>
        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="flex flex-col items-center justify-center py-10"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                <CircleCheck className="h-12 w-12 text-emerald-500" />
              </div>
              <p className="mt-4 text-center text-sm font-semibold text-neutral-800">
                Asupan air{' '}
                <br />
                Tercatat!
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Droplets className="h-8 w-8 text-blue-500" />
              </div>
              <DialogHeader className="text-center">
                <DialogTitle>Asupan air</DialogTitle>
              </DialogHeader>

              <div className="space-y-1">
                <Input
                  value={volume}
                  onChange={(e) => {
                    setVolume(e.target.value)
                    if (error) setError('')
                  }}
                  aria-label="Volume air (ml)"
                  inputMode="numeric"
                  className={`h-9 w-24 text-center text-sm ${error ? 'border-destructive ring-1 ring-destructive/20' : ''}`}
                  disabled={addMutation.isPending}
                  autoFocus
                />
                {error && (
                  <p className="text-center text-xs text-destructive" role="alert">{error}</p>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                {PILLS.map((ml) => (
                  <button
                    key={ml}
                    type="button"
                    onClick={() => handlePillClick(ml)}
                    className="rounded-full border border-border bg-muted/50 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 active:bg-blue-100"
                  >
                    {ml} ml
                  </button>
                ))}
              </div>

              <div className="max-h-32 w-full overflow-y-auto">
                <WaterIntakeList userId={userId} tanggal={tanggal} onEntryClick={handleEntryClick} silentDelete />
              </div>

              <Button
                onClick={handleAdd}
                disabled={addMutation.isPending || !volume.trim()}
                className="w-full"
              >
                <Droplets className="h-4 w-4" />
                {addMutation.isPending ? 'Mencatat…' : 'Catat Minum'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
