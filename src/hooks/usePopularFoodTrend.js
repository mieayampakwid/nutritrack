import { useQuery } from '@tanstack/react-query'
import { startOfDay, subDays } from 'date-fns'
import { toIsoDateLocal } from '@/lib/format'
import { supabase } from '@/lib/supabase'

const TOP_N = 10
const LOG_PAGE = 800
const ID_CHUNK = 120

/** @typedef {'1d' | '7d' | '1mo'} PopularFoodRange */

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** Inclusive calendar-day ranges on `tanggal` (local). */
function rangeBounds(/** @type {PopularFoodRange} */ range) {
  const today = new Date()
  const end = startOfDay(today)
  if (range === '1d') {
    return { start: end, end }
  }
  if (range === '7d') {
    return { start: startOfDay(subDays(end, 6)), end }
  }
  /* 1mo: rolling 30 calendar days including today */
  return { start: startOfDay(subDays(end, 29)), end }
}

function canonName(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
}

/**
 * Fetch food log rows in [start,end] by tanggal, then items (batched).
 */
async function fetchItemsWithTanggal(isoStart, isoEnd) {
  const logs = []
  let offset = 0
  for (;;) {
    const { data, error } = await supabase
      .from('food_logs')
      .select('id, tanggal')
      .gte('tanggal', isoStart)
      .lte('tanggal', isoEnd)
      .order('tanggal', { ascending: true })
      .range(offset, offset + LOG_PAGE - 1)
    if (error) throw error
    const batch = data ?? []
    logs.push(...batch)
    if (batch.length < LOG_PAGE) break
    offset += LOG_PAGE
  }

  const tanggalByLogId = Object.fromEntries(logs.map((l) => [l.id, l.tanggal]))
  const ids = logs.map((l) => l.id)
  if (!ids.length) return []

  const rows = []
  for (const part of chunk(ids, ID_CHUNK)) {
    const { data, error } = await supabase
      .from('food_log_items')
      .select('nama_makanan, food_log_id')
      .in('food_log_id', part)
    if (error) throw error
    for (const r of data ?? []) {
      const tanggal = tanggalByLogId[r.food_log_id]
      if (!tanggal) continue
      rows.push({ nama_makanan: r.nama_makanan, tanggal })
    }
  }
  return rows
}

function buildFrequencyBars(items) {
  /** @type {Map<string, string>} canon -> display label */
  const displayFor = new Map()
  /** @type {Map<string, number>} canon -> count */
  const totals = new Map()

  for (const it of items) {
    const c = canonName(it.nama_makanan)
    if (!c) continue
    if (!displayFor.has(c)) displayFor.set(c, String(it.nama_makanan).trim() || c)
    totals.set(c, (totals.get(c) ?? 0) + 1)
  }

  const chartData = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([c, frekuensi]) => ({
      food: displayFor.get(c) ?? c,
      frekuensi,
    }))

  return { chartData, hasData: chartData.length > 0 }
}

export function usePopularFoodTrend(/** @type {PopularFoodRange} */ range) {
  const { start, end } = rangeBounds(range)
  const isoStart = toIsoDateLocal(start)
  const isoEnd = toIsoDateLocal(end)

  return useQuery({
    queryKey: ['popular_food_trend', range, isoStart, isoEnd],
    queryFn: async () => {
      const items = await fetchItemsWithTanggal(isoStart, isoEnd)
      return buildFrequencyBars(items)
    },
  })
}
