import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AssessmentForm } from './AssessmentForm'

const mockClient = {
  id: 'client-1',
  nama: 'Test Client',
  jenis_kelamin: 'female',
  tgl_lahir: '1990-01-01',
}

const mockLastAssessment = {
  tanggal: '2024-01-01',
  berat_badan: 65.5,
  tinggi_badan: 165,
  massa_otot: 28,
  massa_lemak: 25,
  lingkar_pinggang: 80,
  jenis_kelamin: 'female',
  umur: 34,
  faktor_aktivitas: 1.2,
  faktor_stres: 1.2,
  energi_total: 1800,
  catatan_asesmen: 'Previous notes',
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('AssessmentForm', () => {
  it('renders form with client data pre-populated', () => {
    render(
      <AssessmentForm
        client={mockClient}
        lastAssessment={mockLastAssessment}
        onSave={vi.fn()}
        isSaving={false}
      />,
      { wrapper: createWrapper() }
    )
    expect(screen.getByDisplayValue('65.5')).toBeInTheDocument() // weight
    expect(screen.getByDisplayValue('165')).toBeInTheDocument() // height
  })

  it('calculates BMI correctly', () => {
    render(
      <AssessmentForm
        client={mockClient}
        lastAssessment={mockLastAssessment}
        onSave={vi.fn()}
        isSaving={false}
      />,
      { wrapper: createWrapper() }
    )
    // BMI = 65.5 / (1.65)^2 = 24.07
    expect(screen.getByText(/24.\d/)).toBeInTheDocument()
  })
})
