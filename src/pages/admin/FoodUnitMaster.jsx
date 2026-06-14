import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { ADMIN_TABLE_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

export function FoodUnitMaster() {
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { data: units = [], isLoading } = useQuery({
    queryKey: ['food_units'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_units')
        .select('*')
        .order('nama')
      if (error) throw error
      return data ?? []
    },
  })

  const [open, setOpen] = useState(false)
  const [nama, setNama] = useState('')
  const [edit, setEdit] = useState(null)

  const insertMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('food_units').insert({
        nama: nama.trim(),
        created_by: profile?.id,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Satuan ditambahkan.')
      setOpen(false)
      setNama('')
      qc.invalidateQueries({ queryKey: ['food_units'] })
    },
    onError: (e) => toast.error(e.message ?? 'Gagal.'),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('food_units')
        .update({ nama: edit.nama.trim() })
        .eq('id', edit.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Diperbarui.')
      setEdit(null)
      qc.invalidateQueries({ queryKey: ['food_units'] })
    },
    onError: (e) => toast.error(e.message ?? 'Gagal.'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (row) => {
      const { error } = await supabase.from('food_units').delete().eq('id', row.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Dihapus.')
      qc.invalidateQueries({ queryKey: ['food_units'] })
    },
    onError: (e) => toast.error(e.message ?? 'Gagal hapus (mungkin masih dipakai).'),
  })

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="max-md:px-0.5">
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl md:text-white">Master ukuran</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-1.5 md:text-white/85">
              Daftar satuan porsi (mis. centong, sendok) untuk entri makanan. Hapus hanya jika tidak dipakai data.
            </p>
          </div>
          <Button className="w-full shrink-0 sm:w-auto" onClick={() => setOpen(true)}>
            Tambah satuan
          </Button>
        </div>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <Card className={cn('overflow-hidden', ADMIN_TABLE_CARD_SHELL)}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead className="w-[160px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.nama}</TableCell>
                      <TableCell className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setEdit({ ...u })}>
                          Ubah
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMutation.mutate(u)}
                        >
                          Hapus
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Satuan baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nama</Label>
            <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. centong" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button disabled={insertMutation.isPending} onClick={() => insertMutation.mutate()}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(edit)} onOpenChange={() => setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah satuan</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={edit.nama}
                onChange={(e) => setEdit((r) => ({ ...r, nama: e.target.value }))}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>
              Batal
            </Button>
            <Button disabled={updateMutation.isPending} onClick={() => updateMutation.mutate()}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
