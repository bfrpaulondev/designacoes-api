import { Router, Request, Response } from 'express'
import { getDb } from '../db.js'
import { ObjectId } from 'mongodb'
import { authenticate, authorize, auditAction } from '../middleware/auth.js'

const router = Router()

// Aplicar autenticação em todas as rotas
router.use(authenticate)

// Listar todas as etiquetas
router.get('/', authorize('etiquetas', 'read'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const etiquetas = await db.collection('etiquetas')
      .find({})
      .sort({ ordem: 1 })
      .toArray()

    res.json({ etiquetas })
  } catch (error: any) {
    console.error('Error listing etiquetas:', error)
    res.status(500).json({ error: error.message })
  }
})

// Criar nova etiqueta
router.post('/', authorize('etiquetas', 'create'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const data = req.body

    const etiqueta = {
      id: new ObjectId().toString(),
      nome: data.nome,
      icone: data.icone || 'Tag',
      cor: data.cor || '#6B7280',
      descricao: data.descricao || '',
      ordem: data.ordem || 0,
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('etiquetas').insertOne(etiqueta)
    res.status(201).json({ 
      etiqueta: { ...etiqueta, _id: result.insertedId } 
    })
  } catch (error: any) {
    console.error('Error creating etiqueta:', error)
    res.status(500).json({ error: error.message })
  }
})

// Atualizar etiqueta
router.put('/:id', authorize('etiquetas', 'update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()
    const data = req.body

    await db.collection('etiquetas').updateOne(
      { id },
      { $set: { ...data, updatedAt: new Date() } }
    )

    const updated = await db.collection('etiquetas').findOne({ id })
    res.json({ etiqueta: updated })
  } catch (error: any) {
    console.error('Error updating etiqueta:', error)
    res.status(500).json({ error: error.message })
  }
})

// Excluir etiqueta
router.delete('/:id', authorize('etiquetas', 'delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()

    await db.collection('etiquetas').deleteOne({ id })
    res.json({ message: 'Etiqueta excluída com sucesso' })
  } catch (error: any) {
    console.error('Error deleting etiqueta:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
