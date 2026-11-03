import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

export default function ThemeToggle({ className = '', compact = false }) {
  const { isDark, toggle } = useTheme()

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isDark}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`rounded-full p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 ${className}`}
      >
        {isDark ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`sidebar-item w-full ${className}`}
    >
      {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
      <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
      <span
        className={`ml-auto flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${isDark ? 'bg-brand' : 'bg-slate-300 dark:bg-slate-700'}`}
        aria-hidden="true"
      >
        <span className={`h-4 w-4 rounded-full bg-white transition-transform ${isDark ? 'translate-x-4' : ''}`} />
      </span>
    </button>
  )
}
