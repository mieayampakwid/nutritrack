import { cn } from '@/lib/utils'

/**
 * @param {{ open: boolean; allowDecimal?: boolean; onInput: (digit: string) => void; onBackspace: () => void; onDone: () => void; className?: string }} props
 */
export function LargeNumericKeypad({
  open,
  allowDecimal = true,
  onInput,
  onBackspace,
  onDone,
  className,
}) {
  if (!open) return null

  const row = (digits) => (
    <div className="grid grid-cols-3 gap-2">
      {digits.map((k) =>
        k === '_' ? (
          <div key="sp" className="min-h-[3rem]" aria-hidden />
        ) : (
          <button
            key={k}
            type="button"
            className="min-h-[3rem] rounded-xl border border-border bg-background text-xl font-semibold tabular-nums shadow-sm active:scale-[0.98] sm:min-h-[3.25rem] sm:text-2xl"
            onClick={() => onInput(k)}
          >
            {k}
          </button>
        ),
      )}
    </div>
  )

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-card/98 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md',
        className,
      )}
      role="dialog"
      aria-label="Keypad angka"
    >
      <div className="mx-auto flex max-w-lg flex-col gap-2">
        {row(['1', '2', '3'])}
        {row(['4', '5', '6'])}
        {row(['7', '8', '9'])}
        <div className="grid grid-cols-3 gap-2">
          {allowDecimal ? (
            <button
              type="button"
              className="min-h-[3rem] rounded-xl border border-border bg-background text-xl font-semibold shadow-sm active:scale-[0.98] sm:min-h-[3.25rem]"
              onClick={() => onInput('.')}
            >
              .
            </button>
          ) : (
            <div className="min-h-[3rem]" aria-hidden />
          )}
          <button
            type="button"
            className="min-h-[3rem] rounded-xl border border-border bg-background text-xl font-semibold tabular-nums shadow-sm active:scale-[0.98] sm:min-h-[3.25rem] sm:text-2xl"
            onClick={() => onInput('0')}
          >
            0
          </button>
          <button
            type="button"
            className="min-h-[3rem] rounded-xl border border-border bg-muted/60 text-lg font-semibold active:scale-[0.98] sm:min-h-[3.25rem] sm:text-xl"
            onClick={onBackspace}
          >
            ⌫
          </button>
        </div>
        <button
          type="button"
          className="min-h-11 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-sm active:scale-[0.99] sm:min-h-12"
          onClick={onDone}
        >
          Selesai
        </button>
      </div>
    </div>
  )
}
