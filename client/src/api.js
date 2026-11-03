// One place that talks to the server. Every page uses this instead of raw fetch.
const BASE = import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'shoptrack_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY))

// Free hosting puts the server to sleep when idle, and the first request can take ~30s.
// If a request is still waiting after 4 seconds we tell the UI, which shows a banner.
const announce = (slow) => window.dispatchEvent(new CustomEvent('api:slow', { detail: slow }))

export async function api(path, { method = 'GET', body, signal } = {}) {
  const slowTimer = setTimeout(() => announce(true), 4000)
  try {
    return await request(path, { method, body, signal })
  } finally {
    clearTimeout(slowTimer)
    announce(false)
  }
}

async function request(path, { method, body, signal }) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new Error('Cannot reach the server. Check that it is running.')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // An expired or invalid token on a normal request means: log the user out
    if (res.status === 401 && getToken() && !path.startsWith('/auth/login')) window.dispatchEvent(new Event('auth:expired'))
    throw new Error(data.message || 'Something went wrong')
  }
  return data
}
