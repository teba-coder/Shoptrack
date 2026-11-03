import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarRange, ShoppingBag, TrendingUp } from 'lucide-react'
import { api } from '../api'
import usePageTitle from '../hooks/usePageTitle'
import { useAlerts } from '../context/AlertsContext'
import { useTheme } from '../context/ThemeContext'
import { CHART } from '../lib/constants'
import { compact, longDate, money, money0, percentChange, plural, shortDate } from '../lib/format'
import MetricCard from '../components/ui/MetricCard'
import StatusBadge from '../components/ui/StatusBadge'
import RestockDialog from '../components/RestockDialog'

function DayTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const day = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <p className="font-medium">{longDate(day.date)}</p>
      <p>{money.format(day.revenue)}</p>
      <p className="text-slate-500 dark:text-slate-400">{plural(day.count, 'sale')}</p>
    </div>
  )
}

function DeltaNote({ today, yesterday }) {
  const change = percentChange(today.revenue, yesterday.revenue)
  if (change === null) {
    return <span>{plural(today.count, 'sale')} · no sales yesterday</span>
  }
  const up = change >= 0
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span>{plural(today.count, 'sale')} ·</span>
      <span className={`inline-flex items-center gap-0.5 font-medium ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
        {up ? <ArrowUpRight size={13} aria-hidden="true" /> : <ArrowDownRight size={13} aria-hidden="true" />}
        {Math.abs(change)}%
      </span>
      <span>vs yesterday</span>
    </span>
  )
}

export default function Dashboard() {
  usePageTitle('Dashboard')
  const { isDark } = useTheme()
  const { refresh: refreshAlerts } = useAlerts()
  const [days, setDays] = useState(30)
  const [version, setVersion] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [restocking, setRestocking] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    setLoading(true)
    api(`/reports/summary?days=${days}&tz=${encodeURIComponent(tz)}`, { signal: controller.signal })
      .then((result) => { setData(result); setError('') })
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [days, version])

  const colors = isDark ? CHART.dark : CHART.light
  const reload = () => setVersion((v) => v + 1)

  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>

  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Loading dashboard">
        {[0, 1, 2, 3].map((n) => <div key={n} className="card h-32 animate-pulse" />)}
      </div>
    )
  }

  const noSales = data.period.count === 0 && data.month.count === 0
  const maxRevenue = Math.max(...data.topProducts.map((p) => p.revenue), 1)

  return (
    <>
      <h1 className="sr-only">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          icon={ShoppingBag}
          tone="indigo"
          label="Sales today"
          value={money0.format(data.today.revenue)}
          note={<DeltaNote today={data.today} yesterday={data.yesterday} />}
        />
        <MetricCard
          icon={CalendarRange}
          tone="emerald"
          label="Sales this month"
          value={money0.format(data.month.revenue)}
          note={plural(data.month.count, 'sale')}
        />
        <MetricCard
          icon={TrendingUp}
          tone="sky"
          label={`Last ${days} days`}
          value={money0.format(data.period.revenue)}
          note={plural(data.period.count, 'sale')}
        />
        <MetricCard
          icon={AlertTriangle}
          tone="amber"
          label="Low stock products"
          value={data.lowStockCount}
          note={data.lowStockCount ? 'Needs restocking' : 'All stocked up'}
          badge={data.lowStockCount > 0 ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">Action</span> : null}
        />
      </div>

      {noSales && (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          No sales in this period yet. <Link to="/sales/new" className="font-medium text-brand underline">Record a sale</Link> and your charts will fill in.
        </p>
      )}

      <section aria-labelledby="trend-title" className="card mt-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="trend-title" className="font-semibold">Daily sales (ETB)</h2>
          <div className="flex gap-1.5" role="group" aria-label="Time range">
            {[7, 30, 90].map((d) => (
              <button key={d} aria-pressed={days === d} onClick={() => setDays(d)} className={`chip ${days === d ? 'chip-active' : ''}`}>
                {d} days
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 h-64" role="img" aria-label={`Area chart of daily sales for the last ${days} days. Total ${money.format(data.period.revenue)} from ${plural(data.period.count, 'sale')}.`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={colors.grid} />
              <XAxis dataKey="date" tickFormatter={shortDate} stroke={colors.grid} tick={{ fill: colors.ink, fontSize: 12 }} tickLine={false} minTickGap={28} />
              <YAxis tickFormatter={(v) => compact.format(v)} tick={{ fill: colors.ink, fontSize: 12 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<DayTooltip />} cursor={{ stroke: colors.cursor, strokeWidth: 1 }} />
              <Area type="monotone" dataKey="revenue" stroke={colors.series} strokeWidth={2} fill={colors.series} fillOpacity={isDark ? 0.18 : 0.1}
                dot={false} activeDot={{ r: 5, fill: colors.series, stroke: isDark ? '#0f172a' : '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-slate-600 dark:text-slate-400">View as table</summary>
          <div className="mt-2 max-h-64 overflow-auto">
            <table className="w-full text-left">
              <thead><tr className="text-slate-600 dark:text-slate-400"><th className="p-1">Date</th><th className="p-1 text-right">Sales</th><th className="p-1 text-right">Revenue</th></tr></thead>
              <tbody>
                {[...data.daily].reverse().map((d) => (
                  <tr key={d.date} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="p-1">{longDate(d.date)}</td>
                    <td className="p-1 text-right">{d.count}</td>
                    <td className="p-1 text-right">{money.format(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="top-title" className="card p-4 sm:p-6">
          <h2 id="top-title" className="font-semibold">Top sellers by revenue</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Last {days} days</p>

          {data.topProducts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">No sales in this period.</p>
          ) : (
            <ol className="mt-4 space-y-4">
              {data.topProducts.map((product, index) => (
                <li key={product.productId} className="flex items-start gap-3">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="shrink-0 text-sm font-semibold">{money0.format(product.revenue)}</p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max((product.revenue / maxRevenue) * 100, 4)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{plural(product.units, 'unit')} sold</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="low-title" className="card p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 id="low-title" className="font-semibold">Low stock</h2>
            {data.lowStockCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{data.lowStockCount}</span>
            )}
          </div>

          {data.lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Nothing is running low.</p>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {data.lowStock.map((product) => (
                  <div key={product._id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{product.name}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{product.sku || '—'} · {product.category}</p>
                      </div>
                      <StatusBadge product={product} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {product.stock === 0 ? 'Out of stock' : `${product.stock} left`} · warns at {product.lowStockLevel}
                      </p>
                      <button onClick={() => setRestocking(product)} className="btn btn-primary shrink-0 px-3 py-1.5 text-xs">Restock</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span>{data.lowStockCount > data.lowStock.length ? `Showing ${data.lowStock.length} of ${data.lowStockCount}.` : ''}</span>
                <Link to="/products?low=1" className="font-medium text-brand underline">See all low-stock products</Link>
              </div>
            </>
          )}
        </section>
      </div>

      {restocking && (
        <RestockDialog
          product={restocking}
          onClose={() => setRestocking(null)}
          onDone={() => { refreshAlerts(); reload() }}
        />
      )}
    </>
  )
}
