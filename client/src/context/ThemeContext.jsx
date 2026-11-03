import { createContext, useContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'shoptrack_theme'
const ThemeContext = createContext(null)
export const useTheme = () => useContext(ThemeContext)

// index.html already put the right class on <html> before paint, so start from that.
const initialDark = () => document.documentElement.classList.contains('dark')

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(initialDark)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDark)
    root.style.colorScheme = isDark ? 'dark' : 'light'
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', isDark ? '#020617' : '#4f46e5')
  }, [isDark])

  // Only save an explicit choice, so first-time visitors keep following their OS.
  const toggle = () =>
    setIsDark((current) => {
      const next = !current
      try { localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light') } catch { /* private mode */ }
      return next
    })

  return <ThemeContext.Provider value={{ isDark, toggle }}>{children}</ThemeContext.Provider>
}
