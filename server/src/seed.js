// Fills the database with a demo shop so the dashboard has something to show.
//   npm run seed
// Logs in with demo@shoptrack.dev / demo1234. Only touches that one demo account,
// and running it again resets the demo data.
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import connectDB from './config/db.js'
import User from './models/User.js'
import Product from './models/Product.js'
import Sale from './models/Sale.js'
import { skuPrefix, makeReference } from './utils/ids.js'

// Small seeded random generator: same numbers every run, so the demo is repeatable
function makeRandom(seed) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const random = makeRandom(2026)
const between = (min, max) => Math.floor(random() * (max - min + 1)) + min

// name, category, price (ETB), popularity (higher = sells more), target stock left
const CATALOG = [
  ['Teff flour 5kg', 'Grains', 650, 5, 14],
  ['Sugar 1kg', 'Groceries', 120, 9, 3],
  ['Cooking oil 1L', 'Groceries', 260, 8, 18],
  ['Roasted coffee 500g', 'Beverages', 420, 6, 11],
  ['Bottled water 1.5L', 'Beverages', 35, 10, 40],
  ['Soft drink 300ml', 'Beverages', 30, 9, 4],
  ['Bread loaf', 'Bakery', 25, 10, 12],
  ['Eggs (tray of 30)', 'Groceries', 540, 4, 6],
  ['Laundry soap bar', 'Household', 45, 6, 22],
  ['Toothpaste', 'Household', 95, 4, 2],
  ['Notebook A5', 'Stationery', 60, 5, 30],
  ['Ballpoint pen', 'Stationery', 12, 7, 55],
  ['Mobile airtime card 50', 'Services', 50, 8, 9],
  ['Lentils 1kg', 'Grains', 180, 4, 0],
  ['Spaghetti 500g', 'Groceries', 85, 5, 17],
]

const DAYS = 60

async function run() {
  await connectDB()

  const email = 'demo@shoptrack.dev'
  let user = await User.findOne({ email })
  if (!user) user = await User.create({ name: 'Demo Shop', email, password: await bcrypt.hash('demo1234', 10) })
  await Promise.all([Product.deleteMany({ owner: user._id }), Sale.deleteMany({ owner: user._id })])

  // Per-prefix counter so each seeded product gets a readable, unique SKU
  const skuCounters = {}
  const nextSku = (category) => {
    const prefix = skuPrefix(category)
    const n = (skuCounters[prefix] || 0) + 1
    skuCounters[prefix] = n
    return `${prefix}-${String(n).padStart(4, '0')}`
  }

  const products = await Product.insertMany(
    CATALOG.map(([name, category, price, , stock]) => ({
      owner: user._id, sku: nextSku(category), name, category, price, stock, lowStockLevel: 5,
    }))
  )

  // Most people pay cash, some use mobile money, a few use cards
  const paymentFor = () => {
    const r = random()
    return r < 0.6 ? 'cash' : r < 0.9 ? 'mobile' : 'card'
  }

  // Weighted pick so popular items appear more often in sales
  const weights = CATALOG.map((c) => c[3])
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const pickIndex = () => {
    let r = random() * weightSum
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i }
    return weights.length - 1
  }

  const now = Date.now()
  const startOfToday = new Date(); startOfToday.setUTCHours(0, 0, 0, 0)
  const sales = []

  for (let back = DAYS - 1; back >= 0; back--) {
    const dayStart = startOfToday.getTime() - back * 86400000
    const weekday = new Date(dayStart).getUTCDay() // 0 = Sunday
    // Busier toward the weekend, and slowly growing over the 60 days
    const base = weekday === 6 || weekday === 0 ? 9 : 5
    const growth = 1 + (DAYS - back) / DAYS * 0.5
    const count = Math.round((base + between(0, 4)) * growth)

    for (let n = 0; n < count; n++) {
      // Shop hours: about 08:00 to 20:00 in Addis Ababa (UTC+3)
      let date = dayStart + between(5, 17) * 3600000 + between(0, 59) * 60000
      if (date > now) date = now - between(1, 180) * 60000 // never create a sale in the future

      const lines = new Map()
      for (let k = between(1, 4); k > 0; k--) {
        const i = pickIndex()
        lines.set(i, (lines.get(i) || 0) + between(1, 3))
      }
      const items = [...lines].map(([i, quantity]) => ({
        product: products[i]._id, name: products[i].name, price: products[i].price, quantity,
      }))
      const total = Math.round(items.reduce((s, l) => s + l.price * l.quantity, 0) * 100) / 100
      sales.push({
        owner: user._id,
        reference: makeReference(new Date(date)),
        paymentMethod: paymentFor(),
        items,
        total,
        date: new Date(date),
      })
    }
  }

  await Sale.insertMany(sales)
  console.log(`Seeded ${products.length} products and ${sales.length} sales.`)
  console.log('Log in with  demo@shoptrack.dev  /  demo1234')
  await mongoose.disconnect()
}

run().catch(async (err) => { console.error('Seeding failed:', err.message); await mongoose.disconnect(); process.exit(1) })
