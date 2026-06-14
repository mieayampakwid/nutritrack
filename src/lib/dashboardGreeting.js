/** WIB — matches wall clocks for Java, Sumatra, etc. (not WITA +8 / WIT +9). */
const DASHBOARD_TIME_ZONE = 'Asia/Jakarta'

function zonedHms(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DASHBOARD_TIME_ZONE,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)
  const v = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { h: v('hour'), m: v('minute'), s: v('second') }
}

/** Minutes since midnight in `Asia/Jakarta` (0–1439). */
function minutesSinceMidnightWib(date = new Date()) {
  const { h, m } = zonedHms(date)
  return h * 60 + m
}

/** Live clock string HH:mm:ss (WIB). */
export function formatClockWib(date = new Date()) {
  const { h, m, s } = zonedHms(date)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const CLOCK_TOKEN = '{{clock}}'

export function capitalizeGreetingName(raw) {
  const t = raw?.trim() || 'Pengguna'
  if (!t) return 'Pengguna'
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * Greeting template with a single `{{clock}}` token (replaced in UI with live clock).
 * @param {string} displayName
 * @param {Date} [date] — used only to pick the time window (minute resolution, WIB).
 */
export function getDashboardGreetingTemplate(displayName, date = new Date()) {
  const name = capitalizeGreetingName(displayName)
  const t = minutesSinceMidnightWib(date)

  // 21:01 – 02:00
  if (t >= 21 * 60 + 1 || t <= 2 * 60) {
    return `Waktunya rehat ya, ${name}, jam ${CLOCK_TOKEN} udah jangan dipaksa makan lagi!`
  }
  // 02:01 – 04:00
  if (t >= 2 * 60 + 1 && t <= 4 * 60) {
    return `Keren banget udah bersinar sepagi ini! Bagus banget kalau ${name} mau puasa sekalian? Mumpung masih jam ${CLOCK_TOKEN}`
  }
  // 04:01 – 09:30
  if (t >= 4 * 60 + 1 && t <= 9 * 60 + 30) {
    return `Selamat Pagi, udah jam ${CLOCK_TOKEN}. Mau sarapan apa hari ini ${name} ?`
  }
  // 09:31 – 14:30
  if (t >= 9 * 60 + 31 && t <= 14 * 60 + 30) {
    return `Selamat Siang, jam ${CLOCK_TOKEN} enaknya makan siang apa ya, ${name}?`
  }
  // 14:31 – 18:00
  if (t >= 14 * 60 + 31 && t <= 18 * 60) {
    return `Selamat Sore ${name}, Mau makan snack atau nunggu malam sekalian, nanggung banget masih jam ${CLOCK_TOKEN}?`
  }
  // 18:01 – 21:00
  if (t >= 18 * 60 + 1 && t <= 21 * 60) {
    return `Selamat Malam, Kalau makan malam jangan terlalu malam ya, ${name}! Udah jam segini ${CLOCK_TOKEN}!`
  }

  return `Halo, ${name}!`
}

/**
 * Login hero: time-of-day only (WIB), same windows as dashboard greetings. No clock token.
 */
export function getLoginGreetingTemplate(date = new Date()) {
  const t = minutesSinceMidnightWib(date)
  let phase = 'Pagi'
  if (t >= 21 * 60 + 1 || t <= 2 * 60) phase = 'Malam'
  else if (t >= 2 * 60 + 1 && t <= 9 * 60 + 30) phase = 'Pagi'
  else if (t >= 9 * 60 + 31 && t <= 14 * 60 + 30) phase = 'Siang'
  else if (t >= 14 * 60 + 31 && t <= 18 * 60) phase = 'Sore'
  else if (t >= 18 * 60 + 1 && t <= 21 * 60) phase = 'Malam'

  return `Selamat ${phase}, Udah siap jadi lebih sehat bersama RSUD RT Notopuro?`
}

/** @returns {{ before: string, after: string, hasClock: boolean }} */
export function splitGreetingAtClock(template) {
  const i = template.indexOf(CLOCK_TOKEN)
  if (i === -1) {
    return { before: template, after: '', hasClock: false }
  }
  return {
    before: template.slice(0, i),
    after: template.slice(i + CLOCK_TOKEN.length),
    hasClock: true,
  }
}
