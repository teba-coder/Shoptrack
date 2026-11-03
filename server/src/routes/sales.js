import { Router } from 'express'
import mongoose from 'mongoose'
import Product from '../models/Product.js'
import Sale, { PAYMENT_METHODS } from '../models/Sale.js'
import auth from '../middleware/auth.js'
import HttpError from '../utils/HttpError.js'
import { makeReference } from '../utils/ids.js'

const router = Router()
router.use(auth)

// Checks the request and merges repeated products (2 + 3 of the same = 5).
function cleanItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new HttpError('Add at least one item to the sale')
  if (items.length > 50) throw new HttpError('A sale can have at most 50 lines')
  const totals = new Map()
  for (const item of items) {
    const quantity = Number(item?.quantity)
    if (!/^[a-f\d]{24}$/i.test(String(item?.productId))) throw new HttpError('Invalid product in sale')
    if (!Number.isInteger(quantity) || quantity < 1) throw new HttpError('Quantity must be a whole number of 1 or more')
    const id = String(item.productId)
    totals.set(id, (totals.get(id) || 0) + quantity)
  }
  return [...totals].map(([productId, quantity]) => ({ productId, quantity }))
}

// POST /api/sales   body: { items: [{ productId, quantity }], paymentMethod }
// The client sends WHAT and HOW MANY. Names and prices come from the database,
// never from the client, so nobody can sell a product for a price they made up.
router.post('/', async (req, res, next) => {
  let session
  try {
    const wanted = cleanItems(req.body.items)
    if (!PAYMENT_METHODS.includes(req.body.paymentMethod))
      throw new HttpError('Choose a payment method')

    const reference = makeReference()
    session = await mongoose.startSession()
    let sale

    // A transaction makes the whole sale all-or-nothing: if the 3rd item is out of
    // stock, the stock already taken for items 1 and 2 is put back automatically.
    await session.withTransaction(async () => {
      const lines = []
      for (const { productId, quantity } of wanted) {
        // ONE atomic step: "if stock >= quantity, then subtract". The check and the
        // subtraction cannot be separated, so two simultaneous sales can never push
        // stock below zero. Returns the product as it was BEFORE the update.
        const product = await Product.findOneAndUpdate(
          { _id: productId, owner: req.userId, stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { session }
        )
        if (!product) {
          // Work out why it failed, to give a useful message
          const current = await Product.findOne({ _id: productId, owner: req.userId }, 'name stock', { session })
          if (!current) throw new HttpError('A product in this sale no longer exists', 404)
          throw new HttpError(`Not enough stock for "${current.name}". Only ${current.stock} left.`, 409)
        }
        lines.push({ product: product._id, name: product.name, price: product.price, quantity })
      }
      const total = Math.round(lines.reduce((sum, l) => sum + l.price * l.quantity, 0) * 100) / 100
      const [created] = await Sale.create(
        [{ owner: req.userId, reference, paymentMethod: req.body.paymentMethod, items: lines, total }],
        { session }
      )
      sale = created
    })

    res.status(201).json({ sale })
  } catch (err) {
    next(err)
  } finally {
    await session?.endSession()
  }
})

// GET /api/sales?from=<ISO date>&to=<ISO date>
router.get('/', async (req, res, next) => {
  try {
    const filter = { owner: req.userId }
    const range = {}
    for (const [param, op] of [['from', '$gte'], ['to', '$lte']]) {
      if (!req.query[param]) continue
      const date = new Date(req.query[param])
      if (isNaN(date)) throw new HttpError(`Invalid "${param}" date`)
      range[op] = date
    }
    if (Object.keys(range).length) filter.date = range

    const [sales, totals] = await Promise.all([
      Sale.find(filter).sort({ date: -1 }).limit(200),
      // aggregate() does NOT auto-convert strings to ObjectIds like find() does,
      // so we convert the owner id ourselves.
      Sale.aggregate([
        { $match: { ...filter, owner: new mongoose.Types.ObjectId(req.userId) } },
        { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
    ])
    res.json({ sales, summary: { count: totals[0]?.count || 0, revenue: totals[0]?.revenue || 0 } })
  } catch (err) { next(err) }
})

export default router
