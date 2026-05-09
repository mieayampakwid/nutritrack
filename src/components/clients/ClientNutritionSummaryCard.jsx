import { useQuery } from '@tanstack/react-query'
import { differenceInYears } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { calculateBMI, getBMICategoryAsiaPacific } from '@/lib/bmiCalculator'
import { formatDateId, formatNumberId, parseIsoDateLocal } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'

function sexLabel(v) {
  if (v === 'male') return 'Laki-laki'
  if (v === 'female') return 'Perempuan'
  return '—'
}

/**
 * @param {{ profile: Record<string, unknown> | null | undefined; className?: string }} props
 */
export function ClientNutritionSummaryCard({ profile, className }) {
  const userId = profile?.id

  const { data: latest, isLoading } = useQuery({
    queryKey: ['assessments', userId, 'latest'],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (error) throw error
      return data?.[0] ?? null
    },
  })

  const ageYears = (() => {
    if (!profile?.tgl_lahir) return null
    const birth = parseIsoDateLocal(String(profile.tgl_lahir).slice(0, 10))
    if (!birth) return null
    return differenceInYears(new Date(), birth)
  })()

  const bb = profile?.berat_badan
  const tb = profile?.tinggi_badan
  const bmi = calculateBMI(bb, tb)
  const bmiCat = getBMICategoryAsiaPacific(bmi)

  const latestEvaluatedDate =
    latest?.created_at != null
      ? formatDateId(String(latest.created_at).slice(0, 10))
      : null

  return (
    <Card className={cn('border-border/80 bg-card shadow-sm ring-1 ring-black/[0.04]', MOBILE_DASHBOARD_CARD_SHELL, className)}>
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-base font-semibold">Ringkasan gizi &amp; kebutuhan energi</CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Data dari profil (BB/TB entri) dan asesmen Harris–Benedict terakhir.
        </p>
        {!isLoading && latestEvaluatedDate ? (
          <p className="pt-0.5 text-sm text-foreground">
            <span className="text-muted-foreground">Terakhir dievaluasi: </span>
            <span className="font-semibold tabular-nums">{latestEvaluatedDate}</span>
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <dl className="grid gap-2.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
          <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
            <dt className="text-muted-foreground">Berat badan</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {bb != null ? `${formatNumberId(bb)} kg` : '—'}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
            <dt className="text-muted-foreground">Tinggi badan</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {tb != null ? `${formatNumberId(tb)} cm` : '—'}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
            <dt className="text-muted-foreground">BMI</dt>
            <dd className="text-right font-medium tabular-nums text-foreground">
              {bmi != null ? (
                <>
                  {formatNumberId(bmi)} <span className="text-muted-foreground">({bmiCat.label})</span>
                </>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
            <dt className="text-muted-foreground">Jenis kelamin</dt>
            <dd className="font-medium text-foreground">{sexLabel(profile?.jenis_kelamin)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-2 gap-y-0.5">
            <dt className="text-muted-foreground">Umur</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {ageYears != null ? `${ageYears} tahun` : '—'}
            </dd>
          </div>
        </dl>

        <div className="rounded-lg border border-primary/20 bg-primary/[0.06] px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Kebutuhan kalori</p>
          {isLoading ? (
            <div className="mt-2 flex justify-center py-2">
              <LoadingSpinner />
            </div>
          ) : latest ? (
            <div className="mt-2 space-y-2">
              <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {formatNumberId(latest.anjuran_kalori_harian ?? latest.energi_total)}{' '}
                <span className="text-base font-semibold text-muted-foreground">kkal/hari</span>
              </p>
              {latest.anjuran_kalori_harian != null ? (
                <p className="text-xs text-muted-foreground">
                  Anjuran ahli gizi{latest.energi_total != null ? ` (HB: ${formatNumberId(latest.energi_total)} kkal/hari)` : ''}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Berdasarkan Harris–Benedict</p>
              )}
              <dl className="grid gap-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>Faktor aktivitas</dt>
                  <dd className="tabular-nums text-foreground">{formatNumberId(latest.faktor_aktivitas)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Faktor stres</dt>
                  <dd className="tabular-nums text-foreground">{formatNumberId(latest.faktor_stres)}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Belum ada asesmen tersimpan. Gunakan menu Entri data (BMI &amp; asesmen) untuk menghitung kebutuhan
              energi.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
