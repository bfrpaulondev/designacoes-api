import { Router, Request, Response } from 'express'
import { getDb } from '../db.js'
import { ObjectId } from 'mongodb'
import { authenticate, authorize, auditAction } from '../middleware/auth.js'

const router = Router()

// Aplicar autenticação em todas as rotas
router.use(authenticate)

// ============================================
// TIPOS DE DESIGNAÇÕES
// ============================================

/**
 * Lista fixa de designações que um publicador pode receber
 * Organizadas por categoria
 */
const DESIGNACOES = {
  meio_semana: [
    { id: 'oracao_meio', nome: 'Oração', categoria: 'Meio de Semana' },
    { id: 'presidente_meio', nome: 'Presidente', categoria: 'Meio de Semana' },
    { id: 'conselheiro_aux', nome: 'Conselheiro Aux. (2ª Sala)', categoria: 'Meio de Semana' },
    { id: 'tesouros', nome: 'Tesouros da Palavra de Deus', categoria: 'Meio de Semana' },
    { id: 'perolas', nome: 'Pérolas Espirituais', categoria: 'Meio de Semana' },
    { id: 'leitor_biblia', nome: 'Leitor da Bíblia', categoria: 'Meio de Semana' },
    { id: 'contacto_inicial', nome: 'Contacto inicial (vídeo)', categoria: 'Meio de Semana' },
    { id: 'iniciar_conversas', nome: 'Iniciar conversas', categoria: 'Meio de Semana' },
    { id: 'cultivar_interesse', nome: 'Cultivar o interesse', categoria: 'Meio de Semana' },
    { id: 'fazer_discipulos', nome: 'Fazer discípulos', categoria: 'Meio de Semana' },
    { id: 'ajudante', nome: 'Ajudante', categoria: 'Meio de Semana' },
    { id: 'discurso_estudante', nome: 'Discurso de Estudante', categoria: 'Meio de Semana' },
    { id: 'viver_cristaos', nome: 'Viver como Cristãos', categoria: 'Meio de Semana' },
    { id: 'estudo_biblico', nome: 'Estudo Bíblico de Congregação', categoria: 'Meio de Semana' },
    { id: 'leitor_ebc', nome: 'Leitor do Estudo Bíblico de Congregação', categoria: 'Meio de Semana' },
  ],
  fim_semana: [
    { id: 'oracao_fim', nome: 'Oração', categoria: 'Fim de Semana' },
    { id: 'presidente_fim', nome: 'Presidente', categoria: 'Fim de Semana' },
    { id: 'indicador', nome: 'Indicador', categoria: 'Fim de Semana' },
    { id: 'assistente_zoom', nome: 'Assistente Zoom', categoria: 'Fim de Semana' },
    { id: 'indicador_entrada', nome: 'Indicador entrada', categoria: 'Fim de Semana' },
    { id: 'palco', nome: 'Palco', categoria: 'Fim de Semana' },
    { id: 'audio', nome: 'Áudio', categoria: 'Fim de Semana' },
    { id: 'video', nome: 'Vídeo', categoria: 'Fim de Semana' },
    { id: 'microfones', nome: 'Microfones', categoria: 'Fim de Semana' },
    { id: 'discursos_publicos', nome: 'Discursos Públicos', categoria: 'Fim de Semana' },
    { id: 'discursos_publicos_fora', nome: 'Discursos Públicos - Fora', categoria: 'Fim de Semana' },
    { id: 'dirigente_sentinela', nome: 'Dirigente de A Sentinela', categoria: 'Fim de Semana' },
    { id: 'leitor_sentinela', nome: 'Leitor da Sentinela', categoria: 'Fim de Semana' },
    { id: 'hospitalidade', nome: 'Hospitalidade', categoria: 'Fim de Semana' },
    { id: 'interprete', nome: 'Intérprete', categoria: 'Fim de Semana' },
  ],
  outros: [
    { id: 'reuniao_servico', nome: 'Reunião de Serviço de Campo', categoria: 'Outros' },
    { id: 'testemunho_publico', nome: 'Testemunho Público', categoria: 'Outros' },
    { id: 'limpeza', nome: 'Limpeza', categoria: 'Outros' },
  ]
}

// Lista plana de todas as designações
const TODAS_DESIGNACOES = [
  ...DESIGNACOES.meio_semana,
  ...DESIGNACOES.fim_semana,
  ...DESIGNACOES.outros,
]

/**
 * Listar todas as designações disponíveis
 */
router.get('/designacoes', authorize('publicadores', 'read'), async (req: Request, res: Response) => {
  res.json({ 
    designacoes: DESIGNACOES,
    todas: TODAS_DESIGNACOES
  })
})

// ============================================
// MATRIZ DE QUALIFICAÇÕES
// ============================================

/**
 * Obter matriz completa (todos publicadores x todas designações)
 */
router.get('/matriz', authorize('publicadores', 'read'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    
    const publicadores = await db.collection('publicadores')
      .find({ status: 'ativo' })
      .sort({ nome: 1 })
      .toArray()

    const matriz = publicadores.map((pub: any) => ({
      id: pub.id,
      nome: pub.nomeCompleto || pub.nome,
      genero: pub.genero,
      privilegioServico: pub.privilegioServico,
      designacoes: pub.designacoesQualificado || [] // Array simples de IDs
    }))

    // Contagem por designação
    const contagem: Record<string, number> = {}
    TODAS_DESIGNACOES.forEach(d => {
      contagem[d.id] = 0
    })
    publicadores.forEach((pub: any) => {
      (pub.designacoesQualificado || []).forEach((d: string) => {
        if (contagem[d] !== undefined) {
          contagem[d]++
        }
      })
    })

    res.json({
      designacoes: DESIGNACOES,
      todas: TODAS_DESIGNACOES,
      publicadores: matriz,
      contagem,
      totalPublicadores: publicadores.length
    })
  } catch (error: any) {
    console.error('Error getting matriz:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Obter qualificações de um publicador específico
 */
router.get('/publicador/:publicadorId', authorize('publicadores', 'read'), async (req: Request, res: Response) => {
  try {
    const { publicadorId } = req.params
    const db = await getDb()

    let publicador: any = null
    if (ObjectId.isValid(publicadorId)) {
      publicador = await db.collection('publicadores').findOne({ _id: new ObjectId(publicadorId) })
    }
    if (!publicador) {
      publicador = await db.collection('publicadores').findOne({ id: publicadorId })
    }

    if (!publicador) {
      return res.status(404).json({ error: 'Publicador não encontrado' })
    }

    res.json({
      publicador: {
        id: publicador.id,
        nome: publicador.nomeCompleto || publicador.nome,
        genero: publicador.genero,
        privilegioServico: publicador.privilegioServico,
      },
      designacoes: publicador.designacoesQualificado || [],
      todas: TODAS_DESIGNACOES,
      designacoesPorCategoria: DESIGNACOES
    })
  } catch (error: any) {
    console.error('Error getting publicador:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Atualizar qualificações de um publicador
 * Body: { designacoes: string[] } - array de IDs das designações qualificadas
 */
router.put('/publicador/:publicadorId', authorize('publicadores', 'update'), async (req: Request, res: Response) => {
  try {
    const { publicadorId } = req.params
    const { designacoes } = req.body
    
    if (!Array.isArray(designacoes)) {
      return res.status(400).json({ error: 'designacoes deve ser um array' })
    }

    const db = await getDb()

    // Buscar publicador
    let publicador: any = null
    let query: any = {}
    if (ObjectId.isValid(publicadorId)) {
      publicador = await db.collection('publicadores').findOne({ _id: new ObjectId(publicadorId) })
      if (publicador) query = { _id: new ObjectId(publicadorId) }
    }
    if (!publicador) {
      publicador = await db.collection('publicadores').findOne({ id: publicadorId })
      if (publicador) query = { id: publicadorId }
    }

    if (!publicador) {
      return res.status(404).json({ error: 'Publicador não encontrado' })
    }

    // Atualizar
    await db.collection('publicadores').updateOne(
      query,
      { 
        $set: { 
          designacoesQualificado: designacoes,
          updatedAt: new Date()
        } 
      }
    )

    await auditAction(req, 'update_qualificacoes', 'publicadores', publicadorId, { 
      total: designacoes.length 
    })

    res.json({ 
      message: 'Qualificações atualizadas com sucesso',
      designacoes 
    })
  } catch (error: any) {
    console.error('Error updating qualificacoes:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Toggle uma designação específica
 * Body: { designacao: string }
 */
router.post('/publicador/:publicadorId/toggle', authorize('publicadores', 'update'), async (req: Request, res: Response) => {
  try {
    const { publicadorId } = req.params
    const { designacao } = req.body
    
    if (!designacao) {
      return res.status(400).json({ error: 'designacao é obrigatório' })
    }

    const db = await getDb()

    // Buscar publicador
    let publicador: any = null
    let query: any = {}
    if (ObjectId.isValid(publicadorId)) {
      publicador = await db.collection('publicadores').findOne({ _id: new ObjectId(publicadorId) })
      if (publicador) query = { _id: new ObjectId(publicadorId) }
    }
    if (!publicador) {
      publicador = await db.collection('publicadores').findOne({ id: publicadorId })
      if (publicador) query = { id: publicadorId }
    }

    if (!publicador) {
      return res.status(404).json({ error: 'Publicador não encontrado' })
    }

    // Toggle
    const designacoesAtuais = publicador.designacoesQualificado || []
    const index = designacoesAtuais.indexOf(designacao)
    
    if (index >= 0) {
      designacoesAtuais.splice(index, 1)
    } else {
      designacoesAtuais.push(designacao)
    }

    // Atualizar
    await db.collection('publicadores').updateOne(
      query,
      { 
        $set: { 
          designacoesQualificado: designacoesAtuais,
          updatedAt: new Date()
        } 
      }
    )

    res.json({ 
      message: index >= 0 ? 'Designação removida' : 'Designação adicionada',
      qualificado: index < 0,
      designacoes: designacoesAtuais
    })
  } catch (error: any) {
    console.error('Error toggling designacao:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Listar publicadores qualificados para uma designação específica
 */
router.get('/qualificados/:designacaoId', authorize('publicadores', 'read'), async (req: Request, res: Response) => {
  try {
    const { designacaoId } = req.params
    const db = await getDb()

    const publicadores = await db.collection('publicadores')
      .find({ 
        status: 'ativo',
        designacoesQualificado: designacaoId 
      })
      .sort({ nome: 1 })
      .toArray()

    const info = TODAS_DESIGNACOES.find(d => d.id === designacaoId)

    res.json({
      designacao: info,
      qualificados: publicadores.map((p: any) => ({
        id: p.id,
        nome: p.nomeCompleto || p.nome,
        genero: p.genero,
        privilegioServico: p.privilegioServico
      }))
    })
  } catch (error: any) {
    console.error('Error listing qualificados:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
