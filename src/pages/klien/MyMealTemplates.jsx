import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MealTemplateEditor } from '@/components/food/MealTemplateEditor'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import {
  useMealTemplates,
  useDeleteMealTemplate,
} from '@/hooks/useMealTemplates'
import { formatNumberId } from '@/lib/format'
import { MOBILE_DASHBOARD_CARD_SHELL } from '@/lib/pageCard'
import { cn } from '@/lib/utils'

const cardShell = cn('overflow-hidden border-border/70 shadow-sm', MOBILE_DASHBOARD_CARD_SHELL)

export function MyMealTemplates() {
  const { profile } = useAuth()
  const userId = profile?.id
  const { data: templates = [], isLoading } = useMealTemplates(userId)
  const deleteMutation = useDeleteMealTemplate()
  const [confirmId, setConfirmId] = useState(null)
  const [editor, setEditor] = useState(null) // null | { mode: 'create' } | { mode: 'edit', template }

  const confirmTemplate = confirmId
    ? templates.find((t) => t.id === confirmId) ?? null
    : null

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-4 pb-1">
        <h1 className="text-center text-lg font-semibold tracking-tight text-white max-md:drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)] sm:text-xl md:text-white">
          Template makanan saya
        </h1>

        {editor ? (
          <Card className={cn('p-4 sm:p-5', cardShell)}>
            <MealTemplateEditor
              mode={editor.mode}
              template={editor.mode === 'edit' ? editor.template : undefined}
              userId={userId}
              onDone={() => setEditor(null)}
            />
          </Card>
        ) : (
          <>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => setEditor({ mode: 'create' })}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Tambah template
              </Button>
            </div>

            <Card className={cn('p-0', cardShell)}>
              <div className="space-y-1.5 p-4 sm:p-5">
                {isLoading ? (
                  <LoadingSpinner />
                ) : !editor && templates.length === 0 ? (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    Belum ada template tersimpan. Simpan kombinasi makanan favorit dari halaman konfirmasi.
                  </p>
                ) : (
                  templates.map((t) => {
                    const items = t.meal_template_items ?? []
                    const totalKal = items.reduce(
                      (s, i) => s + Number(i.kalori_estimasi ?? 0),
                      0,
                    )

                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug">{t.nama}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {items.length} item
                            {totalKal > 0 && <> · {formatNumberId(totalKal)} kkal</>}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditor({ mode: 'edit', template: t })}
                            className="shrink-0 p-1 rounded-md text-muted-foreground/50 hover:text-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-colors"
                            aria-label={`Edit template ${t.nama}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(t.id)}
                            className="shrink-0 p-1 rounded-md text-muted-foreground/50 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
                            aria-label={`Hapus template ${t.nama}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      {confirmTemplate && (
        <Dialog
          open={Boolean(confirmId)}
          onOpenChange={(o) => {
            if (!o && !deleteMutation.isPending) setConfirmId(null)
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Hapus template?</DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5 text-sm">
              <p className="text-muted-foreground">
                Template berikut akan dihapus permanen:
              </p>
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 space-y-0.5 text-xs">
                <div className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">Nama:</span>
                  <span className="font-medium text-foreground">{confirmTemplate.nama}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground shrink-0">Isi:</span>
                  <span className="font-medium text-foreground">
                    {confirmTemplate.meal_template_items?.length ?? 0} item
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmId(null)}
                disabled={deleteMutation.isPending}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending || !confirmId}
                onClick={() => {
                  if (!confirmId || !userId) return
                  deleteMutation.mutate(
                    { templateId: confirmId, userId },
                    { onSuccess: () => setConfirmId(null) },
                  )
                }}
              >
                {deleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  )
}
