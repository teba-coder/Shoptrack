import { Router } from 'express'
import Product from '../models/Product.js'
import auth from '../middleware/auth.js'
import { makeSku } from '../utils/ids.js'

const router = Router()
router.use(auth) // every route below requires login

// Only these fields may come from the client. Stops people from sending
// { owner: "someone else" } and stealing or overwriting other shops' data.
const pick = (body) => {
  const out = {}
  for (const key of ['sku', 'name', 'category', 'price', 'stock', 'lowStockLevel']) {
    if (body[key] === undefined) continue
    if (key === 'sku' && String(body[key]).trim() === '') continue // blank = auto-generate
    out[key] = body[key]
  }
  return out
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// GET /api/products?search=rice&category=Food&lowStock=true
// Search matches either the product name or the SKU code.
router.get('/', async (req, res, next) => {
  try {
    const filter = { owner: req.userId }
    if (typeof req.query.search === 'string' && req.query.search) {
      const rx = { $regex: escapeRegex(req.query.search), $options: 'i' }
      filter.$or = [{ name: rx }, { sku: rx }]
    }
    if (typeof req.query.category === 'string' && req.query.category) filter.category = req.query.category
    if (req.query.lowStock === 'true') filter.$expr = { $lte: ['$stock', '$lowStockLevel'] }

    const products = await Product.find(filter).sort({ name: 1 })
    const categories = await Product.distinct('category', { owner: req.userId })
    res.json({ products, categories: categories.sort() })
  } catch (err) { next(err) }
})

// GET /api/products/low-stock -> sidebar badge + notification bell
router.get('/low-stock', async (req, res, next) => {
  try {
    const query = { owner: req.userId, $expr: { $lte: ['$stock', '$lowStockLevel'] } }
    const [items, count] = await Promise.all([
      Product.find(query)
        .sort({ stock: 1, name: 1 })
        .limit(50)
        .select('name sku stock lowStockLevel category'),
      Product.countDocuments(query),
    ])
    res.json({ items, count })
  } catch (err) { next(err) }
})

router.post('/', async (req, res, next) => {
  try {
    const data = pick(req.body)

    // A SKU supplied by the shopkeeper is used as-is; duplicates are rejected
    // by the unique index and turned into a 409 by the error handler.
    if (data.sku) {
      const product = await Product.create({ ...data, owner: req.userId })
      return res.status(201).json({ product })
    }

    // Otherwise generate one. A rare race can pick the same number twice,
    // so retry with the next free number when the unique index complains.
    let lastError
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const sku = await makeSku(req.userId, data.category)
        const product = await Product.create({ ...data, sku, owner: req.userId })
        return res.status(201).json({ product })
      } catch (err) {
        if (err.code === 11000 && err.keyPattern?.sku) { lastError = err; continue }
        throw err
      }
    }
    throw lastError
  } catch (err) { next(err) }
})

router.put('/:id', async (req, res, next) => {
  try {
    // Matching on owner too means you cannot edit another shop's product
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      pick(req.body),
      { new: true, runValidators: true }
    )
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ product })
  } catch (err) { next(err) }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const product = await Product.findOneAndDelete({ _id: req.params.id, owner: req.userId })
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ message: 'Product deleted' })
  } catch (err) { next(err) }
})

export default router
