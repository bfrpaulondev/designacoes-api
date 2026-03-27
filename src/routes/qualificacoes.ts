import { Router, Request, Response } from 'express'
import { getDb } from '../db.js'
import { ObjectId } from 'mongodb'
import { authenticate, authorize, auditAction } from '../middleware/auth.js'
import { 
  TipoQualificacao, 
  NivelProficiencia, 
  StatusQualificacao, 
  QualificacaoPublicador,
  CategoriaQualificacao,
  Publicador
} from '../types.js'

const router = Router()

// Aplicar autenticação em todas as rotas
router.use(authenticate)

// ============================================
// CATEGORIAS DE QUALIFICAÇÕES
// ============================================

/**
 * Definição das categorias de qualificações
 */
const CATEGORIAS_QUALIFICACAO: CategoriaQualificacao[] = [
  {
    id: 'fim_semana',
    nome: 'Reunião Fim de Semana',
    descricao: 'Designações para a reunião do fim de semana',
    icone: 'event',
    tipos: [
      'presidente_fim_semana',
      'oracao',
      'dirigente_sentinela',
      'leitor_sentinela',
      'orador',
      'interprete',
      'hospitalidade'
    ],
    ordem: 1
  },
  {
    id: 'meio_semana',
    nome: 'Reunião Meio de Semana',
    descricao: 'Designações para a reunião do meio de semana',
    icone: 'school',
    tipos: [
      'presidente_meio_semana',
      'presidente_auxiliar',
      'tesouros',
      'perolas_espirituais',
      'leitura_biblia',
      'ministerio_iniciar',
      'ministerio_cultivar',
      'ministerio_discipulos',
      'estudo_biblico',
      'leitor_ebc',
      'orador_servico'
    ],
    ordem: 2
  },
  {
    id: 'av_indicadores',
    nome: 'AV e Indicadores',
    descricao: 'Áudio, vídeo e indicadores',
    icone: 'settings',
    tipos: [
      'operador_som',
      'operador_video',
      'microfonista',
      'indicador',
      'plataforma',
      'zoom_host'
    ],
    ordem: 3
  },
  {
    id: 'limpeza',
    nome: 'Limpeza',
    descricao: 'Equipes de limpeza do Salão',
    icone: 'cleaning_services',
    tipos: [
      'coordenador_limpeza',
      'membro_limpeza'
    ],
    ordem: 4
  },
  {
    id: 'testemunho_publico',
    nome: 'Testemunho Público',
    descricao: 'Participação em testemunho público',
    icone: 'campaign',
    tipos: [
      'testemunho_publico',
      'dirigente_grupo_campo'
    ],
    ordem: 5
  }
]

/**
 * Informações detalhadas de cada tipo de qualificação
 */
const INFO_TIPOS_QUALIFICACAO: Record<TipoQualificacao, { nome: string; descricao: string; requisitos: string[] }> = {
  // Fim de Semana
  presidente_fim_semana: {
    nome: 'Presidente (Fim de Semana)',
    descricao: 'Dirige a reunião do fim de semana',
    requisitos: ['Ancião ou servo ministerial', 'Bom conhecimento do programa', 'Boa leitura e dicção']
  },
  oracao: {
    nome: 'Oração',
    descricao: 'Faz orações nas reuniões',
    requisitos: ['Publicador batizado', 'Homem', 'Boa capacidade de expressão']
  },
  dirigente_sentinela: {
    nome: 'Dirigente da Sentinela',
    descricao: 'Dirige o estudo da Sentinela',
    requisitos: ['Ancião ou servo ministerial', 'Preparação adequada', 'Capacidade de ensino']
  },
  leitor_sentinela: {
    nome: 'Leitor da Sentinela',
    descricao: 'Lê os parágrafos do estudo da Sentinela',
    requisitos: ['Boa leitura e dicção', 'Preparação prévia']
  },
  orador: {
    nome: 'Orador',
    descricao: 'Apresenta discursos bíblicos',
    requisitos: ['Ancião ou servo ministerial', 'Aprovado pelo corpo de anciãos', 'Treinamento específico']
  },
  interprete: {
    nome: 'Intérprete',
    descricao: 'Faz interpretação/tradução durante as reuniões',
    requisitos: ['Fluência nos idiomas necessários', 'Aprovação do corpo de anciãos']
  },
  hospitalidade: {
    nome: 'Hospitalidade',
    descricao: 'Recepciona e acolhe os presentes',
    requisitos: ['Espírito hospitaleiro', 'Disponibilidade antes e depois da reunião']
  },
  
  // Meio de Semana
  presidente_meio_semana: {
    nome: 'Presidente (Meio de Semana)',
    descricao: 'Dirige a reunião do meio de semana',
    requisitos: ['Ancião ou servo ministerial', 'Bom conhecimento do programa', 'Boa dicção']
  },
  presidente_auxiliar: {
    nome: 'Presidente Auxiliar',
    descricao: 'Auxilia o presidente em uma das salas',
    requisitos: ['Publicador batizado', 'Homem', 'Conhecimento do programa']
  },
  tesouros: {
    nome: 'Tesouros da Palavra de Deus',
    descricao: 'Apresenta a parte "Tesouros"',
    requisitos: ['Ancião ou servo ministerial', 'Bom conhecimento bíblico', 'Capacidade de ensino']
  },
  perolas_espirituais: {
    nome: 'Pérolas Espirituais',
    descricao: 'Apresenta as "Pérolas Espirituais"',
    requisitos: ['Ancião ou servo ministerial', 'Boa leitura', 'Preparação adequada']
  },
  leitura_biblia: {
    nome: 'Leitura da Bíblia',
    descricao: 'Lê o texto bíblico designado',
    requisitos: ['Boa leitura e dicção', 'Preparação prévia']
  },
  ministerio_iniciar: {
    nome: 'Ministério - Iniciar',
    descricao: 'Demonstra como iniciar conversas no ministério',
    requisitos: ['Experiência no ministério', 'Bom exemplo', 'Preparação adequada']
  },
  ministerio_cultivar: {
    nome: 'Ministério - Cultivar',
    descricao: 'Demonstra como cultivar interesse',
    requisitos: ['Experiência no ministério', 'Bom exemplo', 'Preparação adequada']
  },
  ministerio_discipulos: {
    nome: 'Ministério - Discípulos',
    descricao: 'Demonstra como fazer discípulos',
    requisitos: ['Experiência no ministério', 'Bom exemplo', 'Preparação adequada']
  },
  estudo_biblico: {
    nome: 'Estudo Bíblico da Congregação',
    descricao: 'Dirige o Estudo Bíblico da Congregação',
    requisitos: ['Ancião', 'Capacidade de ensino', 'Preparação cuidadosa']
  },
  leitor_ebc: {
    nome: 'Leitor do EBC',
    descricao: 'Lê os parágrafos do Estudo Bíblico da Congregação',
    requisitos: ['Boa leitura e dicção', 'Preparação prévia']
  },
  orador_servico: {
    nome: 'Orador de Serviço',
    descricao: 'Faz o discurso de serviço',
    requisitos: ['Ancião ou servo ministerial', 'Designado pelo corpo de anciãos']
  },
  
  // AV e Indicadores
  operador_som: {
    nome: 'Operador de Som',
    descricao: 'Opera a mesa de som durante as reuniões',
    requisitos: ['Treinamento técnico', 'Pontualidade', 'Atenção constante']
  },
  operador_video: {
    nome: 'Operador de Vídeo',
    descricao: 'Opera o sistema de vídeo/projeção',
    requisitos: ['Treinamento técnico', 'Pontualidade', 'Conhecimento dos vídeos']
  },
  microfonista: {
    nome: 'Microfonista',
    descricao: 'Manuseia os microfones durante as reuniões',
    requisitos: ['Atenção durante a reunião', 'Discrição', 'Pontualidade']
  },
  indicador: {
    nome: 'Indicador',
    descricao: 'Indica as partes no palco durante as reuniões',
    requisitos: ['Memorização dos indicadores', 'Pontualidade', 'Atenção']
  },
  plataforma: {
    nome: 'Plataforma/Palco',
    descricao: 'Ajuda com os itens do palco',
    requisitos: ['Disponibilidade', 'Discrição', 'Pontualidade']
  },
  zoom_host: {
    nome: 'Host do Zoom',
    descricao: 'Gerencia a transmissão via Zoom',
    requisitos: ['Conhecimento da plataforma Zoom', 'Pontualidade', 'Atenção constante']
  },
  
  // Limpeza
  coordenador_limpeza: {
    nome: 'Coordenador de Limpeza',
    descricao: 'Coordena a equipe de limpeza',
    requisitos: ['Organização', 'Liderança', 'Compromisso']
  },
  membro_limpeza: {
    nome: 'Membro da Equipe de Limpeza',
    descricao: 'Participa da limpeza do Salão',
    requisitos: ['Disponibilidade', 'Compromisso']
  },
  
  // Testemunho Público
  testemunho_publico: {
    nome: 'Testemunho Público',
    descricao: 'Participa de testemunho público',
    requisitos: ['Publicador batizado ou não batizado']
  },
  dirigente_grupo_campo: {
    nome: 'Dirigente de Grupo de Campo',
    descricao: 'Lidera grupos de testemunho público',
    requisitos: ['Ancião, servo ministerial ou pioneiro', 'Experiência no ministério', 'Liderança']
  }
}

/**
 * Listar todas as categorias com seus tipos de qualificação
 */
router.get('/categorias', authorize('publicadores', 'read'), async (req: Request, res: Response) => {
  try {
    const categoriasComInfo = CATEGORIAS_QUALIFICACAO.map(cat => ({
      ...cat,
      tipos: cat.tipos.map(tipo => ({
        tipo,
        ...INFO_TIPOS_QUALIFICACAO[tipo]
      }))
    }))

    res.json({ categorias: categoriasComInfo })
  } catch (error: any) {
    console.error('Error listing qualification categories:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Obter informações de um tipo específico de qualificação
 */
router.get('/tipos/:tipo', authorize('publicadores', 'read'), async (req: Request, res: Response) => {
  try {
    const { tipo } = req.params
    
    if (!INFO_TIPOS_QUALIFICACAO[tipo as TipoQualificacao]) {
      return res.status(404).json({ error: 'Tipo de qualificação não encontrado' })
    }

    // Encontrar a categoria
    const categoria = CATEGORIAS_QUALIFICACAO.find(cat => cat.tipos.includes(tipo as TipoQualificacao))

    res.json({ 
      tipo,
      ...INFO_TIPOS_QUALIFICACAO[tipo as TipoQualificacao],
      categoria
    })
  } catch (error: any) {
    console.error('Error getting qualification type:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// QUALIFICAÇÕES DOS PUBLICADORES
// ============================================

/**
 * Listar publicadores qualificados para um tipo de designação
 */
router.get('/qualificados/:tipo', authorize('publicadores', 'read'), async (req: Request, res: Response) => {
  try {
    const { tipo } = req.params
    const { nivel, status, incluirAprendizes } = req.query
    const db = await getDb()

    // Verificar se o tipo é válido
    if (!INFO_TIPOS_QUALIFICACAO[tipo as TipoQualificacao]) {
      return res.status(400).json({ error: 'Tipo de qualificação inválido' })
    }

    // Construir query
    const query: any = {
      status: 'ativo'
    }

    // Filtro por qualificação
    const qualificacaoQuery: any = {
      'qualificacoes.tipo': tipo
    }

    if (status) {
      qualificacaoQuery['qualificacoes.status'] = status
    } else {
      // Por padrão, buscar apenas ativos (ou aprendizes se solicitado)
      if (incluirAprendizes === 'true') {
        qualificacaoQuery['qualificacoes.status'] = { $in: ['ativo', 'em_treinamento'] }
      } else {
        qualificacaoQuery['qualificacoes.status'] = 'ativo'
      }
    }

    if (nivel) {
      qualificacaoQuery['qualificacoes.nivel'] = nivel
    }

    // Buscar publicadores
    const publicadores = await db.collection('publicadores')
      .find({
        ...query,
        ...qualificacaoQuery
      })
      .sort({ nome: 1 })
      .toArray()

    // Filtrar e mapear qualificações
    const qualificados = publicadores.map(pub => {
      const qualificacao = pub.qualificacoes?.find((q: any) => q.tipo === tipo)
      return {
        id: pub.id,
        nome: pub.nomeCompleto,
        genero: pub.genero,
        privilegioServico: pub.privilegioServico,
        qualificacao
      }
    })

    res.json({ 
      tipo,
      info: INFO_TIPOS_QUALIFICACAO[tipo as TipoQualificacao],
      total: qualificados.length,
      qualificados 
    })
  } catch (error: any) {
    console.error('Error listing qualified publishers:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Obter todas as qualificações de um publicador
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

    // Agrupar qualificações por categoria
    const qualificacoesPorCategoria = CATEGORIAS_QUALIFICACAO.map(cat => {
      const qualificacoesDaCategoria = cat.tipos.map(tipo => {
        const qual = publicador.qualificacoes?.find((q: any) => q.tipo === tipo)
        return {
          tipo,
          ...INFO_TIPOS_QUALIFICACAO[tipo],
          qualificacao: qual || null,
          temQualificacao: !!qual
        }
      })

      return {
        categoria: cat,
        qualificacoes: qualificacoesDaCategoria
      }
    })

    res.json({ 
      publicador: {
        id: publicador.id,
        nome: publicador.nomeCompleto,
        genero: publicador.genero,
        privilegioServico: publicador.privilegioServico
      },
      qualificacoesPorCategoria,
      qualificacoes: publicador.qualificacoes || []
    })
  } catch (error: any) {
    console.error('Error getting publisher qualifications:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Adicionar qualificação a um publicador
 */
router.post('/publicador/:publicadorId', authorize('publicadores', 'update'), async (req: Request, res: Response) => {
  try {
    const { publicadorId } = req.params
    const { tipo, nivel, status, observacoes } = req.body
    const db = await getDb()

    // Validações
    if (!tipo || !nivel || !status) {
      return res.status(400).json({ error: 'Tipo, nível e status são obrigatórios' })
    }

    if (!INFO_TIPOS_QUALIFICACAO[tipo as TipoQualificacao]) {
      return res.status(400).json({ error: 'Tipo de qualificação inválido' })
    }

    // Buscar publicador
    let publicador = null
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

    // Criar nova qualificação
    const novaQualificacao: QualificacaoPublicador = {
      tipo: tipo as TipoQualificacao,
      nivel: nivel as NivelProficiencia,
      status: status as StatusQualificacao,
      dataInicio: new Date(),
      observacoes,
      totalDesignacoes: 0
    }

    // Verificar se já tem essa qualificação
    const qualificacoes = publicador.qualificacoes || []
    const indexExistente = qualificacoes.findIndex((q: any) => q.tipo === tipo)

    if (indexExistente >= 0) {
      // Atualizar existente
      qualificacoes[indexExistente] = {
        ...qualificacoes[indexExistente],
        ...novaQualificacao
      }
    } else {
      // Adicionar nova
      qualificacoes.push(novaQualificacao)
    }

    // Salvar
    await db.collection('publicadores').updateOne(
      query,
      { 
        $set: { 
          qualificacoes,
          updatedAt: new Date()
        } 
      }
    )

    await auditAction(req, 'add_qualification', 'publicadores', publicadorId, { 
      tipo, 
      nivel,
      status
    })

    res.json({ 
      message: 'Qualificação adicionada com sucesso',
      qualificacao: novaQualificacao
    })
  } catch (error: any) {
    console.error('Error adding qualification:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Atualizar qualificação de um publicador
 */
router.patch('/publicador/:publicadorId/:tipo', authorize('publicadores', 'update'), async (req: Request, res: Response) => {
  try {
    const { publicadorId, tipo } = req.params
    const { nivel, status, observacoes } = req.body
    const db = await getDb()

    // Buscar publicador
    let publicador = null
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

    // Encontrar e atualizar qualificação
    const qualificacoes = publicador.qualificacoes || []
    const index = qualificacoes.findIndex((q: any) => q.tipo === tipo)

    if (index < 0) {
      return res.status(404).json({ error: 'Qualificação não encontrada para este publicador' })
    }

    // Atualizar campos
    if (nivel) qualificacoes[index].nivel = nivel
    if (status) qualificacoes[index].status = status
    if (observacoes !== undefined) qualificacoes[index].observacoes = observacoes

    // Salvar
    await db.collection('publicadores').updateOne(
      query,
      { 
        $set: { 
          qualificacoes,
          updatedAt: new Date()
        } 
      }
    )

    await auditAction(req, 'update_qualification', 'publicadores', publicadorId, { 
      tipo, 
      nivel,
      status
    })

    res.json({ 
      message: 'Qualificação atualizada com sucesso',
      qualificacao: qualificacoes[index]
    })
  } catch (error: any) {
    console.error('Error updating qualification:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Remover qualificação de um publicador
 */
router.delete('/publicador/:publicadorId/:tipo', authorize('publicadores', 'update'), async (req: Request, res: Response) => {
  try {
    const { publicadorId, tipo } = req.params
    const db = await getDb()

    // Buscar publicador
    let publicador = null
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

    // Filtrar qualificação
    const qualificacoes = publicador.qualificacoes?.filter((q: any) => q.tipo !== tipo) || []

    // Salvar
    await db.collection('publicadores').updateOne(
      query,
      { 
        $set: { 
          qualificacoes,
          updatedAt: new Date()
        } 
      }
    )

    await auditAction(req, 'remove_qualification', 'publicadores', publicadorId, { tipo })

    res.json({ message: 'Qualificação removida com sucesso' })
  } catch (error: any) {
    console.error('Error removing qualification:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// MATRIZ DE QUALIFICAÇÕES
// ============================================

/**
 * Obter matriz completa de qualificações (todos publicadores x todas qualificações)
 */
router.get('/matriz', authorize('publicadores', 'read'), async (req: Request, res: Response) => {
  try {
    const { categoria: categoriaFiltro, status } = req.query
    const db = await getDb()

    // Buscar todos os publicadores ativos
    const query: any = {}
    if (status) query.status = status
    else query.status = 'ativo'

    const publicadores = await db.collection('publicadores')
      .find(query)
      .sort({ nome: 1 })
      .toArray()

    // Filtrar categorias
    const categorias = categoriaFiltro 
      ? CATEGORIAS_QUALIFICACAO.filter(c => c.id === categoriaFiltro)
      : CATEGORIAS_QUALIFICACAO

    // Construir matriz
    const matriz = publicadores.map(pub => {
      const linha: any = {
        id: pub.id,
        nome: pub.nomeCompleto,
        genero: pub.genero,
        privilegioServico: pub.privilegioServico,
        qualificacoes: {}
      }

      categorias.forEach(cat => {
        cat.tipos.forEach(tipo => {
          const qual = pub.qualificacoes?.find((q: any) => q.tipo === tipo)
          linha.qualificacoes[tipo] = qual ? {
            nivel: qual.nivel,
            status: qual.status,
            ultimaDesignacao: qual.ultimaDesignacao
          } : null
        })
      })

      return linha
    })

    // Contagem por tipo
    const contagem: Record<string, { total: number; ativos: number; aprendizes: number }> = {}
    categorias.forEach(cat => {
      cat.tipos.forEach(tipo => {
        contagem[tipo] = { total: 0, ativos: 0, aprendizes: 0 }
      })
    })

    publicadores.forEach(pub => {
      pub.qualificacoes?.forEach((qual: any) => {
        if (contagem[qual.tipo]) {
          contagem[qual.tipo].total++
          if (qual.status === 'ativo') contagem[qual.tipo].ativos++
          if (qual.status === 'em_treinamento') contagem[qual.tipo].aprendizes++
        }
      })
    })

    res.json({ 
      categorias,
      publicadores: matriz,
      contagem,
      totalPublicadores: publicadores.length
    })
  } catch (error: any) {
    console.error('Error getting qualification matrix:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Obter resumo de qualificações por categoria
 */
router.get('/resumo', authorize('publicadores', 'read'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()

    const publicadores = await db.collection('publicadores')
      .find({ status: 'ativo' })
      .toArray()

    const resumo = CATEGORIAS_QUALIFICACAO.map(cat => {
      const tiposResumo = cat.tipos.map(tipo => {
        const qualificados = publicadores.filter(p => 
          p.qualificacoes?.some((q: any) => q.tipo === tipo && q.status === 'ativo')
        )
        const aprendizes = publicadores.filter(p => 
          p.qualificacoes?.some((q: any) => q.tipo === tipo && q.status === 'em_treinamento')
        )
        const inativos = publicadores.filter(p => 
          p.qualificacoes?.some((q: any) => q.tipo === tipo && q.status === 'inativo')
        )

        return {
          tipo,
          ...INFO_TIPOS_QUALIFICACAO[tipo],
          estatisticas: {
            qualificados: qualificados.length,
            aprendizes: aprendizes.length,
            inativos: inativos.length,
            total: qualificados.length + aprendizes.length
          }
        }
      })

      return {
        categoria: cat,
        tipos: tiposResumo
      }
    })

    res.json({ resumo })
  } catch (error: any) {
    console.error('Error getting qualification summary:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
