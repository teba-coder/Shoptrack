import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import saleRoutes from './routes/sales.js'
import reportRoutes from './routes/reports.js'
import HttpError from './utils/HttpError.js'

// The app is built here and started in index.js, so tests can use it without a database.
const app = express()

// On Render the app sits behind a proxy. Without this every visitor looks like the same IP,
// which would make the rate limiter below block everyone at once.
app.set('trust proxy', 1)

app.use(helmet()) // sets safe HTTP headers (no sniffing, no framing, etc.)

// CLIENT_URL can list several addresses separated by commas
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim().replace(/\/$/, ''))
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)) }))

app.use(express.json({ limit: '100kb' })) // refuse huge bodies

// Slows down password guessing: 30 login/register attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/sales', saleRoutes)
app.use('/api/reports', reportRoutes)

// Any other /api address
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }))

// Last in the chain: turns every kind of error into a clean JSON answer
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body is not valid JSON' })
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large' })
  if (err.name === 'ValidationError')
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join('. ') })
  if (err.name === 'CastError') return res.status(400).json({ message: `Invalid value for "${err.path}"` })
  if (err.code === 11000) {
    const duplicateSku = err.keyPattern?.sku || err.keyValue?.sku
    return res.status(409).json({ message: duplicateSku ? 'That SKU is already in use' : 'That value is already in use' })
  }
  console.error(err)
  res.status(500).json({ message: 'Something went wrong on the server' })
})

export default app
