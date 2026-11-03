// Fills new required fields on data created before this redesign:
//   - products without a SKU get one (unique per shop)
//   - sales without a transaction reference / payment method get them
// Run once after deploying the new model:
//   npm run backfill
import 'dotenv/config'
import mongoose from 'mongoose'
import connectDB from './config/db.js'
import Product from './models/Product.js'
import Sale from './models/Sale.js'
import { skuPrefix, makeReference } from './utils/ids.js'

async function backfillProducts() {
  const owners = await Product.distinct('owner')
  let filled = 0

  for (const owner of owners) {
    const products = await Product.find({ owner })
    const used = new Set(products.map((p) => p.sku).filter(Boolean))
    const counters = {}

    // Start each prefix counter at the highest existing number
    for (const p of products) {
      if (!p.sku) continue
      const [prefix, num] = p.sku.split('-')
      const n = Number(num)
      if (Number.isInteger(n)) counters[prefix] = Math.max(counters[prefix] || 0, n)
    }

    for (const product of products) {
      if (product.sku) continue
      const prefix = skuPrefix(product.category)
      let n = counters[prefix] || 0
      let sku
      do {
        n += 1
        sku = `${prefix}-${String(n).padStart(4, '0')}`
      } while (used.has(sku))
      counters[prefix] = n
      used.add(sku)
      product.sku = sku
      await product.save()
      filled += 1
    }
  }
  return filled
}

async function backfillSales() {
  const sales = await Sale.find({ $or: [{ reference: { $exists: false } }, { reference: '' }] })
  for (const sale of sales) {
    sale.reference = makeReference(sale.date)
    await sale.save()
  }

  const legacy = await Sale.updateMany(
    { $or: [{ paymentMethod: { $exists: false } }, { paymentMethod: null }] },
    { $set: { paymentMethod: 'cash' } }
  )
  return { references: sales.length, payments: legacy.modifiedCount }
}

async function run() {
  await connectDB()
  const products = await backfillProducts()
  const sales = await backfillSales()

  // Build the new unique indexes now that every document has the fields
  await Product.syncIndexes()
  await Sale.syncIndexes()

  console.log(`Backfilled ${products} products with SKUs.`)
  console.log(`Backfilled ${sales.references} sale references and ${sales.payments} payment methods.`)
  await mongoose.disconnect()
}

run().catch(async (err) => {
  console.error('Backfill failed:', err.message)
  await mongoose.disconnect()
  process.exit(1)
})
