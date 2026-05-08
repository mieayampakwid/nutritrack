import { AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function CalorieDisclaimer({ className }) {
  return (
    <Card
      className={cn(
        'border-amber-300 bg-amber-50 text-amber-950',
        'max-md:rounded-3xl max-md:shadow-md',
        className,
      )}
    >
      <CardContent className="flex gap-2.5 p-3 pt-3 sm:p-4 sm:pt-4 lg:pt-8">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0 space-y-1 text-sm leading-normal">
          <p className="font-semibold leading-tight">Informasi Nutrisi — Hanya Estimasi</p>
          <p className="text-amber-900/90">
            Nilai kalori dan kandungan gizi yang ditampilkan adalah estimasi awal berdasarkan analisa
            AI dan tidak menggantikan penilaian klinis. Untuk konfirmasi lebih
            lanjut mengenai kebutuhan gizi Anda, silakan konsultasikan dengan Ahli
            Gizi di instalasi Anda.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
