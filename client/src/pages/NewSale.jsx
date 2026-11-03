import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Minus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { api } from '../api'
import usePageTitle from '../hooks/usePageTitle'
import { useAlerts } from '../context/AlertsContext'
import { PAYMENTS } from '../lib/constants'
import { money, plural } from '../lib/format'
import Dialog from '../components/ui/Dialog'
import PaymentPill from '../components/ui/PaymentPill'

export default function NewSale() {
  usePageTitle('Point of sale')
  const { refresh: refreshAlerts } = useAlerts()
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [payment, setPayment] = useState('cash')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lastSale, setLastSale] = useState(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  const loadProducts = useCallback(
    () => api('/products')
      .then((data) => setProducts(data.products))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false)),
    []
  )

  useEffect(() => { loadProducts() }, [loadProducts])

  const categories = ['All', ...new Set(products.map((p) => p.category))].sort((a, b) => (
    a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b)
  ))

  const term = search.trim().toLowerCase()
  const visible = products.filter((product) => {
    const matchesCategory = category === 'All' || product.category === category
    const matchesSearch = !term || product.name.toLowerCase().includes(term) || (product.sku || '').toLowerCase().includes(term)
    return matchesCategory && matchesSearch
  })

  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0)
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0)

  function addToCart(product) {
    if (product.stock <= 0) return
    setLastSale(null)
    setError('')
    setCart((lines) => {
      const existing = lines.find((line) => line.productId === product._id)
      if (!existing) {
        return [...lines, { productId: product._id, name: product.name, sku: product.sku, price: product.price, stock: product.stock, quantity: 1 }]
      }
      return lines.map((line) => (
        line.productId === product._id ? { ...line, quantity: Math.min(line.quantity + 1, line.stock) } : line
      ))
    })
  }

  // Keeps quantity between 1 and the stock we have
  const setQuantity = (id, value) =>
    setCart((lines) => lines.map((line) => (
      line.productId === id
        ? { ...line, quantity: Math.max(1, Math.min(line.stock, Math.floor(Number(value)) || 1)) }
        : line
    )))

  const removeLine = (id) => setCart((lines) => lines.filter((line) => line.productId !== id))

  async function completeSale() {
    setBusy(true)
    setError('')
    try {
      // We send only ids and quantities. The server looks up the real prices.
      const data = await api('/sales', {
        method: 'POST',
        body: {
          items: cart.map(({ productId, quantity }) => ({ productId, quantity })),
          paymentMethod: payment,
        },
      })
      setLastSale(data.sale)
      setCart([])
      setPayment('cash')
      setCheckoutOpen(false)
      refreshAlerts()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      loadProducts()
    }
  }

  const renderCheckout = () => (
    <div className="space-y-4">
      {cart.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          Nothing added yet. Click a product to add it.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {cart.map((line) => (
            <li key={line.productId} className="py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{line.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{line.sku || '—'} · {money.format(line.price)} each</p>
                </div>
                <p className="shrink-0 text-sm font-semibold">{money.format(line.price * line.quantity)}</p>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700">
                  <button aria-label={`Decrease ${line.name}`} onClick={() => setQuantity(line.productId, line.quantity - 1)} className="rounded-l-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><Minus size={14} /></button>
                  <input
                    aria-label={`Quantity of ${line.name}`}
                    type="number"
                    min="1"
                    max={line.stock}
                    value={line.quantity}
                    onChange={(event) => setQuantity(line.productId, event.target.value)}
                    className="w-12 border-x border-slate-300 bg-transparent py-1 text-center text-sm dark:border-slate-700"
                  />
                  <button aria-label={`Increase ${line.name}`} onClick={() => setQuantity(line.productId, line.quantity + 1)} className="rounded-r-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><Plus size={14} /></button>
                </div>
                <button onClick={() => removeLine(line.productId)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                  <Trash2 size={13} aria-hidden="true" />Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <fieldset>
        <legend className="label">Payment method</legend>
        <div role="radiogroup" aria-label="Payment method" className="mt-2 grid grid-cols-3 gap-2">
          {PAYMENTS.map((method) => {
            const active = payment === method.value
            return (
              <button
                key={method.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPayment(method.value)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs font-medium transition-colors ${active
                  ? 'border-brand bg-indigo-50 text-brand dark:bg-indigo-500/10 dark:text-indigo-300'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'}`}
              >
                <span className={`h-2 w-2 rounded-full ${method.dot}`} aria-hidden="true" />
                {method.short}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">{plural(itemCount, 'item')}</p>
          <p className="text-xl font-bold">{money.format(total)}</p>
        </div>
        <button className="btn btn-primary" disabled={cart.length === 0 || busy} onClick={completeSale}>
          {busy ? 'Saving...' : 'Complete sale'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <h1 className="sr-only">Point of sale</h1>

      {lastSale && (
        <div role="status" className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>
            Sale <span className="font-mono font-semibold">{lastSale.reference}</span> recorded: {money.format(lastSale.total)}
          </span>
          <PaymentPill method={lastSale.paymentMethod} />
        </div>
      )}
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}

      <div className="grid gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)] lg:pb-0">
        <section aria-labelledby="pick-title" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="pick-title" className="text-lg font-semibold">Pick products</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">{plural(products.length, 'product')}</span>
          </div>

          <div className="relative mt-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              aria-label="Search products by name or SKU"
              className="input mt-0 pl-9"
              placeholder="Search by name or SKU"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} aria-pressed={category === c} className={`chip ${category === c ? 'chip-active' : ''}`}>
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="mt-4 text-slate-500 dark:text-slate-400">Loading products...</p>
          ) : visible.length === 0 ? (
            <p className="card mt-4 p-6 text-center text-sm text-slate-600 dark:text-slate-400">
              {products.length === 0 ? 'No products yet. Add some on the Inventory page first.' : 'No products match your search.'}
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((product) => {
                const out = product.stock <= 0
                return (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    disabled={out}
                    className={`card group flex flex-col p-3 text-left transition ${out ? 'cursor-not-allowed opacity-55' : 'hover:border-brand hover:shadow-sm'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">{product.sku || '—'}</span>
                      <span className={`text-xs ${out ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {out ? 'Out' : `${product.stock} left`}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm font-medium">{product.name}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-semibold">{money.format(product.price)}</span>
                      {!out && (
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-50 text-brand transition-colors group-hover:bg-brand group-hover:text-white dark:bg-indigo-500/10 dark:text-indigo-300">
                          <Plus size={14} aria-hidden="true" />
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <aside className="hidden lg:block">
          <div className="card sticky top-24 p-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ShoppingCart size={18} aria-hidden="true" />Current sale
            </h2>
            <div className="mt-3">{renderCheckout()}</div>
          </div>
        </aside>
      </div>

      {cart.length > 0 && !checkoutOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">{plural(itemCount, 'item')}</p>
              <p className="text-lg font-bold">{money.format(total)}</p>
            </div>
            <button className="btn btn-primary" onClick={() => setCheckoutOpen(true)}>View checkout</button>
          </div>
        </div>
      )}

      {checkoutOpen && (
        <Dialog title="Current sale" onClose={() => setCheckoutOpen(false)} maxWidth="max-w-lg">
          {renderCheckout()}
        </Dialog>
      )}
    </>
  )
}
