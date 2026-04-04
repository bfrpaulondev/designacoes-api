import { Router, Request, Response } from 'express'
import { getDb } from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

// Aplicar autenticação em todas as rotas
router.use(authenticate)

// Obter configurações
router.get('/', authorize('configuracoes', 'read'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const config = await db.collection('config').findOne({})

    res.json({ config: config || {} })
  } catch (error: any) {
    console.error('Error getting config:', error)
    res.status(500).json({ error: error.message })
  }
})

// Salvar configurações
router.post('/', authorize('configuracoes', 'update'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const data = req.body

    const existing = await db.collection('config').findOne({})

    if (existing) {
      await db.collection('config').updateOne(
        {},
        { $set: { ...data, updatedAt: new Date() } }
      )
    } else {
      await db.collection('config').insertOne({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }

    const updated = await db.collection('config').findOne({})
    res.json({ config: updated })
  } catch (error: any) {
    console.error('Error saving config:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
