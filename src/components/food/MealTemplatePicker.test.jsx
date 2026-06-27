import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { MealTemplatePicker } from './MealTemplatePicker'

const baseTemplates = [
  {
    id: 't1',
    nama: 'Nasi goreng (+2)',
    meal_template_items: [
      { id: 'i1', nama_makanan: 'Nasi goreng', jumlah: 1, unit_nama: 'piring', kalori_estimasi: 400 },
      { id: 'i2', nama_makanan: 'Telur', jumlah: 2, unit_nama: 'butir', kalori_estimasi: 140 },
      { id: 'i3', nama_makanan: 'Kerupuk', jumlah: 3, unit_nama: 'lembar', kalori_estimasi: 30 },
    ],
  },
  {
    id: 't2',
    nama: 'Oatmeal',
    meal_template_items: [
      { id: 'i4', nama_makanan: 'Oatmeal', jumlah: 200, unit_nama: 'gram', kalori_estimasi: 150 },
    ],
  },
]

describe('MealTemplatePicker', () => {
  it('shows empty state when no templates', () => {
    renderWithProviders(
      <MealTemplatePicker
        templates={[]}
        onApply={() => {}}
        onDelete={() => {}}
        isLoading={false}
      />,
    )
    expect(screen.getByText(/belum ada template tersimpan/i)).toBeInTheDocument()
  })

  it('shows skeleton cards while loading', () => {
    const { container } = renderWithProviders(
      <MealTemplatePicker
        templates={[]}
        onApply={() => {}}
        onDelete={() => {}}
        isLoading={true}
      />,
    )
    // Skeleton placeholders: 3 divs with animate-pulse
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons).toHaveLength(3)
    // No empty state or card content should appear
    expect(screen.queryByText(/belum ada template/i)).not.toBeInTheDocument()
  })

  it('renders section header and cards with name, count, and calories', () => {
    renderWithProviders(
      <MealTemplatePicker
        templates={baseTemplates}
        onApply={() => {}}
        onDelete={() => {}}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Template Saya')).toBeInTheDocument()
    expect(screen.getByText('Nasi goreng (+2)')).toBeInTheDocument()
    expect(screen.getByText('3 item · 570 kkal')).toBeInTheDocument()
    expect(screen.getByText('1 item · 150 kkal')).toBeInTheDocument()
  })

  it('calls onApply when a template card is clicked', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()

    renderWithProviders(
      <MealTemplatePicker
        templates={baseTemplates}
        onApply={onApply}
        onDelete={() => {}}
        isLoading={false}
      />,
    )

    await user.click(screen.getByText('Nasi goreng (+2)'))
    expect(onApply).toHaveBeenCalledWith(baseTemplates[0])
  })

  it('delete button is visible at reduced opacity without hover', () => {
    renderWithProviders(
      <MealTemplatePicker
        templates={baseTemplates}
        onApply={() => {}}
        onDelete={() => {}}
        isLoading={false}
      />,
    )
    const deleteButtons = screen.getAllByRole('button', { name: 'Hapus template' })
    // Should have partial opacity (visible on touch) — no opacity-0 class
    expect(deleteButtons[0].className).not.toContain('opacity-0')
    expect(deleteButtons[0].className).toContain('text-muted-foreground/40')
  })

  it('calls onDelete when delete button is clicked without triggering onApply', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const onDelete = vi.fn()

    renderWithProviders(
      <MealTemplatePicker
        templates={baseTemplates}
        onApply={onApply}
        onDelete={onDelete}
        isLoading={false}
      />,
    )

    const deleteButtons = screen.getAllByRole('button', { name: 'Hapus template' })
    await user.click(deleteButtons[0])

    expect(onDelete).toHaveBeenCalledWith('t1')
    expect(onApply).not.toHaveBeenCalled()
  })
})
