import { useState } from 'react'
import Dialog from './ui/Dialog'

const empty = { sku: '', name: '', category: '', price: '', stock: '', lowStockLevel: 5 }

// A pop-up form used for both adding and editing. `product` is null when adding.
export default function ProductForm({ product, categories, onSave, onClose }) {
  const [form, setForm] = useState(product ? { ...empty, ...product } : empty)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Enter a product name.')
    if (form.price === '' || Number(form.price) < 0) return setError('Enter a price of 0 or more.')
    if (form.stock === '' || !Number.isInteger(Number(form.stock)) || Number(form.stock) < 0)
      return setError('Stock must be a whole number of 0 or more.')
    setBusy(true)
    try {
      await onSave({
        sku: form.sku.trim().toUpperCase(),
        name: form.name.trim(),
        category: form.category.trim() || 'General',
        price: Number(form.price),
        stock: Number(form.stock),
        lowStockLevel: Number(form.lowStockLevel) || 0,
      })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Dialog title={product ? 'Edit product' : 'Add product'} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label className="label" htmlFor="p-sku">SKU code</label>
          <input
            id="p-sku"
            data-autofocus
            className="input uppercase"
            placeholder="Leave blank to auto-generate"
            value={form.sku}
            onChange={set('sku')}
            maxLength={24}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">For example GRO-0001. Must be unique in your shop.</p>
        </div>

        <div>
          <label className="label" htmlFor="p-name">Name</label>
          <input id="p-name" className="input" value={form.name} onChange={set('name')} />
        </div>

        <div>
          <label className="label" htmlFor="p-category">Category</label>
          <input id="p-category" list="category-list" className="input" placeholder="General" value={form.category} onChange={set('category')} />
          <datalist id="category-list">{categories.map((category) => <option key={category} value={category} />)}</datalist>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="p-price">Price (ETB)</label>
            <input id="p-price" type="number" min="0" step="0.01" className="input" value={form.price} onChange={set('price')} />
          </div>
          <div>
            <label className="label" htmlFor="p-stock">Stock</label>
            <input id="p-stock" type="number" min="0" step="1" className="input" value={form.stock} onChange={set('stock')} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="p-low">Warn me when stock is at or below</label>
          <input id="p-low" type="number" min="0" step="1" className="input" value={form.lowStockLevel} onChange={set('lowStockLevel')} />
        </div>

        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save product'}</button>
        </div>
      </form>
    </Dialog>
  )
}
