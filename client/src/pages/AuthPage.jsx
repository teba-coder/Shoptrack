import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Store } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import usePageTitle from '../hooks/usePageTitle'
import ThemeToggle from '../components/ui/ThemeToggle'

// One form for both pages: mode is 'login' or 'register'
export default function AuthPage({ mode }) {
  const isLogin = mode === 'login'
  usePageTitle(isLogin ? 'Log in' : 'Create account')
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!isLogin && form.name.trim().length < 2) return setError('Enter your name.')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('Enter a valid email address.')
    if (isLogin ? !form.password : form.password.length < 8)
      return setError(isLogin ? 'Enter your password.' : 'Password must be at least 8 characters.')
    setBusy(true)
    try {
      if (isLogin) await login(form.email, form.password)
      else await register(form.name, form.email, form.password)
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Lets a recruiter look around without registering (needs `npm run seed` on the server)
  const showDemo = isLogin && import.meta.env.VITE_DEMO === 'true'
  async function tryDemo() {
    setError('')
    setBusy(true)
    try {
      await login('demo@shoptrack.dev', 'demo1234')
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="fixed right-4 top-4 z-10"><ThemeToggle compact /></div>

      <div className="w-full max-w-sm">
        <p className="mb-6 flex items-center justify-center gap-2 text-xl font-bold text-brand"><Store aria-hidden="true" />ShopTrack</p>
        <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-xl font-bold">{isLogin ? 'Log in to your shop' : 'Create your shop account'}</h1>
          {!isLogin && (
            <div>
              <label className="label" htmlFor="name">Your name</label>
              <input id="name" className="input" value={form.name} onChange={set('name')} autoComplete="name" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" value={form.email} onChange={set('email')} autoComplete="email" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" className="input" value={form.password} onChange={set('password')} autoComplete={isLogin ? 'current-password' : 'new-password'} />
          </div>
          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>{busy ? 'Please wait...' : isLogin ? 'Log in' : 'Create account'}</button>
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            {isLogin ? 'New here? ' : 'Already have an account? '}
            <Link className="font-medium text-brand underline" to={isLogin ? '/register' : '/login'}>{isLogin ? 'Create an account' : 'Log in'}</Link>
          </p>
        </form>
        {showDemo && (
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">Just looking around?</p>
            <button type="button" onClick={tryDemo} disabled={busy} className="btn btn-ghost mt-2 w-full">Try the demo shop</button>
          </div>
        )}
      </div>
    </div>
  )
}
