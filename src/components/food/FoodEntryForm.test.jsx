import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/renderWithProviders'

// Radix Select relies on Pointer Events APIs that jsdom lacks.
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => {}
  Element.prototype.releasePointerCapture ??= () => {}
}

// Radix Popover also portals; mock to render inline.
vi.mock('@/components/ui/popover', async () => {
  const React = await import('react')
  const Popover = ({ children }) => React.createElement(React.Fragment, null, children)
  const PopoverTrigger = ({ children }) => React.createElement(React.Fragment, null, children)
  const PopoverContent = ({ children }) =>
    React.createElement('div', { 'data-testid': 'popover-content' }, children)
  return { Popover, PopoverTrigger, PopoverContent }
})

// Radix Select also portals & depends on browser event semantics; mock with native <select>.
vi.mock('@/components/ui/select', async () => {
  const React = await import('react')
  const Ctx = React.createContext(null)

  function collect(node, out) {
    if (!node) return
    if (Array.isArray(node)) return node.forEach((n) => collect(n, out))
    if (typeof node !== 'object') return
    const el = node
    const typeName = el?.type?.displayName || el?.type?.name
    if (typeName === 'SelectItem' && el.props?.value != null) {
      out.push({ value: String(el.props.value), label: el.props.children })
    }
    if (el.props?.children) collect(el.props.children, out)
  }

  const Select = ({ value, onValueChange, children }) => {
    const items = []
    collect(children, items)

    // Find first trigger id if present so Label htmlFor works.
    let triggerId = undefined
    let placeholder = 'Select'
    const probe = []
    collect(children, probe) // no-op; just to traverse (placeholder via SelectValue below)

    React.Children.forEach(children, (child) => {
      if (!child || typeof child !== 'object') return
      const typeName = child?.type?.displayName || child?.type?.name
      if (typeName === 'SelectTrigger' && child.props?.id) triggerId = child.props.id
      if (typeName === 'SelectValue' && child.props?.placeholder) placeholder = child.props.placeholder
    })

    const normalizedValue = value == null ? '' : String(value)
    return (
      <select
        id={triggerId}
        value={normalizedValue}
        onChange={(e) => onValueChange?.(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {items.map((it) => (
          <option key={it.value} value={it.value}>
            {it.label}
          </option>
        ))}
      </select>
    )
  }

  const SelectTrigger = ({ children }) => children
  SelectTrigger.displayName = 'SelectTrigger'
  const SelectValue = ({ placeholder }) => placeholder
  SelectValue.displayName = 'SelectValue'
  const SelectContent = ({ children }) => children
  SelectContent.displayName = 'SelectContent'
  const SelectItem = ({ children }) => children
  SelectItem.displayName = 'SelectItem'

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  }
})

vi.mock('@/hooks/useFoodLog', () => ({
  useFoodUnits: () => ({ data: [{ id: 'g', nama: 'gram' }], isLoading: false }),
  useFoodNameSuggestions: () => ({ data: [], isLoading: false }),
}))

const openaiMock = vi.hoisted(() => ({
  analyzeFood: vi.fn().mockResolvedValue([{ kalori: 200, karbohidrat: 45, protein: 8, lemak: 5, serat: 2, natrium: 400, nama_makanan: 'Nasi Goreng' }]),
}))

vi.mock('@/lib/openai', () => openaiMock)

const { supabaseMock } = vi.hoisted(() => {
  const makeChain = () => {
    const t = {}
    const proxy = new Proxy(t, {
      get(obj, prop) {
        if (prop === 'then') return (res) => res({ data: null, error: null })
        if (!obj[prop]) obj[prop] = vi.fn().mockReturnValue(proxy)
        return obj[prop]
      },
    })
    return proxy
  }
  return {
    supabaseMock: {
      from: vi.fn(() => makeChain()),
      auth: {
        refreshSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: supabaseMock,
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

import { FoodEntryForm } from './FoodEntryForm'

describe('FoodEntryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function setJamMakan(user, hour, minute) {
    // Open the jam makan popover
    await user.click(screen.getByLabelText(/jam makan/i))

    const popover = screen.getAllByTestId('popover-content').find(
      (el) => within(el).queryByLabelText(/tambah jam/i),
    )

    // Click hour stepper to reach target
    const tambahJam = within(popover).getByLabelText(/tambah jam/i)
    for (let i = 0; i < Number(hour); i++) {
      await user.click(tambahJam)
    }

    // Click minute stepper to reach target
    const tambahMenit = within(popover).getByLabelText(/tambah menit/i)
    for (let i = 0; i < Number(minute); i++) {
      await user.click(tambahMenit)
    }

    await user.click(within(popover).getByRole('button', { name: /simpan/i }))
  }

  it('renders the food list header and a single initial food row', () => {
    renderWithProviders(<FoodEntryForm userId="u1" />)
    expect(screen.getByRole('radio', { name: /sarapan/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /diary makanan ke-1/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /analisa/i })).toBeInTheDocument()
  })

  it('"Tambah makanan" button adds a second food row', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FoodEntryForm userId="u1" />)

    await user.click(screen.getByRole('button', { name: /tambah makanan/i }))

    expect(screen.getAllByRole('group', { name: /diary makanan/i })).toHaveLength(2)
  })

  it('shows an error message when submitting with an empty food name', async () => {
    renderWithProviders(<FoodEntryForm userId="u1" />)

    expect(screen.getByRole('button', { name: /analisa/i })).toBeDisabled()
  })

  it('blocks submit until meal type and jam makan selected', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FoodEntryForm userId="u1" />)

    await user.type(screen.getByPlaceholderText(/nama makanan/i), 'Nasi Goreng')
    await user.type(screen.getByPlaceholderText('0'), '1')
    await user.selectOptions(screen.getByLabelText(/satuan/i), 'g')

    expect(screen.getByRole('button', { name: /analisa/i })).toBeDisabled()

    await user.click(screen.getByRole('radio', { name: /sarapan/i }))
    await setJamMakan(user, '7', '5')

    expect(screen.getByRole('button', { name: /analisa/i })).toBeEnabled()
  }, 15000)

  it('does not save when food is invalid, and highlights the invalid row', async () => {
    const user = userEvent.setup()
    openaiMock.analyzeFood.mockResolvedValueOnce({
      valid: false,
      message: '"asdfqwer" sepertinya bukan makanan/minuman yang bisa kami nilai.',
      invalid_indices: [1],
    })

    renderWithProviders(<FoodEntryForm userId="u1" />)

    await user.click(screen.getByRole('radio', { name: /sarapan/i }))
    await setJamMakan(user, '7', '5')

    await user.type(screen.getByPlaceholderText(/nama makanan/i), 'Nasi Goreng')
    await user.type(screen.getByPlaceholderText('0'), '1')
    await user.selectOptions(screen.getByLabelText(/satuan/i), 'g')

    await user.click(screen.getByRole('button', { name: /tambah makanan/i }))
    const groups = screen.getAllByRole('group', { name: /diary makanan/i })
    expect(groups).toHaveLength(2)

    await user.click(within(groups[1]).getByRole('button', { name: /ketuk untuk mengisi makanan/i }))
    await user.type(within(groups[1]).getByPlaceholderText(/nama makanan/i), 'asdfqwer')
    await user.type(within(groups[1]).getByPlaceholderText('0'), '1')
    await user.selectOptions(within(groups[1]).getByLabelText(/satuan/i), 'g')

    await user.click(screen.getByRole('button', { name: /analisa/i }))

    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0))
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent(/asdfqwer/i)

    expect(supabaseMock.from).not.toHaveBeenCalled()

    const groupsAfter = screen.getAllByRole('group', { name: /diary makanan/i })
    expect(groupsAfter[1]).toHaveAttribute('data-invalid', 'true')
  }, 15000)

  it('maps single-item validation error to the only row (no global alert duplication)', async () => {
    const user = userEvent.setup()
    openaiMock.analyzeFood.mockResolvedValueOnce({
      valid: false,
      message: '"bak" sepertinya bukan makanan/minuman yang bisa kami nilai.',
    })

    renderWithProviders(<FoodEntryForm userId="u1" />)

    await user.click(screen.getByRole('radio', { name: /sarapan/i }))
    await setJamMakan(user, '7', '5')
    await user.type(screen.getByPlaceholderText(/nama makanan/i), 'bak')
    await user.type(screen.getByPlaceholderText('0'), '1')
    await user.selectOptions(screen.getByLabelText(/satuan/i), 'g')

    await user.click(screen.getByRole('button', { name: /analisa/i }))

    await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0))
    expect(supabaseMock.from).not.toHaveBeenCalled()

    const onlyGroup = screen.getByRole('group', { name: /diary makanan ke-1/i })
    expect(onlyGroup).toHaveAttribute('data-invalid', 'true')
  }, 15000)

  it('sends food name, quantity, and unit to analyze-food', async () => {
    const user = userEvent.setup()
    openaiMock.analyzeFood.mockResolvedValueOnce({
      valid: false,
      message: '"Bakso 1 gram" sepertinya tidak cocok. Periksa satuan porsinya.',
      invalid_indices: [0],
    })
    renderWithProviders(<FoodEntryForm userId="u1" />)

    await user.click(screen.getByRole('radio', { name: /sarapan/i }))
    await user.type(screen.getByPlaceholderText(/nama makanan/i), 'Bakso')
    await user.type(screen.getByPlaceholderText('0'), '1')
    await user.selectOptions(screen.getByLabelText(/satuan/i), 'g')

    await setJamMakan(user, '7', '5')

    await user.click(screen.getByRole('button', { name: /analisa/i }))

    await waitFor(() => expect(openaiMock.analyzeFood).toHaveBeenCalledTimes(1))
    expect(openaiMock.analyzeFood).toHaveBeenCalledWith([
      { nama_makanan: 'Bakso', jumlah: 1, unit_nama: 'gram' },
    ])
  }, 15000)
})
