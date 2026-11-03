import { Router } from 'express'
import mongoose from 'mongoose'
import Product from '../models/Product.js'
import Sale from '../models/Sale.js'
import auth from '../middleware/auth.js'

const router = Router()
router.use(auth)

const DAY = 24 * 60 * 60 * 1000
const round2 = (n) => Math.round(n * 100) / 100

// Accept only real time zone names (e.g. "Africa/Addis_Ababa"); anything else becomes UTC.
function safeTimeZone(tz) {
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return tz } catch { return 'UTC' }
}

// "2026-11-02" for the current moment in that time zone
const dayKey = (date, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date)

// Pure calendar maths on "YYYY-MM-DD" strings (no clock or DST involved)
function shiftKey(key, days) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

// GET /api/reports/summary?days=30&tz=Africa/Addis_Ababa
router.get('/summary', async (req, res, next) => {
  try {
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30
    const tz = safeTimeZone(req.query.tz)
    const owner = new mongoose.Types.ObjectId(req.userId) // aggregate() needs a real ObjectId

    const todayKey = dayKey(new Date(), tz)
    const monthPrefix = todayKey.slice(0, 7)
    const windowStart = shiftKey(todayKey, -(days - 1))
    // The query must also cover "this month" for the month tile, so reach back far enough for both
    const queryStart = shiftKey(todayKey, -(Math.max(days, 31) - 1))

    // Rough date filter first (can use the index), then the exact day-in-your-time-zone filter
    const roughFrom = new Date(new Date(`${queryStart}T00:00:00Z`).getTime() - DAY)
    const withDay = [
      { $match: { owner, date: { $gte: roughFrom } } },
      { $addFields: { day: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: tz } } } },
      { $match: { day: { $gte: queryStart } } },
    ]

    const [perDay, top, lowStock, lowStockCount] = await Promise.all([
      Sale.aggregate([...withDay, { $group: { _id: '$day', revenue: { $sum: '$total' }, count: { $sum: 1 } } }]),

      Sale.aggregate([
        ...withDay,
        { $match: { day: { $gte: windowStart } } },
        { $unwind: '$items' },
        { $group: {
            _id: '$items.product',
            name: { $last: '$items.name' },
            units: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),

      // $expr lets us compare two fields of the same document (stock <= lowStockLevel)
      Product.find({ owner, $expr: { $lte: ['$stock', '$lowStockLevel'] } })
        .sort({ stock: 1, name: 1 }).limit(8).select('name sku stock lowStockLevel category'),
      Product.countDocuments({ owner, $expr: { $lte: ['$stock', '$lowStockLevel'] } }),
    ])

    const byDay = new Map(perDay.map((d) => [d._id, d]))
    const totalOf = (keys) => keys.reduce(
      (acc, k) => { const d = byDay.get(k); return d ? { revenue: acc.revenue + d.revenue, count: acc.count + d.count } : acc },
      { revenue: 0, count: 0 })

    // One entry for EVERY day in the window, with 0 for quiet days, so the chart has no gaps
    const windowKeys = Array.from({ length: days }, (_, i) => shiftKey(windowStart, i))
    const daily = windowKeys.map((k) => ({ date: k, revenue: round2(byDay.get(k)?.revenue || 0), count: byDay.get(k)?.count || 0 }))

    const monthKeys = [...byDay.keys()].filter((k) => k.startsWith(monthPrefix))
    const fix = (t) => ({ revenue: round2(t.revenue), count: t.count })

    res.json({
      today: fix(totalOf([todayKey])),
      yesterday: fix(totalOf([shiftKey(todayKey, -1)])),
      month: fix(totalOf(monthKeys)),
      period: { days, ...fix(totalOf(windowKeys)) },
      daily,
      topProducts: top.map((t) => ({ productId: t._id, name: t.name, units: t.units, revenue: round2(t.revenue) })),
      lowStock,
      lowStockCount,
    })
  } catch (err) { next(err) }
})

export default router
