import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { api } from '../api'
import usePageTitle from '../hooks/usePageTitle'
import { useAlerts } from '../context/AlertsContext'
import { stockStatus } from '../lib/constants'
import { money } from '../lib/format'
import ProductForm from '../components/ProductForm'
import StatusBadge from '../components/ui/StatusBadge'

const BAR_COLOR = {
  in: 'bg-emerald-500',
  low: 'bg-amber-500',
  out: 'bg-rose-500',
}

function StockBar({ product }) {
  const target = Math.max(product.lowStockLevel * 2, product.stock, 1)
  const width = Math.min((product.stock / target) * 100, 100)
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="tabular-nums">{product.stock}</span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
        <span className={`block h-full rounded-full ${BAR_COLOR[stockStatus(product)]}`} style={{ width: `${Math.max(width, 3)}%` }} />
      </span>
    </div>
  )
}

export default function Products() {
  usePageTitle('Inventory')
  const { refresh: refreshAlerts } = useAlerts()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [searchParams] = useSearchParams()
  const lowParam = searchParams.get('low') === '1'
  const [lowOnly, setLowOnly] = useState(lowParam)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null = closed, {} = adding, product = editing

  useEffect(() => { setLowOnly(lowParam) }, [lowParam])

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    if (lowOnly) params.set('lowStock', 'true')
    try {
      const data = await api(`/products?${params}`)
      setProducts(data.products)
      setCategories(data.categories)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, category, lowOnly])

  // Wait 300ms after the last keystroke before asking the server (debounce)
  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [load])

  async function save(values) {
    if (editing._id) await api(`/products/${editing._id}`, { method: 'PUT', body: values })
    else await api('/products', { method: 'POST', body: values })
    setEditing(null)
    refreshAlerts()
    load()
  }

  async function remove(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    try {
      await api(`/products/${product._id}`, { method: 'DELETE' })
      refreshAlerts()
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const filtering = search || category || lowOnly

  return (
    <>
      <h1 className="sr-only">Inventory</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Products</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {loading ? 'Loading...' : `${products.length} product${products.length === 1 ? '' : 's'}`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          <Plus size={16} aria-hidden="true" />Add product
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            aria-label="Search products by name or SKU"
            className="input mt-0 pl-9"
            placeholder="Search by name or SKU"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select aria-label="Filter by category" className="input mt-0 w-auto" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button type="button" aria-pressed={lowOnly} onClick={() => setLowOnly((v) => !v)} className={`chip ${lowOnly ? 'chip-active' : ''}`}>
          Low stock only
        </button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}

      <div className="card mt-4 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="p-8 text-center text-slate-600 dark:text-slate-400">
            {filtering ? 'No products match your filters.' : 'No products yet. Click "Add product" to add your first one.'}
          </p>
        ) : (
          <>
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Stock</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                    <td className="whitespace-nowrap p-3 font-mono text-xs text-slate-600 dark:text-slate-400">{product.sku || '—'}</td>
                    <td className="p-3 font-medium">{product.name}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{product.category}</td>
                    <td className="p-3 text-right">{money.format(product.price)}</td>
                    <td className="p-3 text-right"><StockBar product={product} /></td>
                    <td className="p-3"><StatusBadge product={product} /></td>
                    <td className="p-3 text-right">
                      <button onClick={() => setEditing(product)} aria-label={`Edit ${product.name}`} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"><Pencil size={16} /></button>
                      <button onClick={() => remove(product)} aria-label={`Delete ${product.name}`} className="rounded-md p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
              {products.map((product) => (
                <li key={product._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{product.sku || '—'} · {product.category}</p>
                    </div>
                    <StatusBadge product={product} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-sm">
                      <p className="font-medium">{money.format(product.price)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{product.stock} in stock · warns at {product.lowStockLevel}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(product)} aria-label={`Edit ${product.name}`} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"><Pencil size={16} /></button>
                      <button onClick={() => remove(product)} aria-label={`Delete ${product.name}`} className="rounded-md p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {editing && (
        <ProductForm product={editing._id ? editing : null} categories={categories} onSave={save} onClose={() => setEditing(null)} />
      )}
    </>
  )
}
