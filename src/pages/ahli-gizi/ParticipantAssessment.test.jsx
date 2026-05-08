import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ParticipantAssessment } from './ParticipantAssessment'
import * as supabaseModule from '@/lib/supabase'

vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }) => <div data-testid="app-shell">{children}</div>,
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    session: { user: { id: 'nutritionist-1' } },
    profile: null,
    loading: false,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    isInactive: false,
  }),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => ({
  ...((await vi.importActual('react-router-dom')) ?? {}),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: 'client-1' }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn(),
            })),
          })),
        })),
      })),
    })),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockClient = {
  id: 'client-1',
  nama: 'Test Client',
  jenis_kelamin: 'female',
  tgl_lahir: '1990-01-01',
}

const mockLastAssessment = {
  id: 'assess-1',
  user_id: 'client-1',
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

describe('ParticipantAssessment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    vi.spyOn(supabaseModule.supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        single: vi.fn(() => new Promise(() => {})),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn(() => new Promise(() => {})),
          }),
        }),
      }),
    })

    renderWithProviders(<ParticipantAssessment />)
    expect(screen.getByText('Memuat…')).toBeInTheDocument()
  })

  it('renders form with client data', async () => {
    vi.spyOn(supabaseModule.supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockClient, error: null }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockLastAssessment, error: null }),
          }),
        }),
      }),
    })

    renderWithProviders(<ParticipantAssessment />)

    await waitFor(() => {
      expect(screen.getByText('Asesmen Klien')).toBeInTheDocument()
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Test Client • Perempuan'
      })).toBeInTheDocument()
    })
  })

  it('shows error when client not found', async () => {
    vi.spyOn(supabaseModule.supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    })

    renderWithProviders(<ParticipantAssessment />)

    await waitFor(() => {
      expect(screen.getByText('Peserta tidak ditemukan.')).toBeInTheDocument()
    })
  })
})
