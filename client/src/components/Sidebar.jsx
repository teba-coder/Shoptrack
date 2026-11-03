import { NavLink } from 'react-router-dom'
import { LayoutDashboard, LogOut, Package, Receipt, ShoppingCart, Store, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAlerts } from '../context/AlertsContext'
import Avatar from './ui/Avatar'
import ThemeToggle from './ui/ThemeToggle'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Inventory', icon: Package },
  { to: '/sales/new', label: 'Point of sale', icon: ShoppingCart },
  { to: '/sales', label: 'Sales history', icon: Receipt },
]

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const { count } = useAlerts()

  return (
    <aside
      aria-label="Sidebar"
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white shadow-sm">
            <Store size={20} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-base font-bold leading-tight">ShopTrack</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">Inventory &amp; sales</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 lg:hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            onClick={onClose}
            className={({ isActive }) => `sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
            {to === '/products' && count > 0 && (
              <span
                className="ml-auto inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                aria-label={`${count} low-stock products`}
              >
                {count}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800">
        <ThemeToggle />
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <Avatar name={user?.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
