import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Input } from '@/components/ui/input'

const foodSuggestPanelClass =
  'z-50 max-h-48 overflow-y-auto rounded-xl border bg-popover text-popover-foreground shadow-lg ring-1 ring-black/5'

export function FoodNameSuggestField({
  inputId,
  value,
  suggestionNames,
  open,
  onOpen,
  onClosePanel,
  onCloseRowBlur,
  onPick,
  onChangeNama,
}) {
  const wrapperRef = useRef(null)
  const [dropdownStyle, setDropdownStyle] = useState(null)

  useEffect(() => {
    if (!open || !wrapperRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDropdownStyle(null)
      return
    }
    const id = requestAnimationFrame(() => {
      if (!wrapperRef.current) return
      const rect = wrapperRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    })
    return () => cancelAnimationFrame(id)
  }, [open, value])

  const filtered = useMemo(() => {
    const t = value.trim()
    if (!t || !suggestionNames.length) return []
    const low = t.toLowerCase()
    return suggestionNames.filter((n) => n.toLowerCase().includes(low)).slice(0, 20)
  }, [suggestionNames, value])

  const suggestRowClass =
    'w-full px-3 py-2 text-left text-sm transition-colors duration-100 hover:bg-accent hover:text-accent-foreground'

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Input
        id={inputId}
        placeholder="Nama makanan"
        autoComplete="off"
        className="food-entry-compact-input bg-background/80 text-base leading-tight transition-shadow duration-200 md:text-sm"
        value={value}
        onChange={(e) => {
          const v = e.target.value
          onChangeNama(v)
          if (v.trim()) onOpen()
          else onClosePanel()
        }}
        onBlur={onCloseRowBlur}
      />
      {open && filtered.length > 0 && dropdownStyle
        ? createPortal(
            <div className={foodSuggestPanelClass} style={dropdownStyle} role="listbox">
              {filtered.map((n, idx) => (
                <button
                  key={`${n}-${idx}`}
                  type="button"
                  role="option"
                  className={suggestRowClass}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPick(n)}
                >
                  {n}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
