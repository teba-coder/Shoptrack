import 'dotenv/config' // must stay first: loads .env before anything reads process.env
import app from './app.js'
import connectDB from './config/db.js'

// Fail immediately with a clear message instead of crashing later in a confusing way
if (!process.env.MONGODB_URI) { console.error('Missing MONGODB_URI in environment'); process.exit(1) }
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('JWT_SECRET is missing or too short (use at least 16 random characters)')
  process.exit(1)
}

const port = process.env.PORT || 5000
connectDB()
  .then(() => app.listen(port, () => console.log(`API running on port ${port}`)))
  .catch((err) => { console.error('Database connection failed:', err.message); process.exit(1) })
