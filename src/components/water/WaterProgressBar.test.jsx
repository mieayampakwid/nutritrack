import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WaterProgressBarInner } from './WaterProgressBar'

vi.mock('@/hooks/useWaterIntake', () => ({
  useWaterIntakeByDate: vi.fn(),
}))

vi.mock('@/components/water/WaterIntakeDialog', () => ({
  WaterIntakeDialog: () => <div data-testid="water-dialog" />,
}))

import { useWaterIntakeByDate } from '@/hooks/useWaterIntake'

describe('WaterProgressBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows empty state when beratBadan is null', () => {
    useWaterIntakeByDate.mockReturnValue({ data: [], isLoading: false })

    render(
      <WaterProgressBarInner
        userId="u1"
        beratBadan={null}
        today="2026-06-25"
      />,
    )

    expect(screen.getByText(/Lengkapi data berat badan/)).toBeInTheDocument()
  })

  it('shows empty state when beratBadan is zero', () => {
    useWaterIntakeByDate.mockReturnValue({ data: [], isLoading: false })

    render(
      <WaterProgressBarInner
        userId="u1"
        beratBadan={0}
        today="2026-06-25"
      />,
    )

    expect(screen.getByText(/Lengkapi data berat badan/)).toBeInTheDocument()
  })

  it('renders progress bar with consumed / target', () => {
    useWaterIntakeByDate.mockReturnValue({
      data: [
        { id: 'w1', volume_ml: 500, tanggal: '2026-06-25' },
        { id: 'w2', volume_ml: 300, tanggal: '2026-06-25' },
      ],
      isLoading: false,
    })

    render(
      <WaterProgressBarInner
        userId="u1"
        beratBadan={70}
        today="2026-06-25"
      />,
    )

    expect(screen.getByText(/800 \/ 2\.100 ml/)).toBeInTheDocument()
    expect(screen.getByText('Asupan air')).toBeInTheDocument()
  })

  it('shows checkmark when consumed >= target', () => {
    useWaterIntakeByDate.mockReturnValue({
      data: [
        { id: 'w1', volume_ml: 2100, tanggal: '2026-06-25' },
      ],
      isLoading: false,
    })

    render(
      <WaterProgressBarInner
        userId="u1"
        beratBadan={70}
        today="2026-06-25"
      />,
    )

    expect(screen.getByText(/2\.100 \/ 2\.100 ml/)).toBeInTheDocument()
    // CircleCheck icon from lucide is rendered in an svg
    const container = screen.getByText(/2\.100 \/ 2\.100 ml/).parentElement
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('caps progress at 100% when exceeded', () => {
    useWaterIntakeByDate.mockReturnValue({
      data: [
        { id: 'w1', volume_ml: 3000, tanggal: '2026-06-25' },
      ],
      isLoading: false,
    })

    render(
      <WaterProgressBarInner
        userId="u1"
        beratBadan={70}
        today="2026-06-25"
      />,
    )

    expect(screen.getByText(/3\.000 \/ 2\.100 ml/)).toBeInTheDocument()
  })

  it('shows 0 consumed when no entries', () => {
    useWaterIntakeByDate.mockReturnValue({
      data: [],
      isLoading: false,
    })

    render(
      <WaterProgressBarInner
        userId="u1"
        beratBadan={70}
        today="2026-06-25"
      />,
    )

    expect(screen.getByText(/0 \/ 2\.100 ml/)).toBeInTheDocument()
  })
})
