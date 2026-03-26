import { Router, Request, Response } from 'express'
import { getDb } from '../db.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key'

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    }

    const db = await getDb()
    const user = await db.collection('users').findOne({ email })

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error: any) {
    console.error('Login error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Verify token
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string }

    const db = await getDb()
    const user = await db.collection('users').findOne({ _id: decoded.id })

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' })
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error: any) {
    res.status(401).json({ error: 'Token inválido' })
  }
})

export default router
