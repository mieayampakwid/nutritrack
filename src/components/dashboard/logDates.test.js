import { describe, it, expect } from 'vitest'
import { deriveLogDates } from './logDates'

describe('deriveLogDates', () => {
  it('returns empty sets for empty or nullish input', () => {
    expect(deriveLogDates([])).toEqual({ loggedDates: [], streakDates: [] })
    expect(deriveLogDates(undefined)).toEqual({ loggedDates: [], streakDates: [] })
    expect(deriveLogDates(null)).toEqual({ loggedDates: [], streakDates: [] })
  })

  it('counts a same-day entry in both logged and streak dates', () => {
    const rows = [{ tanggal: '2026-06-15', created_at: '2026-06-15T10:00:00' }]
    const { loggedDates, streakDates } = deriveLogDates(rows)
    expect(loggedDates).toEqual(['2026-06-15'])
    expect(streakDates).toEqual(['2026-06-15'])
  })

  // Regression for BUG-07: backdated entries must still mark their day on the
  // weekly checkmark (loggedDates), but must NOT count toward the streak.
  it('includes backdated entries in loggedDates but excludes them from streakDates', () => {
    const rows = [{ tanggal: '2026-06-15', created_at: '2026-06-17T09:30:00' }]
    const { loggedDates, streakDates } = deriveLogDates(rows)
    expect(loggedDates).toEqual(['2026-06-15'])
    expect(streakDates).toEqual([])
  })

  it('mixes same-day and backdated entries correctly', () => {
    const rows = [
      { tanggal: '2026-06-17', created_at: '2026-06-17T08:00:00' },
      { tanggal: '2026-06-15', created_at: '2026-06-17T09:30:00' },
      { tanggal: '2026-06-16', created_at: '2026-06-16T20:00:00' },
    ]
    const { loggedDates, streakDates } = deriveLogDates(rows)
    expect(loggedDates.sort()).toEqual(['2026-06-15', '2026-06-16', '2026-06-17'])
    expect(streakDates.sort()).toEqual(['2026-06-16', '2026-06-17'])
  })

  it('deduplicates repeated dates', () => {
    const rows = [
      { tanggal: '2026-06-15', created_at: '2026-06-15T08:00:00' },
      { tanggal: '2026-06-15', created_at: '2026-06-15T19:00:00' },
    ]
    const { loggedDates, streakDates } = deriveLogDates(rows)
    expect(loggedDates).toEqual(['2026-06-15'])
    expect(streakDates).toEqual(['2026-06-15'])
  })

  it('ignores rows without a tanggal', () => {
    const rows = [
      { tanggal: null, created_at: '2026-06-15T08:00:00' },
      { tanggal: '', created_at: '2026-06-15T08:00:00' },
      { created_at: '2026-06-15T08:00:00' },
    ]
    expect(deriveLogDates(rows)).toEqual({ loggedDates: [], streakDates: [] })
  })
})
