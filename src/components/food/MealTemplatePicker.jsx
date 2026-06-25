import { Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatNumberId } from '@/lib/format'
import { cn } from '@/lib/utils'

export function MealTemplatePicker({ open, onOpenChange, templates, onApply, onDelete }) {
  const handleSelect = (template) => {
    onApply(template)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Template Makanan</DialogTitle>
        </DialogHeader>

        {templates.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada template tersimpan.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {templates.map((t) => {
              const items = t.meal_template_items ?? []
              const totalKal = items.reduce((s, i) => s + Number(i.kalori_estimasi ?? 0), 0)
              const preview = items.map((i) => i.nama_makanan).join(', ')

              return (
                <li key={t.id}>
                  <div
                    className={cn(
                      'flex items-start gap-3 rounded-xl border p-3',
                      'cursor-pointer transition-colors hover:bg-muted/50',
                    )}
                    onClick={() => handleSelect(t)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSelect(t) }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight">{t.nama}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {items.length} item
                        {totalKal > 0 && <> · {formatNumberId(totalKal)} kkal</>}
                      </p>
                      {preview && (
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {preview}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Hapus template"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(t.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
