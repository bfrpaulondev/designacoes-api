import { Router, Request, Response } from 'express'
import { getDb } from '../db.js'
import { ObjectId } from 'mongodb'
import { authenticate, authorize, auditAction } from '../middleware/auth.js'

const router = Router()

// Aplicar autenticação em todas as rotas
router.use(authenticate)

// Listar todas as semanas
router.get('/', authorize('semanas', 'read'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const semanas = await db.collection('semanas')
      .find({})
      .sort({ dataInicio: -1 })
      .toArray()

    res.json({ semanas })
  } catch (error: any) {
    console.error('Error listing semanas:', error)
    res.status(500).json({ error: error.message })
  }
})

// Criar nova semana
router.post('/', authorize('semanas', 'create'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const data = req.body

    const dataInicio = new Date(data.dataInicio)
    const dataFim = new Date(dataInicio)
    dataFim.setDate(dataFim.getDate() + 6)

    const semana = {
      id: new ObjectId().toString(),
      dataInicio,
      dataFim,
      observacoes: data.observacoes || '',
      status: 'rascunho',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('semanas').insertOne(semana)
    res.status(201).json({ 
      semana: { ...semana, _id: result.insertedId } 
    })
  } catch (error: any) {
    console.error('Error creating semana:', error)
    res.status(500).json({ error: error.message })
  }
})

// Atualizar semana
router.put('/:id', authorize('semanas', 'update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()
    const data = req.body

    await db.collection('semanas').updateOne(
      { id },
      { $set: { ...data, updatedAt: new Date() } }
    )

    const updated = await db.collection('semanas').findOne({ id })
    res.json({ semana: updated })
  } catch (error: any) {
    console.error('Error updating semana:', error)
    res.status(500).json({ error: error.message })
  }
})

// Excluir semana
router.delete('/:id', authorize('semanas', 'delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()

    // Excluir designações associadas
    await db.collection('designacoes').deleteMany({ semanaId: id })
    await db.collection('semanas').deleteOne({ id })
    
    res.json({ message: 'Semana excluída com sucesso' })
  } catch (error: any) {
    console.error('Error deleting semana:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
