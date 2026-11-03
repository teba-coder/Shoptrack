import crypto from 'node:crypto'
import Product from '../models/Product.js'

// First three letters/digits of the category, e.g. "Groceries" -> "GRO".
// Falls back to "GEN" so a product always gets a readable prefix.
export function skuPrefix(category) {
  const letters = String(category || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return (letters.slice(0, 3) || 'GEN').padEnd(3, 'X')
}

// Next free SKU for a shop, e.g. GRO-0007. The unique index on { owner, sku }
// is the real guard: if two requests race, the caller retries with the next number.
export async function makeSku(owner, category) {
  const prefix = skuPrefix(category)
  const existing = await Product.find({ owner, sku: new RegExp(`^${prefix}-\\d+$`) })
    .select('sku')
    .lean()

  let max = 0
  for (const { sku } of existing) {
    const n = Number(sku.split('-')[1])
    if (Number.isInteger(n) && n > max) max = n
  }
  return `${prefix}-${String(max + 1).padStart(4, '0')}`
}

// Human-readable transaction id: TXN-20261103-1A2B3C4D
export function makeReference(date = new Date()) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `TXN-${y}${m}${d}-${rand}`
}
