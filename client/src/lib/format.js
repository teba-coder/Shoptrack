export const money = new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' })
export const money0 = new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 })
export const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
export const dateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

// "2026-11-02" -> "2 Nov" (noon avoids timezone shifting the date)
export const shortDate = (key) => new Date(`${key}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
export const longDate = (key) => new Date(`${key}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

export const todayLabel = () =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())

export const initials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((w) => w[0].toUpperCase()).join('') || '?'
}

// Date input value from LOCAL parts (toISOString would use UTC and shift the day)
export const toInput = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// null when there is no previous value to compare against
export const percentChange = (current, previous) =>
  previous === 0 ? null : Math.round(((current - previous) / previous) * 100)

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
