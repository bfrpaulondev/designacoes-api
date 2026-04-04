import { Router, Request, Response } from 'express'
import { getDb } from '../db.js'
import { ObjectId } from 'mongodb'
import { authenticate, authorize, auditAction } from '../middleware/auth.js'

const router = Router()

// Aplicar autenticação em todas as rotas
router.use(authenticate)

// Listar todas as designações
router.get('/', authorize('designacoes', 'read'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    
    // Filtros opcionais
    const { categoria, publicadorId, dataInicio, dataFim, status, semanaId } = req.query
    
    const filtro: any = {}
    
    if (categoria) filtro.categoria = categoria
    if (publicadorId) filtro.publicadorId = publicadorId
    if (status) filtro.status = status
    if (semanaId) filtro.semanaId = semanaId
    
    if (dataInicio || dataFim) {
      filtro.data = {}
      if (dataInicio) filtro.data.$gte = dataInicio
      if (dataFim) filtro.data.$lte = dataFim
    }

    const designacoes = await db.collection('designacoes')
      .find(filtro)
      .sort({ data: 1, categoria: 1 })
      .toArray()

    res.json({ designacoes })
  } catch (error: any) {
    console.error('Error listing designacoes:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obter designações por semana
router.get('/semana/:semanaId', authorize('designacoes', 'read'), async (req: Request, res: Response) => {
  try {
    const { semanaId } = req.params
    const db = await getDb()
    
    const designacoes = await db.collection('designacoes')
      .find({ semanaId })
      .sort({ data: 1, categoria: 1 })
      .toArray()

    res.json({ designacoes })
  } catch (error: any) {
    console.error('Error getting designacoes by semana:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obter designações por publicador
router.get('/publicador/:publicadorId', authorize('designacoes', 'read'), async (req: Request, res: Response) => {
  try {
    const { publicadorId } = req.params
    const db = await getDb()
    
    const designacoes = await db.collection('designacoes')
      .find({ publicadorId })
      .sort({ data: -1 })
      .toArray()

    res.json({ designacoes })
  } catch (error: any) {
    console.error('Error getting designacoes by publicador:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obter uma designação por ID
router.get('/:id', authorize('designacoes', 'read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()
    
    let designacao
    if (ObjectId.isValid(id)) {
      designacao = await db.collection('designacoes').findOne({ _id: new ObjectId(id) })
    }
    if (!designacao) {
      designacao = await db.collection('designacoes').findOne({ id })
    }

    if (!designacao) {
      return res.status(404).json({ error: 'Designação não encontrada' })
    }

    res.json({ designacao })
  } catch (error: any) {
    console.error('Error getting designacao:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obter sugestões de designação para uma data/tipo
router.post('/sugestoes', authorize('designacoes', 'read'), async (req: Request, res: Response) => {
  try {
    const { data, tipo, categoria } = req.body
    
    if (!data || !tipo || !categoria) {
      return res.status(400).json({ error: 'Data, tipo e categoria são obrigatórios' })
    }

    const db = await getDb()
    
    // Buscar publicadores
    const publicadores = await db.collection('publicadores')
      .find({ status: 'ativo' })
      .toArray()
    
    // Buscar ausências
    const ausencias = await db.collection('ausencias').find({}).toArray()
    
    // Buscar histórico de designações
    const designacoesAnteriores = await db.collection('designacoes')
      .find({})
      .sort({ data: -1 })
      .toArray()
    
    // Filtrar publicadores ausentes
    const publicadoresAusentes = new Set<string>()
    
    for (const ausencia of ausencias) {
      let estaAusente = false
      
      switch (ausencia.tipo) {
        case 'periodo':
          if (ausencia.dataInicio && ausencia.dataFim) {
            const dataCheck = new Date(data + 'T12:00:00').getTime()
            const inicio = new Date(ausencia.dataInicio + 'T12:00:00').getTime()
            const fim = new Date(ausencia.dataFim + 'T12:00:00').getTime()
            estaAusente = dataCheck >= inicio && dataCheck <= fim
          }
          break
          
        case 'dias_especificos':
          estaAusente = ausencia.diasEspecificos?.includes(data)
          break
          
        case 'recorrente':
          if (ausencia.diasSemana?.length) {
            const dias: string[] = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
            const dataObj = new Date(data + 'T12:00:00')
            const diaSemana = dias[dataObj.getDay()]
            
            if (ausencia.diasSemana.includes(diaSemana)) {
              const dataCheck = new Date(data + 'T12:00:00').getTime()
              const dentroInicio = !ausencia.recorrenciaInicio || 
                dataCheck >= new Date(ausencia.recorrenciaInicio + 'T12:00:00').getTime()
              const dentroFim = !ausencia.recorrenciaFim || 
                dataCheck <= new Date(ausencia.recorrenciaFim + 'T12:00:00').getTime()
              estaAusente = dentroInicio && dentroFim
            }
          }
          break
      }
      
      // Verificar se o tipo de designação está afetado
      if (estaAusente) {
        if (ausencia.tiposDesignacao?.includes('todas')) {
          publicadoresAusentes.add(ausencia.publicadorId)
        } else {
          // Mapear tipo para categorias
          const tipoMapeado = mapearTipoDesignacao(tipo, categoria)
          if (ausencia.tiposDesignacao?.some((t: string) => tipoMapeado.includes(t))) {
            publicadoresAusentes.add(ausencia.publicadorId)
          }
        }
      }
    }
    
    // Calcular score para cada publicador
    const sugestoes = publicadores
      .filter((p: any) => !publicadoresAusentes.has(p.id))
      .map((publicador: any) => {
        // Verificar privilégios necessários
        const requerAnciao = ['presidente', 'oracao_inicial', 'oracao_final', 'tesouros', 
          'perolas_espirituais', 'estudo_biblico', 'orador_servico', 'dirigente_sentinela', 'orador'].includes(tipo)
        const requerServo = ['presidente_auxiliar', 'leitor_ebc'].includes(tipo)
        
        // Verificar elegibilidade
        let elegivel = true
        let motivoInelegivel = ''
        
        if (requerAnciao && publicador.privilegioServico !== 'anciao') {
          elegivel = false
          motivoInelegivel = 'Requer ancião'
        } else if (requerServo && !['anciao', 'servo_ministerial'].includes(publicador.privilegioServico)) {
          elegivel = false
          motivoInelegivel = 'Requer servo ministerial ou ancião'
        }
        
        // Calcular estatísticas
        const designacoesDoPublicador = designacoesAnteriores.filter((d: any) => d.publicadorId === publicador.id)
        const ultimaDesignacao = designacoesDoPublicador[0]?.data
        const totalDesignacoes = designacoesDoPublicador.length
        
        // Calcular dias sem designar
        let diasSemDesignar = 999
        if (ultimaDesignacao) {
          const ultima = new Date(ultimaDesignacao + 'T12:00:00')
          const hoje = new Date(data + 'T12:00:00')
          diasSemDesignar = Math.floor((hoje.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24))
        }
        
        // Calcular score (quanto maior, mais prioritário)
        let score = 0
        
        // Pontos por tempo sem designar (max 40 pontos)
        score += Math.min(diasSemDesignar * 1.5, 40)
        
        // Pontos por privilégio (anciãos e servos têm prioridade para certas designações)
        if (publicador.privilegioServico === 'anciao') score += 10
        if (publicador.privilegioServico === 'servo_ministerial') score += 5
        
        // Pontos por tipo de publicador (pioneiros têm prioridade)
        if (publicador.tipoPublicador?.includes('pioneiro')) score += 15
        
        // Penalizar por designações recentes
        if (totalDesignacoes > 0) {
          const ultimasSemanas = designacoesDoPublicador.filter((d: any) => {
            const diff = Math.floor((new Date(data).getTime() - new Date(d.data).getTime()) / (1000 * 60 * 60 * 24))
            return diff < 30
          }).length
          score -= ultimasSemanas * 5
        }
        
        return {
          publicadorId: publicador.id,
          publicadorNome: publicador.nome || publicador.nomeCompleto,
          privilegio: publicador.privilegioServico,
          tipoPublicador: publicador.tipoPublicador,
          grupoCampo: publicador.grupoCampo,
          score: Math.max(0, Math.round(score)),
          diasSemDesignar,
          ultimaDesignacao,
          totalDesignacoes,
          disponivel: elegivel,
          motivoIndisponibilidade: motivoInelegivel || undefined,
          prioridade: score >= 50 ? 'alta' : score >= 25 ? 'media' : 'baixa'
        }
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 10) // Top 10 sugestões

    res.json({ sugestoes })
  } catch (error: any) {
    console.error('Error getting sugestoes:', error)
    res.status(500).json({ error: error.message })
  }
})

// Função auxiliar para mapear tipo de designação
function mapearTipoDesignacao(tipo: string, categoria: string): string[] {
  const tipos: string[] = []
  
  // Por categoria
  if (categoria === 'meio_semana') tipos.push('reuniao_meio_semana')
  if (categoria === 'fim_semana') tipos.push('reuniao_fim_semana')
  if (categoria === 'testemunho_publico') tipos.push('testemunho_publico')
  
  // Por tipo específico
  if (['presidente', 'presidente_auxiliar'].includes(tipo)) tipos.push('presidente')
  if (['oracao_inicial', 'oracao_final'].includes(tipo)) tipos.push('oracao')
  if (['leitor', 'leitor_ebc', 'leitor_sentinela', 'leitura_biblia'].includes(tipo)) tipos.push('leitor')
  if (['microfone_1', 'microfone_2', 'microfone_3'].includes(tipo)) tipos.push('microfone')
  if (['indicador_1', 'indicador_2'].includes(tipo)) tipos.push('indicador')
  if (['som', 'video'].includes(tipo)) tipos.push('som')
  if (tipo === 'plataforma') tipos.push('plataforma')
  if (tipo.includes('limpeza')) tipos.push('limpeza')
  
  return tipos
}

// Criar múltiplas designações (batch)
router.post('/batch', authorize('designacoes', 'create'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const { designacoes } = req.body

    if (!designacoes || !Array.isArray(designacoes) || designacoes.length === 0) {
      return res.status(400).json({ error: 'Lista de designações é obrigatória' })
    }

    const insertedDesignacoes = []

    for (const data of designacoes) {
      // Buscar nome do publicador
      const publicador = await db.collection('publicadores').findOne({ id: data.publicadorId })
      const publicadorNome = publicador?.nome || publicador?.nomeCompleto || data.publicadorNome || ''

      const designacao = {
        id: data.id || new ObjectId().toString(),
        publicadorId: data.publicadorId,
        publicadorNome,
        tipo: data.tipo,
        categoria: data.categoria,
        data: data.data,
        semanaId: data.semanaId || null,
        status: data.status || 'pendente',
        confirmadoEm: null,
        confirmadoPor: null,
        observacoes: data.observacoes || '',
        
        // Campos específicos
        sala: data.sala || null,
        ajudanteId: data.ajudanteId || null,
        ajudanteNome: data.ajudanteNome || null,
        discursoTema: data.discursoTema || null,
        discursoNumero: data.discursoNumero || null,
        oradorCongregacao: data.oradorCongregacao || null,
        etiqueta: data.etiqueta || null,
        grupoId: data.grupoId || null,
        grupoNome: data.grupoNome || null,
        horaInicio: data.horaInicio || null,
        horaFim: data.horaFim || null,
        local: data.local || null,
        companheiroId: data.companheiroId || null,
        companheiroNome: data.companheiroNome || null,
        
        criadoEm: new Date(),
        atualizadoEm: new Date()
      }

      // Verificar se já existe designação para este tipo/data
      const existente = await db.collection('designacoes').findOne({
        tipo: designacao.tipo,
        data: designacao.data
      })

      if (!existente) {
        await db.collection('designacoes').insertOne(designacao)
        insertedDesignacoes.push(designacao)
      }
    }

    res.status(201).json({ 
      message: `${insertedDesignacoes.length} designações criadas`,
      designacoes: insertedDesignacoes 
    })
  } catch (error: any) {
    console.error('Error creating designacoes batch:', error)
    res.status(500).json({ error: error.message })
  }
})

// Criar nova designação
router.post('/', authorize('designacoes', 'create'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const data = req.body

    // Validações básicas
    if (!data.publicadorId) {
      return res.status(400).json({ error: 'ID do publicador é obrigatório' })
    }
    if (!data.tipo) {
      return res.status(400).json({ error: 'Tipo de designação é obrigatório' })
    }
    if (!data.categoria) {
      return res.status(400).json({ error: 'Categoria é obrigatória' })
    }
    if (!data.data) {
      return res.status(400).json({ error: 'Data é obrigatória' })
    }

    // Buscar nome do publicador
    const publicador = await db.collection('publicadores').findOne({ id: data.publicadorId })
    const publicadorNome = publicador?.nome || publicador?.nomeCompleto || data.publicadorNome || ''

    const designacao = {
      id: new ObjectId().toString(),
      publicadorId: data.publicadorId,
      publicadorNome,
      tipo: data.tipo,
      categoria: data.categoria,
      data: data.data,
      semanaId: data.semanaId || null,
      status: data.status || 'pendente',
      confirmadoEm: null,
      confirmadoPor: null,
      observacoes: data.observacoes || '',
      
      // Campos específicos
      sala: data.sala || null,
      ajudanteId: data.ajudanteId || null,
      ajudanteNome: data.ajudanteNome || null,
      discursoTema: data.discursoTema || null,
      discursoNumero: data.discursoNumero || null,
      oradorCongregacao: data.oradorCongregacao || null,
      etiqueta: data.etiqueta || null,
      grupoId: data.grupoId || null,
      grupoNome: data.grupoNome || null,
      horaInicio: data.horaInicio || null,
      horaFim: data.horaFim || null,
      local: data.local || null,
      companheiroId: data.companheiroId || null,
      companheiroNome: data.companheiroNome || null,
      
      criadoEm: new Date(),
      atualizadoEm: new Date()
    }

    const result = await db.collection('designacoes').insertOne(designacao)
    
    await auditAction(req, 'create', 'designacoes', designacao.id, { 
      tipo: data.tipo, 
      publicador: publicadorNome 
    })
    
    res.status(201).json({ 
      designacao: { ...designacao, _id: result.insertedId } 
    })
  } catch (error: any) {
    console.error('Error creating designacao:', error)
    res.status(500).json({ error: error.message })
  }
})

// Atualizar designação
router.put('/:id', authorize('designacoes', 'update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()
    const data = req.body

    // Remover campos imutáveis que não devem ser atualizados
    const { _id, id: bodyId, criadoEm, ...safeData } = data

    const updateData: any = {
      ...safeData,
      atualizadoEm: new Date()
    }

    // Se atualizou o publicador, buscar o nome
    if (safeData.publicadorId) {
      const publicador = await db.collection('publicadores').findOne({ id: safeData.publicadorId })
      if (publicador) {
        updateData.publicadorNome = publicador.nome || publicador.nomeCompleto
      }
    }

    // Se confirmou, registrar data
    if (safeData.status === 'confirmado' && !safeData.confirmadoEm) {
      updateData.confirmadoEm = new Date()
    }

    const result = await db.collection('designacoes').updateOne(
      { id },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Designação não encontrada' })
    }

    const updated = await db.collection('designacoes').findOne({ id })
    res.json({ designacao: updated })
  } catch (error: any) {
    console.error('Error updating designacao:', error)
    res.status(500).json({ error: error.message })
  }
})

// Confirmar designação
router.post('/:id/confirmar', authorize('designacoes', 'update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()

    const result = await db.collection('designacoes').updateOne(
      { id },
      { 
        $set: { 
          status: 'confirmado',
          confirmadoEm: new Date(),
          atualizadoEm: new Date()
        } 
      }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Designação não encontrada' })
    }

    const updated = await db.collection('designacoes').findOne({ id })
    res.json({ designacao: updated })
  } catch (error: any) {
    console.error('Error confirming designacao:', error)
    res.status(500).json({ error: error.message })
  }
})

// Substituir designação
router.post('/:id/substituir', authorize('designacoes', 'update'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { novoPublicadorId, motivo } = req.body
    const db = await getDb()

    if (!novoPublicadorId) {
      return res.status(400).json({ error: 'ID do novo publicador é obrigatório' })
    }

    // Buscar designação original
    const original = await db.collection('designacoes').findOne({ id })
    if (!original) {
      return res.status(404).json({ error: 'Designação não encontrada' })
    }

    // Buscar nome do novo publicador
    const publicador = await db.collection('publicadores').findOne({ id: novoPublicadorId })
    if (!publicador) {
      return res.status(404).json({ error: 'Publicador não encontrado' })
    }

    // Atualizar designação original para "substituido"
    await db.collection('designacoes').updateOne(
      { id },
      { 
        $set: { 
          status: 'substituido',
          observacoes: (original.observacoes || '') + ` [Substituído: ${motivo || 'Sem motivo especificado'}]`,
          atualizadoEm: new Date()
        } 
      }
    )

    // Criar nova designação
    const novaDesignacao = {
      ...original,
      id: new ObjectId().toString(),
      _id: undefined,
      publicadorId: novoPublicadorId,
      publicadorNome: publicador.nome || publicador.nomeCompleto,
      status: 'agendado',
      observacoes: `Substituição de ${original.publicadorNome}. ${motivo || ''}`,
      criadoEm: new Date(),
      atualizadoEm: new Date()
    }

    const result = await db.collection('designacoes').insertOne(novaDesignacao)
    
    res.json({ 
      designacaoOriginal: await db.collection('designacoes').findOne({ id }),
      novaDesignacao: { ...novaDesignacao, _id: result.insertedId }
    })
  } catch (error: any) {
    console.error('Error substituting designacao:', error)
    res.status(500).json({ error: error.message })
  }
})

// Excluir designação
router.delete('/:id', authorize('designacoes', 'delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()

    const designacao = await db.collection('designacoes').findOne({ id })
    
    const result = await db.collection('designacoes').deleteOne({ id })
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Designação não encontrada' })
    }
    
    await auditAction(req, 'delete', 'designacoes', id, { 
      tipo: designacao?.tipo, 
      publicador: designacao?.publicadorNome 
    })
    
    res.json({ message: 'Designação excluída com sucesso' })
  } catch (error: any) {
    console.error('Error deleting designacao:', error)
    res.status(500).json({ error: error.message })
  }
})

// Estatísticas de designações
router.get('/estatisticas/resumo', authorize('designacoes', 'read'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    
    const total = await db.collection('designacoes').countDocuments()
    const pendentes = await db.collection('designacoes').countDocuments({ status: 'pendente' })
    const confirmados = await db.collection('designacoes').countDocuments({ status: 'confirmado' })
    const realizados = await db.collection('designacoes').countDocuments({ status: 'realizado' })
    
    // Designações por categoria
    const porCategoria = await db.collection('designacoes').aggregate([
      { $group: { _id: '$categoria', total: { $sum: 1 } } }
    ]).toArray()
    
    // Designações por status
    const porStatus = await db.collection('designacoes').aggregate([
      { $group: { _id: '$status', total: { $sum: 1 } } }
    ]).toArray()
    
    res.json({
      total,
      pendentes,
      confirmados,
      realizados,
      porCategoria: porCategoria.reduce((acc: any, item: any) => {
        acc[item._id || 'sem_categoria'] = item.total
        return acc
      }, {}),
      porStatus: porStatus.reduce((acc: any, item: any) => {
        acc[item._id || 'sem_status'] = item.total
        return acc
      }, {})
    })
  } catch (error: any) {
    console.error('Error getting statistics:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
