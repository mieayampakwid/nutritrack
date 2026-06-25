import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'
import { MealTemplatePicker } from './MealTemplatePicker'

const baseTemplates = [
  {
    id: 't1',
    nama: 'Nasi goreng (+2)',
    waktu_makan: 'pagi',
    meal_template_items: [
      { id: 'i1', nama_makanan: 'Nasi goreng', jumlah: 1, unit_nama: 'piring', kalori_estimasi: 400 },
      { id: 'i2', nama_makanan: 'Telur', jumlah: 2, unit_nama: 'butir', kalori_estimasi: 140 },
      { id: 'i3', nama_makanan: 'Kerupuk', jumlah: 3, unit_nama: 'lembar', kalori_estimasi: 30 },
    ],
  },
  {
    id: 't2',
    nama: 'Oatmeal',
    waktu_makan: 'pagi',
    meal_template_items: [
      { id: 'i4', nama_makanan: 'Oatmeal', jumlah: 200, unit_nama: 'gram', kalori_estimasi: 150 },
    ],
  },
]

describe('MealTemplatePicker', () => {
  it('shows empty state when no templates', () => {
    renderWithProviders(
      <MealTemplatePicker
        open={true}
        onOpenChange={() => {}}
        templates={[]}
        onApply={() => {}}
        onDelete={() => {}}
      />,
    )
    expect(screen.getByText('Belum ada template tersimpan.')).toBeInTheDocument()
  })

  it('renders template list with names, item counts, and calorie totals', () => {
    renderWithProviders(
      <MealTemplatePicker
        open={true}
        onOpenChange={() => {}}
        templates={baseTemplates}
        onApply={() => {}}
        onDelete={() => {}}
      />,
    )
    expect(screen.getByText('Nasi goreng (+2)')).toBeInTheDocument()
    expect(screen.getByText('3 item · 570 kkal')).toBeInTheDocument()
    expect(screen.getByText('1 item · 150 kkal')).toBeInTheDocument()
    // "Oatmeal" appears as both the template name and the preview text (single-item)
    expect(screen.getAllByText('Oatmeal')).toHaveLength(2)
  })

  it('renders item preview text', () => {
    renderWithProviders(
      <MealTemplatePicker
        open={true}
        onOpenChange={() => {}}
        templates={baseTemplates}
        onApply={() => {}}
        onDelete={() => {}}
      />,
    )
    expect(screen.getByText('Nasi goreng, Telur, Kerupuk')).toBeInTheDocument()
    // Single-item template: name and preview are the same text
    expect(screen.getAllByText('Oatmeal')).toHaveLength(2)
  })

  it('calls onApply with the template and closes when a template is clicked', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const onOpenChange = vi.fn()

    renderWithProviders(
      <MealTemplatePicker
        open={true}
        onOpenChange={onOpenChange}
        templates={baseTemplates}
        onApply={onApply}
        onDelete={() => {}}
      />,
    )

    await user.click(screen.getByText('Nasi goreng (+2)'))
    expect(onApply).toHaveBeenCalledWith(baseTemplates[0])
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onDelete when the trash button is clicked', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    const onApply = vi.fn()

    renderWithProviders(
      <MealTemplatePicker
        open={true}
        onOpenChange={() => {}}
        templates={baseTemplates}
        onApply={onApply}
        onDelete={onDelete}
      />,
    )

    const deleteButtons = screen.getAllByRole('button', { name: 'Hapus template' })
    await user.click(deleteButtons[0])

    expect(onDelete).toHaveBeenCalledWith('t1')
    expect(onApply).not.toHaveBeenCalled()
  })
})
