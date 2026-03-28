/** Minutes since midnight in fixed offset GMT+8 (0–1439). */
export function getMinutesSinceMidnightGmt8(date = new Date()) {
  const h = date.getUTCHours()
  const m = date.getUTCMinutes()
  return (h * 60 + m + 8 * 60) % (24 * 60)
}

/** Whole seconds since midnight GMT+8 (0–86399). */
function getSecondsSinceMidnightGmt8(date = new Date()) {
  const sec = date.getUTCHours() * 3600 + date.getUTCMinutes() * 60 + date.getUTCSeconds() + 8 * 3600
  return ((sec % 86400) + 86400) % 86400
}

/** Live clock string HH:mm:ss (GMT+8). */
export function formatClockGmt8(date = new Date()) {
  const s = getSecondsSinceMidnightGmt8(date)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
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
 * @param {Date} [date] — used only to pick the time window (minute resolution).
 */
export function getDashboardGreetingTemplate(displayName, date = new Date()) {
  const name = capitalizeGreetingName(displayName)
  const t = getMinutesSinceMidnightGmt8(date)

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
