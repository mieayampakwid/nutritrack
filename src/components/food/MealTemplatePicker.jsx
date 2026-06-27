import { Cookie, Trash2 } from 'lucide-react'
import { formatNumberId } from '@/lib/format'

export function MealTemplatePicker({ templates, onApply, onDelete, isLoading }) {
  return (
    <section className="mt-3 rounded-xl border border-border/80 bg-card p-4">
      <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold">
        <Cookie className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        Template Saya
      </h3>

      {isLoading ? (
        <div className="flex gap-3.5 overflow-x-auto pb-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="min-w-[160px] flex-shrink-0 animate-pulse rounded-lg border border-border/40 px-3.5 py-3"
            >
              <div className="mb-2 h-3.5 w-20 rounded bg-muted" />
              <div className="h-2.5 w-14 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada template tersimpan. Simpan kombinasi makanan favorit dari halaman konfirmasi.
        </p>
      ) : (
        <div className="flex gap-3.5 overflow-x-auto pb-1">
          {templates.map((t) => {
            const items = t.meal_template_items ?? []
            const totalKal = items.reduce((s, i) => s + Number(i.kalori_estimasi ?? 0), 0)

            return (
              <div
                key={t.id}
                className="group relative min-w-[160px] flex-shrink-0 cursor-pointer rounded-lg border border-border/40 px-3.5 py-3 transition-colors hover:bg-muted/50"
                onClick={() => {
                  onApply(t)
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') onApply(t) }}
                role="button"
                tabIndex={0}
              >
                <button
                  type="button"
                  className="absolute right-2 top-2 text-muted-foreground/40 transition-opacity hover:text-destructive group-hover:opacity-100"
                  aria-label="Hapus template"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(t.id)
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <p className="pr-5 text-sm font-medium leading-snug">{t.nama}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {items.length} item
                  {totalKal > 0 && <> · {formatNumberId(totalKal)} kkal</>}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
