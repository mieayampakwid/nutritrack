import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { id: 'u1', role: 'klien', nama: 'Test User', email: 'test@example.com' },
    signOut: vi.fn(),
  }),
}))

vi.mock('@/components/food/FoodEntryForm', () => ({
  FoodEntryForm: ({ userId }) => <div data-testid="food-entry-form" data-userid={userId} />,
}))

vi.mock('@/components/exercise/ExerciseLogEntryCard', () => ({
  ExerciseLogEntryCard: ({ userId }) => <div data-testid="exercise-log-entry-card" data-userid={userId} />,
}))

import { FoodEntry } from './FoodEntry'

describe('FoodEntry page', () => {
  it('renders heading and mounts FoodEntryForm when profile.id exists', () => {
    renderWithProviders(<FoodEntry />, { initialEntries: ['/klien/food-entry'] })

    expect(screen.getByRole('heading', { name: /catat aktivitas harian/i })).toBeInTheDocument()
    expect(screen.getByTestId('food-entry-form')).toHaveAttribute('data-userid', 'u1')
    expect(screen.getByTestId('exercise-log-entry-card')).toHaveAttribute('data-userid', 'u1')
  })
})

