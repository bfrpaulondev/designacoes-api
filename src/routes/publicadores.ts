import { Router, Request, Response } from 'express'
import { getDb } from '../db.js'
import { ObjectId } from 'mongodb'
import { authenticate, authorize, auditAction } from '../middleware/auth.js'

const router = Router()

// Aplicar autenticação em todas as rotas
router.use(authenticate)

// Listar todos os publicadores
router.get('/', authorize('publicadores', 'read'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const publicadores = await db.collection('publicadores')
      .find({})
      .sort({ nome: 1 })
      .toArray()

    res.json({ publicadores })
  } catch (error: any) {
    console.error('Error listing publicadores:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obter um publicador por ID
router.get('/:id', authorize('publicadores', 'read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()
    
    let publicador
    if (ObjectId.isValid(id)) {
      publicador = await db.collection('publicadores').findOne({ _id: new ObjectId(id) })
    }
    if (!publicador) {
      publicador = await db.collection('publicadores').findOne({ id })
    }

    if (!publicador) {
      return res.status(404).json({ error: 'Publicador não encontrado' })
    }

    res.json({ publicador })
  } catch (error: any) {
    console.error('Error getting publicador:', error)
    res.status(500).json({ error: error.message })
  }
})

// Criar novo publicador
router.post('/', authorize('publicadores', 'create'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const data = req.body

    // Gerar nome completo e nome
    const nomePrimeiro = data.nomePrimeiro || ''
    const nomeUltimo = data.nomeUltimo || ''
    const nomeCompleto = `${nomePrimeiro} ${nomeUltimo}`.trim()
    const nome = nomePrimeiro

    const publicador = {
      id: new ObjectId().toString(),
      nome,
      nomeCompleto,
      nomePrimeiro,
      nomeUltimo,
      email: data.email || '',
      telemovel: data.telemovel || '',
      genero: data.genero || 'masculino',
      tipoPublicador: data.tipoPublicador || 'publicador_batizado',
      privilegioServico: data.privilegioServico || 'nenhum',
      grupoCampo: data.grupoCampo || '',
      grupoLimpeza: data.grupoLimpeza || '',
      cidade: data.cidade || '',
      morada: data.morada || '',
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      status: data.status || 'ativo',
      etiquetas: data.etiquetas || [],
      restricoes: [],
      observacoes: data.observacoes || '',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await db.collection('publicadores').insertOne(publicador)
    
    await auditAction(req, 'create', 'publicadores', publicador.id, { nome: publicador.nomeCompleto })
    
    res.status(201).json({ 
      publicador: { ...publicador, _id: result.insertedId } 
    })
  } catch (error: any) {
    console.error('Error creating publicador:', error)
    res.status(500).json({ error: error.message })
  }
})

// Atualizar publicador
router.put('/:id', authorize('publicadores', 'update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()
    const data = req.body

    // Remover campos imutáveis que não devem ser atualizados
    const { _id, id: bodyId, createdAt, ...safeData } = data

    const updateData: any = {
      ...safeData,
      updatedAt: new Date()
    }

    // Tentar encontrar por `id` ou `_id`
    let existing: any = null
    if (ObjectId.isValid(id)) {
      existing = await db.collection('publicadores').findOne({ _id: new ObjectId(id) })
    }
    if (!existing) {
      existing = await db.collection('publicadores').findOne({ id })
    }

    if (!existing) {
      return res.status(404).json({ error: 'Publicador não encontrado' })
    }

    // Recalcular nomes se necessário
    if (data.nomePrimeiro !== undefined || data.nomeUltimo !== undefined) {
      const nomePrimeiro = data.nomePrimeiro ?? existing?.nomePrimeiro ?? ''
      const nomeUltimo = data.nomeUltimo ?? existing?.nomeUltimo ?? ''
      updateData.nomeCompleto = `${nomePrimeiro} ${nomeUltimo}`.trim()
      updateData.nome = nomePrimeiro
      updateData.nomePrimeiro = nomePrimeiro
      updateData.nomeUltimo = nomeUltimo
    }

    // Atualizar usando o `id` do documento encontrado
    await db.collection('publicadores').updateOne(
      { id: existing.id },
      { $set: updateData }
    )

    const updated = await db.collection('publicadores').findOne({ id: existing.id })
    
    await auditAction(req, 'update', 'publicadores', existing.id, { changes: updateData })
    
    res.json({ publicador: updated })
  } catch (error: any) {
    console.error('Error updating publicador:', error)
    res.status(500).json({ error: error.message })
  }
})

// Excluir TODOS os publicadores (deve vir antes de /:id) - Apenas admin
router.delete('/all', authorize('publicadores', 'delete'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()

    // Excluir todas as designações primeiro
    const designacoesResult = await db.collection('designacoes').deleteMany({})
    
    // Excluir todas as ausências
    const ausenciasResult = await db.collection('ausencias').deleteMany({})
    
    // Excluir todos os publicadores
    const publicadoresResult = await db.collection('publicadores').deleteMany({})

    await auditAction(req, 'delete_all', 'publicadores', undefined, { 
      publicadoresExcluidos: publicadoresResult.deletedCount,
      designacoesExcluidas: designacoesResult.deletedCount,
      ausenciasExcluidas: ausenciasResult.deletedCount
    })

    res.json({ 
      message: 'Todos os dados foram excluídos com sucesso',
      excluidos: {
        publicadores: publicadoresResult.deletedCount,
        designacoes: designacoesResult.deletedCount,
        ausencias: ausenciasResult.deletedCount
      }
    })
  } catch (error: any) {
    console.error('Error deleting all publicadores:', error)
    res.status(500).json({ error: error.message })
  }
})

// Excluir publicador
router.delete('/:id', authorize('publicadores', 'delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()

    const publicador = await db.collection('publicadores').findOne({ id })
    
    await db.collection('publicadores').deleteOne({ id })
    
    await auditAction(req, 'delete', 'publicadores', id, { nome: publicador?.nomeCompleto })
    
    res.json({ message: 'Publicador excluído com sucesso' })
  } catch (error: any) {
    console.error('Error deleting publicador:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
