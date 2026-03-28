import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CalorieDisclaimer } from '@/components/shared/CalorieDisclaimer'
import { KaloriValue } from '@/components/shared/KaloriValue'
import { formatDateId, formatNumberId } from '@/lib/format'

const WAKTU = [
  { key: 'pagi', label: 'Pagi' },
  { key: 'siang', label: 'Siang' },
  { key: 'malam', label: 'Malam' },
  { key: 'snack', label: 'Snack' },
]

export function FoodLogDetailModal({ open, onOpenChange, tanggal, logsByMeal, itemsByLogId }) {
  const totalHari = WAKTU.reduce((acc, { key }) => {
    const log = logsByMeal[key]
    return acc + (log ? Number(log.total_kalori) : 0)
  }, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {formatDateId(tanggal)} — Total <KaloriValue value={totalHari} />
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="pagi" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {WAKTU.map(({ key, label }) => (
              <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          {WAKTU.map(({ key }) => {
            const log = logsByMeal[key]
            const items = log ? itemsByLogId[log.id] ?? [] : []
            return (
              <TabsContent key={key} value={key} className="mt-4">
                {!log ? (
                  <p className="text-sm text-muted-foreground">Tidak ada entri.</p>
                ) : items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada item.</p>
                ) : (
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Makanan</TableHead>
                              <TableHead className="text-right">Jml</TableHead>
                              <TableHead>Satuan</TableHead>
                              <TableHead className="text-right">Kkal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((it) => (
                              <TableRow key={it.id}>
                                <TableCell>{it.nama_makanan}</TableCell>
                                <TableCell className="text-right">
                                  {formatNumberId(it.jumlah)}
                                </TableCell>
                                <TableCell>{it.unit_nama}</TableCell>
                                <TableCell className="text-right">
                                  <KaloriValue value={it.kalori_estimasi} />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
        <CalorieDisclaimer className="mt-4" />
      </DialogContent>
    </Dialog>
  )
}
