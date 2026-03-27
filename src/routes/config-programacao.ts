import { Router, Request, Response } from 'express'
import { getDb } from '../db.js'
import { ObjectId } from 'mongodb'

const router = Router()

// ============================================
// CONFIGURAÇÕES PADRÃO COMPLETAS
// ============================================

const CONFIGURACOES_PADRAO = {
  id: 'default',
  nome: 'Configurações Padrão',
  versao: '3.0.0',
  
  // ============================================
  // TIPOS DE DESIGNAÇÃO - CONFIGURÁVEIS
  // ============================================
  
  tiposDesignacao: {
    fimSemana: [
      { id: 'presidente', label: 'Presidente', icon: '👤', requerAnciao: true, ordem: 1 },
      { id: 'oracao_inicial', label: 'Oração Inicial', icon: '🙏', requerAnciao: true, ordem: 2 },
      { id: 'dirigente_sentinela', label: 'Dirigente da Sentinela', icon: '📖', requerAnciao: true, ordem: 3 },
      { id: 'leitor_sentinela', label: 'Leitor da Sentinela', icon: '📚', requerAnciao: false, ordem: 4 },
      { id: 'interprete', label: 'Intérprete', icon: '🗣️', requerAnciao: false, ordem: 5 },
      { id: 'orador', label: 'Orador', icon: '🎤', requerAnciao: true, ordem: 6 },
      { id: 'hospitalidade', label: 'Hospitalidade', icon: '🏠', requerAnciao: false, ordem: 7 },
      { id: 'oracao_final', label: 'Oração Final', icon: '🙏', requerAnciao: true, ordem: 8 },
    ],
    meioSemana: [
      { id: 'presidente', label: 'Presidente', icon: '👤', requerAnciao: true, requerServo: false, ordem: 1 },
      { id: 'presidente_auxiliar', label: 'Conselheiro Auxiliar', icon: '👥', requerAnciao: true, requerServo: true, ordem: 2 },
      { id: 'oracao_inicial', label: 'Oração Inicial', icon: '🙏', requerAnciao: true, requerServo: false, ordem: 3 },
      { id: 'tesouros', label: 'Tesouros da Palavra de Deus', icon: '💎', requerAnciao: true, requerServo: true, ordem: 4 },
      { id: 'perolas_espirituais', label: 'Pérolas Espirituais', icon: '✨', requerAnciao: true, requerServo: true, ordem: 5 },
      { id: 'leitura_biblia', label: 'Leitura da Bíblia', icon: '📖', requerAnciao: false, requerServo: false, ordem: 6 },
      { id: 'ministerio_iniciar', label: 'Iniciar Conversas', icon: '💬', requerAnciao: false, requerServo: false, ordem: 7 },
      { id: 'ministerio_cultivar', label: 'Cultivar Interesse', icon: '🌱', requerAnciao: false, requerServo: false, ordem: 8 },
      { id: 'ministerio_discipulos', label: 'Fazer Discípulos', icon: '👨‍🏫', requerAnciao: false, requerServo: false, ordem: 9 },
      { id: 'estudo_biblico', label: 'Estudo Bíblico de Congregação', icon: '📚', requerAnciao: true, requerServo: true, ordem: 10 },
      { id: 'leitor_ebc', label: 'Leitor (EBC)', icon: '📖', requerAnciao: false, requerServo: true, ordem: 11 },
      { id: 'orador_servico', label: 'Discurso de Serviço', icon: '🎤', requerAnciao: true, requerServo: true, ordem: 12 },
      { id: 'oracao_final', label: 'Oração Final', icon: '🙏', requerAnciao: true, requerServo: false, ordem: 13 },
    ],
    avIndicadores: [], // Gerado dinamicamente
    limpeza: [], // Gerado dinamicamente
    testemunhoPublico: [
      { id: 'testemunho_sabado_manha', label: 'Testemunho Sábado Manhã', icon: '📢', ordem: 1 },
      { id: 'testemunho_sabado_tarde', label: 'Testemunho Sábado Tarde', icon: '📢', ordem: 2 },
      { id: 'testemunho_domingo_manha', label: 'Testemunho Domingo Manhã', icon: '📢', ordem: 3 },
      { id: 'testemunho_domingo_tarde', label: 'Testemunho Domingo Tarde', icon: '📢', ordem: 4 },
    ],
  },
  
  categorias: [
    { id: 'fim_semana', label: 'Reunião de Fim de Semana', icon: '📅', cor: '#1976d2' },
    { id: 'meio_semana', label: 'Reunião de Meio de Semana', icon: '📆', cor: '#2196f3' },
    { id: 'av_indicadores', label: 'A/V e Indicadores', icon: '🎬', cor: '#9c27b0' },
    { id: 'limpeza', label: 'Limpeza', icon: '🧹', cor: '#795548' },
    { id: 'testemunho_publico', label: 'Testemunho Público', icon: '📢', cor: '#4caf50' },
    { id: 'hospitalidade', label: 'Hospitalidade', icon: '🏠', cor: '#ff9800' },
    { id: 'oradores', label: 'Oradores', icon: '🎤', cor: '#e91e63' },
  ],
  
  statusDesignacao: [
    { id: 'pendente', label: 'Pendente', cor: '#757575', icon: '⏳' },
    { id: 'agendado', label: 'Agendado', cor: '#2196f3', icon: '📅' },
    { id: 'confirmado', label: 'Confirmado', cor: '#4caf50', icon: '✅' },
    { id: 'realizado', label: 'Realizado', cor: '#00bcd4', icon: '✓' },
    { id: 'cancelado', label: 'Cancelado', cor: '#f44336', icon: '❌' },
    { id: 'substituido', label: 'Substituído', cor: '#9c27b0', icon: '🔄' },
    { id: 'ausente', label: 'Ausente', cor: '#ff9800', icon: '🚫' },
  ],
  
  tiposAusencia: [
    { id: 'periodo', label: 'Período (contínuo)', icon: '📅' },
    { id: 'dias_especificos', label: 'Dias Específicos', icon: '📆' },
    { id: 'recorrente', label: 'Recorrente', icon: '🔄' },
  ],
  
  tiposDesignacaoAusencia: [
    { id: 'todas', label: 'Todas as designações' },
    { id: 'reuniao_meio_semana', label: 'Reunião de Meio de Semana' },
    { id: 'reuniao_fim_semana', label: 'Reunião de Fim de Semana' },
    { id: 'testemunho_publico', label: 'Testemunho Público' },
    { id: 'presidente', label: 'Presidente' },
    { id: 'oracao', label: 'Oração' },
    { id: 'leitor', label: 'Leitor' },
    { id: 'indicador', label: 'Indicador' },
    { id: 'microfone', label: 'Microfone' },
    { id: 'som', label: 'Som' },
    { id: 'plataforma', label: 'Plataforma' },
    { id: 'limpeza', label: 'Limpeza' },
  ],
  
  diasSemana: [
    { id: 'segunda', label: 'Segunda-feira', abrev: 'Seg' },
    { id: 'terca', label: 'Terça-feira', abrev: 'Ter' },
    { id: 'quarta', label: 'Quarta-feira', abrev: 'Qua' },
    { id: 'quinta', label: 'Quinta-feira', abrev: 'Qui' },
    { id: 'sexta', label: 'Sexta-feira', abrev: 'Sex' },
    { id: 'sabado', label: 'Sábado', abrev: 'Sáb' },
    { id: 'domingo', label: 'Domingo', abrev: 'Dom' },
  ],
  
  quantidades: {
    microfones: 2,
    indicadores: 2,
    assistentesZoom: 0,
    designacoesPalco: 0,
    designacoesSom: 1,
    designacoesVideo: 1,
    gruposLimpeza: 1,
  },
  
  fimSemana: {
    ativarHospitalidade: false,
    organizarHospitalidadePorGrupo: false,
    mostrarLeitorSentinela: true,
    mostrarInterprete: false,
    dirigenteSentinela: '',
    nomeCongregacao: 'Minha Congregação',
    contatoCoordenadorDiscursos: '',
    outroOradorNome: '',
    outroOradorCongregacao: '',
    outroOradorTituloDiscurso: '',
    esconderOradoresFora: true,
    designarOradorOrcadorFinal: true,
    nomeSuperintendenteCircuito: '',
    tituloDiscursoPublicoSC: '',
    tituloDiscursoServicoSC: '',
    canticoFinalVisitaSC: 0,
    formatoDataImpressao: 'weekof',
    modeloEmailLembrete: ''
  },
  
  meioSemana: {
    temaDiscursoServico: '',
    canticoFinalVisitaSCMeio: 0,
    numeroClassesAuxiliares: 1,
    formatoDataImpressao: 'weekof',
    gerarFormularioS89: true
  },
  
  avIndicadores: {
    numeroMicrofones: 2,
    numeroIndicadores: 2,
    numeroAssistentesZoom: 0,
    numeroDesignacoesPalco: 0,
    numeroDesignacoesSom: 1,
    numeroDesignacoesVideo: 1,
    etiquetasVideo: [{ id: 'v1', label: 'Vídeo', ativo: true }],
    etiquetasAudio: [{ id: 'a1', label: 'Áudio', ativo: true }],
    etiquetasMicrofone: [
      { id: 'm1', label: 'Microfone Esquerdo', ativo: true },
      { id: 'm2', label: 'Microfone Direito', ativo: true }
    ],
    etiquetasPalco: [],
    etiquetasIndicador: [
      { id: 'i1', label: 'Indicador Entrada', ativo: true },
      { id: 'i2', label: 'Indicador Auditório', ativo: true }
    ],
    etiquetasZoom: [],
    lapelasIndicador: [],
    programacaoAVSemanal: true
  },
  
  limpeza: {
    numeroGruposLimpeza: 1,
    etiquetasLimpeza: [{ id: 'l1', label: 'Grupo de Limpeza', ativo: true }],
    avisarTodosMembrosGrupo: false
  },
  
  testemunhoPublico: {
    ativarAgendamentoLivre: false,
    permitirProgramarOutros: false,
    comportamentoAutoPreenchimento: 'genero_familia',
    permitirDefinirDisponibilidade: true
  },
  
  ausencias: {
    notificarCoordenador: true,
    notificarPublicador: true,
    diasAntecedenciaNotificacao: 3,
    permitirAusenciaRecorrente: true,
    maxDiasAusenciaContinua: 90,
    requerAprovacao: false,
    bloquearDesignacoesAutomaticas: true,
    mostrarAusentesNaEscala: true,
    tiposAusenciaPermitidos: ['periodo', 'dias_especificos', 'recorrente'],
    motivosPreDefinidos: ['Viagem', 'Doença', 'Trabalho', 'Consulta médica', 'Estudos', 'Compromisso familiar', 'Outro']
  },
  
  designacoes: {
    periodoMinimoEntreDesignacoes: 14,
    maxDesignacoesConsecutivas: 2,
    evitarMesmaPessoaSemanaSeguinte: true,
    priorizarPioneiros: true,
    priorizarSemDesignacao: true,
    diasUrgencia: 30,
    balancearPorGenero: false,
    balancearPorGrupo: true,
    requerConfirmacao: true,
    diasLimiteConfirmacao: 3,
    enviarLembreteAutomatico: true
  },
  
  notificacoes: {
    emailAtivo: true,
    smsAtivo: false,
    whatsappAtivo: false,
    notificarNovaDesignacao: true,
    notificarAlteracaoDesignacao: true,
    notificarLembrete: true,
    notificarAusenciaAprovada: true,
    templateNovaDesignacao: '',
    templateLembreteDesignacao: '',
    templateAusencia: '',
    emailRemetente: '',
    nomeRemetente: '',
    horaEnvioLembretes: '09:00',
    diasAntecedenciaLembrete: 2
  },
  
  horarios: {
    diaMeioSemana: 'terca',
    horaInicioMeioSemana: '19:00',
    horaFimMeioSemana: '20:45',
    diaFimSemana: 'domingo',
    horaInicioFimSemana: '10:00',
    horaFimFimSemana: '12:00',
    horariosTestemunhoPublico: [{ dia: 'sabado', horaInicio: '15:00', horaFim: '17:00' }]
  },
  
  permissoes: {
    anciãos: { editarDesignacoes: true, editarAusencias: true, verRelatorios: true, exportarDados: true },
    servosMinisteriais: { editarDesignacoes: true, editarAusencias: false, verRelatorios: true, exportarDados: false },
    publicadores: { verPropriaEscala: true, editarPropriaDisponibilidade: true, verOutrasEscalas: false }
  }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function gerarTiposAVDinamicos(config: any) {
  const tipos: any[] = []
  const etiquetas = config?.avIndicadores || CONFIGURACOES_PADRAO.avIndicadores
  
  // Priorizar quantidades.avIndicadores, depois quantidades, depois avIndicadores
  const numMics = config?.quantidades?.microfones || config?.avIndicadores?.numeroMicrofones || etiquetas.numeroMicrofones || 2
  const numIndicadores = config?.quantidades?.indicadores || config?.avIndicadores?.numeroIndicadores || etiquetas.numeroIndicadores || 2
  
  tipos.push({ id: 'som', label: 'Som', icon: '🔊', ordem: 1 })
  tipos.push({ id: 'video', label: 'Vídeo', icon: '🎬', ordem: 2 })
  
  const etiquetasMic = etiquetas.etiquetasMicrofone || []
  for (let i = 1; i <= numMics; i++) {
    tipos.push({
      id: `microfone_${i}`,
      label: etiquetasMic[i - 1]?.label || `Microfone ${i}`,
      icon: '🎙️',
      ordem: 2 + i
    })
  }
  
  const etiquetasInd = etiquetas.etiquetasIndicador || []
  for (let i = 1; i <= numIndicadores; i++) {
    tipos.push({
      id: `indicador_${i}`,
      label: etiquetasInd[i - 1]?.label || `Indicador ${i}`,
      icon: '👆',
      ordem: 2 + numMics + i
    })
  }
  
  tipos.push({ id: 'plataforma', label: 'Plataforma', icon: '🏛️', ordem: 100 })
  tipos.push({ id: 'zoom', label: 'Assistente Zoom', icon: '💻', ordem: 101 })
  
  return tipos
}

function gerarTiposLimpezaDinamicos(config: any) {
  const tipos: any[] = []
  const numGrupos = config?.quantidades?.gruposLimpeza || config?.limpeza?.numeroGruposLimpeza || 1
  const etiquetas = config?.limpeza?.etiquetasLimpeza || []
  const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
  
  for (let i = 0; i < numGrupos; i++) {
    tipos.push({
      id: `grupo_limpeza_${letras[i].toLowerCase()}`,
      label: etiquetas[i]?.label || `Grupo ${letras[i]}`,
      icon: '🧹',
      ordem: i + 1
    })
  }
  
  return tipos
}

// ============================================
// ROTAS
// ============================================

// Obter TODAS as configurações
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    let config = await db.collection('config-programacao').findOne({})
    
    if (!config) {
      const defaultConfig = { ...CONFIGURACOES_PADRAO, atualizadoEm: new Date(), atualizadoPor: 'sistema' }
      await db.collection('config-programacao').insertOne(defaultConfig)
      config = defaultConfig
    }
    
    const tiposAV = gerarTiposAVDinamicos(config)
    const tiposLimpeza = gerarTiposLimpezaDinamicos(config)
    
    const resposta = {
      ...config,
      tiposDesignacao: {
        fimSemana: CONFIGURACOES_PADRAO.tiposDesignacao.fimSemana,
        meioSemana: CONFIGURACOES_PADRAO.tiposDesignacao.meioSemana,
        avIndicadores: tiposAV,
        limpeza: tiposLimpeza,
        testemunhoPublico: CONFIGURACOES_PADRAO.tiposDesignacao.testemunhoPublico,
      },
      categorias: CONFIGURACOES_PADRAO.categorias,
      statusDesignacao: CONFIGURACOES_PADRAO.statusDesignacao,
      tiposAusencia: CONFIGURACOES_PADRAO.tiposAusencia,
      tiposDesignacaoAusencia: CONFIGURACOES_PADRAO.tiposDesignacaoAusencia,
      diasSemana: CONFIGURACOES_PADRAO.diasSemana,
    }

    res.json({ config: resposta })
  } catch (error: any) {
    console.error('Error getting config:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obter apenas os tipos (endpoint rápido)
router.get('/tipos', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const config = await db.collection('config-programacao').findOne({})
    
    res.json({
      tiposDesignacao: {
        fimSemana: CONFIGURACOES_PADRAO.tiposDesignacao.fimSemana,
        meioSemana: CONFIGURACOES_PADRAO.tiposDesignacao.meioSemana,
        avIndicadores: gerarTiposAVDinamicos(config),
        limpeza: gerarTiposLimpezaDinamicos(config),
        testemunhoPublico: CONFIGURACOES_PADRAO.tiposDesignacao.testemunhoPublico,
      },
      categorias: CONFIGURACOES_PADRAO.categorias,
      statusDesignacao: CONFIGURACOES_PADRAO.statusDesignacao,
      tiposAusencia: CONFIGURACOES_PADRAO.tiposAusencia,
      tiposDesignacaoAusencia: CONFIGURACOES_PADRAO.tiposDesignacaoAusencia,
      diasSemana: CONFIGURACOES_PADRAO.diasSemana,
    })
  } catch (error: any) {
    console.error('Error getting tipos:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obter seção específica
router.get('/secao/:secao', async (req: Request, res: Response) => {
  try {
    const { secao } = req.params
    const db = await getDb()
    const config = await db.collection('config-programacao').findOne({})
    
    if (!config) {
      const secaoPadrao = CONFIGURACOES_PADRAO[secao as keyof typeof CONFIGURACOES_PADRAO]
      return secaoPadrao ? res.json({ config: secaoPadrao }) : res.status(404).json({ error: 'Seção não encontrada' })
    }
    
    const secaoData = config[secao]
    return secaoData ? res.json({ config: secaoData }) : res.status(404).json({ error: 'Seção não encontrada' })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Função para sincronizar arrays com quantidades
function sincronizarArrays(data: any, existing: any): any {
  // Primeiro, fazer merge profundo com dados existentes
  const result = { ...existing, ...data }
  
  // Merge avIndicadores
  if (existing?.avIndicadores || data.avIndicadores) {
    result.avIndicadores = { ...existing?.avIndicadores, ...data.avIndicadores }
  }
  
  // Merge limpeza
  if (existing?.limpeza || data.limpeza) {
    result.limpeza = { ...existing?.limpeza, ...data.limpeza }
  }
  
  // Sincronizar indicadores
  const numIndicadores = result.avIndicadores?.numeroIndicadores ?? 2
  const etiquetasIndExist = result.avIndicadores?.etiquetasIndicador || []
  const novasEtiquetasInd = []
  for (let i = 0; i < numIndicadores; i++) {
    novasEtiquetasInd.push(etiquetasIndExist[i] || { id: `i${i + 1}`, label: `Indicador ${i + 1}`, ativo: true })
  }
  result.avIndicadores.etiquetasIndicador = novasEtiquetasInd
  
  // Sincronizar microfones
  const numMicrofones = result.avIndicadores?.numeroMicrofones ?? 2
  const etiquetasMicExist = result.avIndicadores?.etiquetasMicrofone || []
  const novasEtiquetasMic = []
  for (let i = 0; i < numMicrofones; i++) {
    novasEtiquetasMic.push(etiquetasMicExist[i] || { id: `m${i + 1}`, label: `Microfone ${i + 1}`, ativo: true })
  }
  result.avIndicadores.etiquetasMicrofone = novasEtiquetasMic
  
  // Sincronizar limpeza
  const numGrupos = result.limpeza?.numeroGruposLimpeza ?? 1
  const etiquetasLimpezaExist = result.limpeza?.etiquetasLimpeza || []
  const novasEtiquetasLimpeza = []
  const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
  for (let i = 0; i < numGrupos; i++) {
    novasEtiquetasLimpeza.push(etiquetasLimpezaExist[i] || { id: `l${i + 1}`, label: `Grupo ${letras[i]}`, ativo: true })
  }
  result.limpeza.etiquetasLimpeza = novasEtiquetasLimpeza
  
  return result
}

// Salvar configurações
router.post('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const { _id, ...dataWithoutId } = req.body
    const existing = await db.collection('config-programacao').findOne({})

    // Sincronizar arrays com as quantidades
    const dataSincronizada = sincronizarArrays(dataWithoutId, existing)

    if (existing) {
      await db.collection('config-programacao').updateOne({}, { $set: { ...dataSincronizada, atualizadoEm: new Date(), atualizadoPor: dataSincronizada.atualizadoPor || 'usuario' } })
    } else {
      await db.collection('config-programacao').insertOne({ ...dataSincronizada, atualizadoEm: new Date(), atualizadoPor: dataSincronizada.atualizadoPor || 'usuario' })
    }

    res.json({ config: await db.collection('config-programacao').findOne({}) })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Atualizar seção
router.put('/secao/:secao', async (req: Request, res: Response) => {
  try {
    const { secao } = req.params
    const db = await getDb()
    const existing = await db.collection('config-programacao').findOne({})

    if (!existing) {
      const newConfig = { ...CONFIGURACOES_PADRAO, [secao]: req.body, atualizadoEm: new Date(), atualizadoPor: 'usuario' }
      const sincronizado = sincronizarArrays(newConfig, null)
      await db.collection('config-programacao').insertOne(sincronizado)
    } else {
      const updatedData = { ...existing, [secao]: req.body }
      const sincronizado = sincronizarArrays(updatedData, existing)
      await db.collection('config-programacao').updateOne({}, { $set: { ...sincronizado, atualizadoEm: new Date(), atualizadoPor: 'usuario' } })
    }

    res.json({ config: await db.collection('config-programacao').findOne({}) })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Reset
router.post('/reset', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const defaultConfig = { ...CONFIGURACOES_PADRAO, atualizadoEm: new Date(), atualizadoPor: 'sistema' }
    await db.collection('config-programacao').deleteMany({})
    await db.collection('config-programacao').insertOne(defaultConfig)
    res.json({ message: 'Configurações resetadas', config: defaultConfig })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Microfones
router.get('/microfones', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const config = await db.collection('config-programacao').findOne({})
    const etiquetas = config?.avIndicadores?.etiquetasMicrofone || CONFIGURACOES_PADRAO.avIndicadores.etiquetasMicrofone
    const num = config?.quantidades?.microfones || config?.avIndicadores?.numeroMicrofones || 2
    
    res.json({ microfones: Array.from({ length: num }, (_, i) => ({
      id: `microfone_${i + 1}`,
      tipo: `microfone_${i + 1}`,
      nome: etiquetas[i]?.label || `Microfone ${i + 1}`,
      etiqueta: etiquetas[i]?.label
    }))})
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Indicadores
router.get('/indicadores', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const config = await db.collection('config-programacao').findOne({})
    const etiquetas = config?.avIndicadores?.etiquetasIndicador || CONFIGURACOES_PADRAO.avIndicadores.etiquetasIndicador
    const num = config?.quantidades?.indicadores || config?.avIndicadores?.numeroIndicadores || 2
    
    res.json({ indicadores: Array.from({ length: num }, (_, i) => ({
      id: `indicador_${i + 1}`,
      tipo: `indicador_${i + 1}`,
      nome: etiquetas[i]?.label || `Indicador ${i + 1}`,
      etiqueta: etiquetas[i]?.label
    }))})
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Grupos limpeza
router.get('/grupos-limpeza', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const config = await db.collection('config-programacao').findOne({})
    res.json({ grupos: gerarTiposLimpezaDinamicos(config) })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
