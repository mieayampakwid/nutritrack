import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toIsoDateLocal } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/logger'
import { KLIEN_DASHBOARD_LOG_CARD_SHELL } from '@/lib/pageCard'

function normalizeText(s) {
  return String(s ?? '').trim()
}

export function ExerciseLogEntryCard({ userId }) {
  const qc = useQueryClient()
  const [jenis, setJenis] = useState('')
  const [durasi, setDurasi] = useState('')
  const [saving, setSaving] = useState(false)

  const jenisOk = normalizeText(jenis).length > 0
  const durasiOk = normalizeText(durasi).length > 0
  const canSubmit = Boolean(userId) && !saving && jenisOk && durasiOk

  async function handleSubmit(e) {
    e?.preventDefault?.()
    const jenisVal = normalizeText(jenis)
    const durasiVal = normalizeText(durasi)
    if (!jenisVal || !durasiVal) {
      toast.error('Lengkapi jenis olahraga dan durasi.')
      return
    }
    if (!userId) {
      toast.error('Akun belum siap. Coba muat ulang.')
      return
    }

    setSaving(true)
    try {
      const tanggal = toIsoDateLocal(new Date())
      const { error } = await supabase.from('exercise_logs').insert({
        user_id: userId,
        tanggal,
        jenis_olahraga: jenisVal,
        durasi: durasiVal,
      })
      if (error) throw error
      setJenis('')
      setDurasi('')
      qc.invalidateQueries({ queryKey: ['exercise_logs', userId] })
      toast.success('Tersimpan.')
    } catch (err) {
      logError('ExerciseLogEntryCard.handleSubmit', err)
      toast.error('Gagal menyimpan log olahraga.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className={KLIEN_DASHBOARD_LOG_CARD_SHELL}>
      <CardHeader className="space-y-0 p-0 px-4 pb-3 pt-4 sm:px-5 sm:pb-3 sm:pt-5 lg:px-5 lg:pb-3 lg:pt-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-semibold leading-tight tracking-tight text-neutral-900 sm:text-sm md:text-sm">
              Log olahraga
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">Catat untuk hari ini (tanpa pilih tanggal).</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 pt-0 sm:px-5 sm:pb-5 lg:px-5 lg:pb-5 lg:pt-0">
        <form
          onSubmit={handleSubmit}
          className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <Input
            value={jenis}
            onChange={(e) => setJenis(e.target.value)}
            placeholder="Jenis olahraga"
            aria-label="Jenis olahraga"
            className="bg-background/80"
          />
          <Input
            value={durasi}
            onChange={(e) => setDurasi(e.target.value)}
            placeholder="Durasi (mis. 30 menit)"
            aria-label="Durasi"
            className="bg-background/80"
          />
          <Button type="submit" disabled={!canSubmit} className="sm:w-auto">
            {saving ? 'Menyimpan…' : 'Tambah'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

