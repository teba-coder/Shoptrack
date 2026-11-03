import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import auth from '../middleware/auth.js'

const router = Router()

const makeToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })
// Only accept real strings. If someone sends {"email": {"$ne": null}} the database
// would treat it as a query operator (NoSQL injection), so non-strings become ''.
const text = (v) => (typeof v === 'string' ? v.trim() : '')

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email })

router.post('/register', async (req, res, next) => {
  try {
    const name = text(req.body.name)
    const email = text(req.body.email).toLowerCase()
    const password = typeof req.body.password === 'string' ? req.body.password : ''
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' })
    if (name.length > 60) return res.status(400).json({ message: 'Name is too long (60 characters at most)' })
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 120) return res.status(400).json({ message: 'Enter a valid email address' })
    // bcrypt only reads the first 72 bytes, so longer passwords add nothing
    if (password.length < 8 || password.length > 72) return res.status(400).json({ message: 'Password must be 8 to 72 characters' })

    if (await User.findOne({ email }))
      return res.status(409).json({ message: 'That email is already registered' })

    const hashed = await bcrypt.hash(password, 10)
    const user = await User.create({ name, email, password: hashed })
    res.status(201).json({ token: makeToken(user._id), user: publicUser(user) })
  } catch (err) { next(err) }
})

router.post('/login', async (req, res, next) => {
  try {
    const email = text(req.body.email).toLowerCase()
    const password = typeof req.body.password === 'string' ? req.body.password : ''
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' })

    const user = await User.findOne({ email }).select('+password')
    // Same message for both failures so attackers cannot learn which emails exist
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Wrong email or password' })

    res.json({ token: makeToken(user._id), user: publicUser(user) })
  } catch (err) { next(err) }
})

// A protected route: proves the middleware works
router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) return res.status(404).json({ message: 'User not found' })
    res.json({ user: publicUser(user) })
  } catch (err) { next(err) }
})

export default router
