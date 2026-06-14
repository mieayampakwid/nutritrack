import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DateRangeFilter } from './DateRangeFilter'

vi.mock('@/components/ui/date-picker', () => ({
  DatePicker: vi.fn(({ value, onChange, placeholder }) => (
    <input
      data-testid={`datepicker-${placeholder}`}
      defaultValue={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )),
}))

describe('DateRangeFilter', () => {
  it('renders two date inputs with labels', () => {
    render(<DateRangeFilter dateFrom="2026-05-01" dateTo="2026-05-09" onChange={vi.fn()} />)
    expect(screen.getByText('Dari')).toBeInTheDocument()
    expect(screen.getByText('Sampai')).toBeInTheDocument()
    const inputs = screen.getAllByTestId('datepicker-DD-MM-YYYY')
    expect(inputs).toHaveLength(2)
    expect(inputs[0]).toHaveValue('2026-05-01')
    expect(inputs[1]).toHaveValue('2026-05-09')
  })

  it('calls onChange when "Dari" date changes', () => {
    const onChange = vi.fn()
    render(<DateRangeFilter dateFrom="2026-05-01" dateTo="2026-05-09" onChange={onChange} />)
    const inputs = screen.getAllByTestId('datepicker-DD-MM-YYYY')
    fireEvent.change(inputs[0], { target: { value: '2026-05-03' } })
    expect(onChange).toHaveBeenCalledWith({ dateFrom: '2026-05-03', dateTo: '2026-05-09' })
  })

  it('auto-swaps dates when from > to', () => {
    const onChange = vi.fn()
    render(<DateRangeFilter dateFrom="2026-05-01" dateTo="2026-05-09" onChange={onChange} />)
    const inputs = screen.getAllByTestId('datepicker-DD-MM-YYYY')
    fireEvent.change(inputs[0], { target: { value: '2026-05-15' } })
    expect(onChange).toHaveBeenCalledWith({ dateFrom: '2026-05-09', dateTo: '2026-05-15' })
  })
})
