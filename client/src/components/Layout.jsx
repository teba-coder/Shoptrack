import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AlertsProvider } from '../context/AlertsContext'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const TITLES = {
  '/': 'Dashboard',
  '/products': 'Inventory',
  '/sales/new': 'Point of sale',
  '/sales': 'Sales history',
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  // Close the drawer whenever the route changes or Escape is pressed
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <AlertsProvider>
      <div className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>

        <Sidebar open={open} onClose={() => setOpen(false)} />

        {open && (
          <div
            className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="lg:pl-64">
          <Topbar title={TITLES[pathname] || 'ShopTrack'} onMenu={() => setOpen(true)} />
          <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </AlertsProvider>
  )
}
