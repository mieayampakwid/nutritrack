import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Users } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
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
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAdminGroups } from '@/hooks/useAdminGroups'
import { groupCreateSchema } from '@/lib/validators'
import { supabase } from '@/lib/supabase'

function useAvailableAhliGizi() {
  return useQuery({
    queryKey: ['ahli_gizi_available'],
    queryFn: async () => {
      // Get nutritionists who are not already assigned to a group
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nama, email')
        .eq('role', 'ahli_gizi')
      if (error) throw error

      const profiles = data ?? []
      // Get assigned nutritionist IDs
      const { data: groups } = await supabase
        .from('groups')
        .select('ahli_gizi_id')
      const assignedIds = new Set(groups?.map((g) => g.ahli_gizi_id) ?? [])

      return profiles.filter((p) => !assignedIds.has(p.id))
    },
  })
}

function useAvailableKlien() {
  return useQuery({
    queryKey: ['klien_available'],
    queryFn: async () => {
      // Get clients who are not already assigned to any group
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nama, email')
        .eq('role', 'klien')
      if (error) throw error

      const profiles = data ?? []
      // Get assigned client IDs
      const { data: members } = await supabase
        .from('group_members')
        .select('klien_id')
      const assignedIds = new Set(members?.map((m) => m.klien_id) ?? [])

      return profiles.filter((p) => !assignedIds.has(p.id))
    },
  })
}

export function AdminGroups() {
  const qc = useQueryClient()
  const { data: groups = [], isLoading } = useAdminGroups()
  const { data: availableAhliGizi = [] } = useAvailableAhliGizi()
  const { data: availableKlien = [] } = useAvailableKlien()

  const [search, setSearch] = useState('')
  const [openCreate, setOpenCreate] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState('')
  const [form, setForm] = useState({ nama: '', ahli_gizi_id: '' })
  const [selectedMembers, setSelectedMembers] = useState([])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return groups
    return groups.filter(
      (g) =>
        g.nama.toLowerCase().includes(q) ||
        (g.ahli_gizi_nama || '').toLowerCase().includes(q)
    )
  }, [groups, search])

  const createMutation = useMutation({
    mutationFn: async () => {
      const result = groupCreateSchema.safeParse(form)
      if (!result.success) {
        throw new Error(result.error.issues[0].message)
      }
      const { data, error } = await supabase
        .from('groups')
        .insert({ nama: form.nama.trim(), ahli_gizi_id: form.ahli_gizi_id })
        .select()
        .single()
      if (error) throw error

      // Add members if any selected
      if (selectedMembers.length > 0) {
        const members = selectedMembers.map((klien_id) => ({
          group_id: data.id,
          klien_id,
        }))
        const { error: memberError } = await supabase
          .from('group_members')
          .insert(members)
        if (memberError) throw memberError
      }

      return data
    },
    onSuccess: () => {
      toast.success('Grup dibuat.')
      setOpenCreate(false)
      qc.invalidateQueries({ queryKey: ['admin_groups'] })
      setForm({ nama: '', ahli_gizi_id: '' })
      setSelectedMembers([])
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal membuat grup.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (groupId) => {
      const { error } = await supabase.from('groups').delete().eq('id', groupId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Grup dihapus.')
      setConfirmDeleteId('')
      qc.invalidateQueries({ queryKey: ['admin_groups'] })
    },
    onError: (e) => {
      toast.error(e.message ?? 'Gagal menghapus grup.')
    },
  })

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <Card className="overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-sm ring-1 ring-black/4">
          <CardContent className="p-0">
            <div className="p-4 md:p-5">
              <div>
                <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Kelola Grup</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:mt-1.5">
                  Satu ahli gizi per grup, satu grup per klien.
                </p>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={() => setOpenCreate(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah grup
                </Button>
              </div>
            </div>

            <div className="border-t border-border/60 bg-background">
              <div className="flex items-center px-4 py-3 md:px-5">
                <Input
                  type="search"
                  placeholder="Cari nama grup atau ahli gizi…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-md"
                  autoComplete="off"
                />
                <p className="ml-4 text-sm text-muted-foreground">
                  {filtered.length} grup
                </p>
              </div>

              {isLoading ? (
                <div className="border-t border-border/60 py-12">
                  <LoadingSpinner />
                </div>
              ) : filtered.length === 0 ? (
                <div className="border-t border-border/60 px-4 py-10 text-center text-sm text-muted-foreground md:px-5">
                  {groups.length === 0 ? 'Belum ada grup.' : 'Tidak ada yang cocok dengan pencarian.'}
                </div>
              ) : (
                <>
                  <div className="divide-y divide-border border-t border-border/60 md:hidden">
                    {filtered.map((g) => (
                      <div
                        key={g.id}
                        className="flex min-h-10 items-center gap-2 bg-card px-3 py-2 text-left text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-foreground">{g.nama}</span>
                            <Badge variant="secondary" className="flex items-center gap-1 px-1.5 py-0 text-[10px]">
                              <Users className="h-2.5 w-2.5" />
                              {g.member_count ?? 0}
                            </Badge>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {g.ahli_gizi_nama || 'Ahli gizi belum ditetapkan'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setConfirmDeleteId(g.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="hidden border-t border-border/60 md:block">
                    <Table className="text-xs">
                      <TableHeader className="sticky top-0 z-1 bg-table-header shadow-[0_1px_0_0_var(--color-table-line)]">
                        <TableRow className="border-table-line hover:bg-transparent">
                          <TableHead className="h-8 py-1.5 pl-3 pr-1 font-semibold text-table-header-foreground">
                            Nama grup
                          </TableHead>
                          <TableHead className="h-8 py-1.5 px-1 font-semibold text-table-header-foreground">
                            Ahli gizi
                          </TableHead>
                          <TableHead className="h-8 py-1.5 px-1 font-semibold text-table-header-foreground">
                            Jumlah klien
                          </TableHead>
                          <TableHead className="h-8 w-40 py-1.5 px-1 font-semibold text-table-header-foreground text-right">
                            Aksi
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map((g) => (
                          <TableRow
                            key={g.id}
                            className="border-table-line hover:bg-table-row-hover"
                          >
                            <TableCell className="py-1.5 pl-3 pr-1 font-medium">
                              {g.nama}
                            </TableCell>
                            <TableCell className="py-1.5 px-1">
                              {g.ahli_gizi_nama || '—'}
                            </TableCell>
                            <TableCell className="py-1.5 px-1">
                              <Badge variant="secondary" className="font-normal">
                                {g.member_count ?? 0} klien
                              </Badge>
                            </TableCell>
                            <TableCell className="py-1 px-1 pr-2 text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setConfirmDeleteId(g.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah grup</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Nama grup</Label>
              <Input
                value={form.nama}
                onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
                placeholder="Contoh: Grup A"
              />
            </div>
            <div className="space-y-1">
              <Label>Ahli gizi</Label>
              <Select
                value={form.ahli_gizi_id}
                onValueChange={(v) => setForm((f) => ({ ...f, ahli_gizi_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih ahli gizi" />
                </SelectTrigger>
                <SelectContent>
                  {availableAhliGizi.map((ag) => (
                    <SelectItem key={ag.id} value={ag.id}>
                      {ag.nama} ({ag.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Klien (opsional)</Label>
              <p className="text-xs text-muted-foreground">
                Klien dapat ditambahkan nanti. Pilih klien untuk ditambahkan sekarang.
              </p>
              <div className="max-h-40 overflow-auto rounded-md border border-border/60 p-2">
                {availableKlien.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada klien tersedia.</p>
                ) : (
                  availableKlien.map((k) => (
                    <label
                      key={k.id}
                      className="flex items-center gap-2 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(k.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers([...selectedMembers, k.id])
                          } else {
                            setSelectedMembers(selectedMembers.filter((id) => id !== k.id))
                          }
                        }}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span>{k.nama}</span>
                      <span className="text-muted-foreground">({k.email})</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Batal
            </Button>
            <Button
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(confirmDeleteId)}
        onOpenChange={(o) => {
          if (!o && !deleteMutation.isPending) setConfirmDeleteId('')
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus grup?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tindakan ini akan menghapus grup dan semua klien di dalamnya. Ini tidak bisa dibatalkan.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteId('')}
              disabled={deleteMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending || !confirmDeleteId}
              onClick={() => deleteMutation.mutate(confirmDeleteId)}
            >
              {deleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
