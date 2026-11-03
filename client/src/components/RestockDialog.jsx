import { useState } from 'react'
import { api } from '../api'
import Dialog from './ui/Dialog'

export default function RestockDialog({ product, onClose, onDone }) {
  const [amount, setAmount] = useState(() => Math.max(product.lowStockLevel * 2 - product.stock, 1))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const units = Math.floor(Number(amount))
  const nextStock = product.stock + (Number.isInteger(units) && units > 0 ? units : 0)

  async function submit(event) {
    event.preventDefault()
    if (!Number.isInteger(units) || units < 1) return setError('Enter a whole number of 1 or more.')
    setBusy(true)
    setError('')
    try {
      await api(`/products/${product._id}`, { method: 'PUT', body: { stock: product.stock + units } })
      onDone?.()
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Dialog title={`Restock ${product.name}`} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
          <p className="flex justify-between gap-3"><span className="text-slate-500 dark:text-slate-400">SKU</span><span className="font-medium">{product.sku || '—'}</span></p>
          <p className="flex justify-between gap-3"><span className="text-slate-500 dark:text-slate-400">In stock now</span><span className="font-medium">{product.stock}</span></p>
          <p className="flex justify-between gap-3"><span className="text-slate-500 dark:text-slate-400">Warning at</span><span className="font-medium">{product.lowStockLevel}</span></p>
        </div>

        <div>
          <label className="label" htmlFor="restock-amount">Units to add</label>
          <input
            id="restock-amount"
            data-autofocus
            type="number"
            min="1"
            step="1"
            className="input"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400">
          New stock level: <span className="font-semibold text-slate-900 dark:text-white">{nextStock}</span>
        </p>

        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Add stock'}</button>
        </div>
      </form>
    </Dialog>
  )
}
