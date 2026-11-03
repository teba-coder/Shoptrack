import { useEffect, useState } from 'react'
import { api } from '../api'
import usePageTitle from '../hooks/usePageTitle'
import { dateTime, money, toInput } from '../lib/format'
import PaymentPill from '../components/ui/PaymentPill'

function ItemsList({ items }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.product}>
          {item.quantity} × {item.name} <span className="text-slate-500 dark:text-slate-400">@ {money.format(item.price)}</span>
        </li>
      ))}
    </ul>
  )
}

export default function Sales() {
  usePageTitle('Sales history')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sales, setSales] = useState([])
  const [summary, setSummary] = useState({ count: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    // Convert the shopkeeper's local day boundaries to exact moments in time
    if (from) params.set('from', new Date(`${from}T00:00:00`).toISOString())
    if (to) params.set('to', new Date(`${to}T23:59:59.999`).toISOString())
    setLoading(true)
    api(`/sales?${params}`, { signal: controller.signal })
      .then((data) => { setSales(data.sales); setSummary(data.summary); setError('') })
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [from, to])

  function preset(days) {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days)
    setFrom(toInput(start))
    setTo(toInput(end))
  }
  const today = () => { const value = toInput(new Date()); setFrom(value); setTo(value) }
  const thisMonth = () => {
    const now = new Date()
    setFrom(toInput(new Date(now.getFullYear(), now.getMonth(), 1)))
    setTo(toInput(now))
  }
  const clear = () => { setFrom(''); setTo('') }
  const filtering = from || to

  return (
    <>
      <h1 className="sr-only">Sales history</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="from">From</label>
          <input id="from" type="date" className="input" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="to">To</label>
          <input id="to" type="date" className="input" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="chip" onClick={today}>Today</button>
          <button className="chip" onClick={() => preset(6)}>Last 7 days</button>
          <button className="chip" onClick={thisMonth}>This month</button>
          {filtering && <button className="chip" onClick={clear}>Clear</button>}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="card p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">Sales</p>
          <p className="text-2xl font-bold">{summary.count}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">Revenue</p>
          <p className="text-2xl font-bold">{money.format(summary.revenue)}</p>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}

      <div className="card mt-4 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">Loading sales...</p>
        ) : sales.length === 0 ? (
          <p className="p-8 text-center text-slate-600 dark:text-slate-400">
            {filtering ? 'No sales in this date range.' : 'No sales yet. Record one on the Point of sale page.'}
          </p>
        ) : (
          <>
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                <tr>
                  <th className="p-3">Transaction</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Items</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale._id} className="border-b border-slate-100 align-top last:border-0 dark:border-slate-800">
                    <td className="whitespace-nowrap p-3 font-mono text-xs text-slate-600 dark:text-slate-400">{sale.reference}</td>
                    <td className="whitespace-nowrap p-3 text-slate-600 dark:text-slate-400">{dateTime.format(new Date(sale.date))}</td>
                    <td className="p-3"><ItemsList items={sale.items} /></td>
                    <td className="p-3"><PaymentPill method={sale.paymentMethod} /></td>
                    <td className="p-3 text-right font-medium">{money.format(sale.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
              {sales.map((sale) => (
                <li key={sale._id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{sale.reference}</span>
                    <PaymentPill method={sale.paymentMethod} />
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <div className="min-w-0 text-sm"><ItemsList items={sale.items} /></div>
                    <p className="shrink-0 font-semibold">{money.format(sale.total)}</p>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{dateTime.format(new Date(sale.date))}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {summary.count > sales.length && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Showing the latest {sales.length} sales. Totals above include all {summary.count}.
        </p>
      )}
    </>
  )
}
