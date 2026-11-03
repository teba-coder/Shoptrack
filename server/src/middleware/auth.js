import jwt from 'jsonwebtoken'

// Runs before protected routes. Lets the request through only with a valid token.
export default function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Not logged in' })

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.id // later routes know WHO is asking
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}
