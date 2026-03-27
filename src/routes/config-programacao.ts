import { Router, Request, Response } from 'express'
import { getDb } from '../db.js'
import { ObjectId } from 'mongodb'

const router = Router()

// Configurações padrão
const CONFIGURACOES_PADRAO = {
  id: 'default',
  nome: 'Configurações Padrão',
  versao: '2.0.0',
  
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
    motivosPreDefinidos: [
      'Viagem',
      'Doença',
      'Trabalho',
      'Consulta médica',
      'Estudos',
      'Compromisso familiar',
      'Outro'
    ]
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
    horariosTestemunhoPublico: [
      { dia: 'sabado', horaInicio: '15:00', horaFim: '17:00' }
    ]
  },
  
  permissoes: {
    anciãos: {
      editarDesignacoes: true,
      editarAusencias: true,
      verRelatorios: true,
      exportarDados: true
    },
    servosMinisteriais: {
      editarDesignacoes: true,
      editarAusencias: false,
      verRelatorios: true,
      exportarDados: false
    },
    publicadores: {
      verPropriaEscala: true,
      editarPropriaDisponibilidade: true,
      verOutrasEscalas: false
    }
  }
}

// Obter configurações de programação
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    let config = await db.collection('config-programacao').findOne({})
    
    if (!config) {
      // Criar configurações padrão se não existir
      const defaultConfig = {
        ...CONFIGURACOES_PADRAO,
        atualizadoEm: new Date(),
        atualizadoPor: 'sistema'
      }
      
      await db.collection('config-programacao').insertOne(defaultConfig)
      config = defaultConfig
    }

    res.json({ config })
  } catch (error: any) {
    console.error('Error getting config-programacao:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obter configuração específica por seção
router.get('/secao/:secao', async (req: Request, res: Response) => {
  try {
    const { secao } = req.params
    const db = await getDb()
    
    const config = await db.collection('config-programacao').findOne({})
    
    if (!config) {
      // Retornar padrão da seção
      const secaoPadrao = CONFIGURACOES_PADRAO[secao as keyof typeof CONFIGURACOES_PADRAO]
      if (!secaoPadrao) {
        return res.status(404).json({ error: 'Seção não encontrada' })
      }
      return res.json({ config: secaoPadrao })
    }
    
    const secaoData = config[secao]
    if (!secaoData) {
      return res.status(404).json({ error: 'Seção não encontrada' })
    }
    
    res.json({ config: secaoData })
  } catch (error: any) {
    console.error('Error getting config section:', error)
    res.status(500).json({ error: error.message })
  }
})

// Salvar configurações de programação (completo)
router.post('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const data = req.body

    const existing = await db.collection('config-programacao').findOne({})

    if (existing) {
      await db.collection('config-programacao').updateOne(
        {},
        { 
          $set: { 
            ...data,
            atualizadoEm: new Date(),
            atualizadoPor: data.atualizadoPor || 'usuario'
          } 
        }
      )
    } else {
      await db.collection('config-programacao').insertOne({
        ...data,
        atualizadoEm: new Date(),
        atualizadoPor: data.atualizadoPor || 'usuario'
      })
    }

    const updated = await db.collection('config-programacao').findOne({})
    res.json({ config: updated })
  } catch (error: any) {
    console.error('Error saving config-programacao:', error)
    res.status(500).json({ error: error.message })
  }
})

// Atualizar seção específica
router.put('/secao/:secao', async (req: Request, res: Response) => {
  try {
    const { secao } = req.params
    const data = req.body
    const db = await getDb()

    // Verificar se a seção é válida
    if (!CONFIGURACOES_PADRAO[secao as keyof typeof CONFIGURACOES_PADRAO]) {
      return res.status(400).json({ error: 'Seção inválida' })
    }

    const existing = await db.collection('config-programacao').findOne({})

    if (!existing) {
      // Criar configuração completa com a seção atualizada
      const newConfig = {
        ...CONFIGURACOES_PADRAO,
        [secao]: data,
        atualizadoEm: new Date(),
        atualizadoPor: 'usuario'
      }
      await db.collection('config-programacao').insertOne(newConfig)
    } else {
      // Atualizar apenas a seção
      await db.collection('config-programacao').updateOne(
        {},
        { 
          $set: { 
            [secao]: data,
            atualizadoEm: new Date(),
            atualizadoPor: 'usuario'
          } 
        }
      )
    }

    const updated = await db.collection('config-programacao').findOne({})
    res.json({ config: updated })
  } catch (error: any) {
    console.error('Error updating config section:', error)
    res.status(500).json({ error: error.message })
  }
})

// Resetar para configurações padrão
router.post('/reset', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    
    const defaultConfig = {
      ...CONFIGURACOES_PADRAO,
      atualizadoEm: new Date(),
      atualizadoPor: 'sistema'
    }
    
    await db.collection('config-programacao').deleteMany({})
    await db.collection('config-programacao').insertOne(defaultConfig)
    
    res.json({ 
      message: 'Configurações resetadas com sucesso',
      config: defaultConfig 
    })
  } catch (error: any) {
    console.error('Error resetting config-programacao:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obter lista de grupos de limpeza baseado na configuração
router.get('/grupos-limpeza', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const config = await db.collection('config-programacao').findOne({})
    
    const numeroGrupos = config?.limpeza?.numeroGruposLimpeza || 1
    const etiquetas = config?.limpeza?.etiquetasLimpeza || CONFIGURACOES_PADRAO.limpeza.etiquetasLimpeza
    
    const grupos = []
    const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    
    for (let i = 0; i < numeroGrupos; i++) {
      grupos.push({
        id: `grupo_limpeza_${letras[i].toLowerCase()}`,
        nome: `Grupo ${letras[i]}`,
        etiqueta: etiquetas[i]?.label || `Grupo ${letras[i]}`
      })
    }
    
    res.json({ grupos })
  } catch (error: any) {
    console.error('Error getting grupos limpeza:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obter configuração de microfones
router.get('/microfones', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const config = await db.collection('config-programacao').findOne({})
    
    const numeroMicrofones = config?.avIndicadores?.numeroMicrofones || 2
    const etiquetas = config?.avIndicadores?.etiquetasMicrofone || CONFIGURACOES_PADRAO.avIndicadores.etiquetasMicrofone
    
    const microfones = []
    for (let i = 1; i <= numeroMicrofones; i++) {
      const etiqueta = etiquetas[i - 1]
      microfones.push({
        id: `microfone_${i}`,
        tipo: `microfone_${i}` as any,
        nome: etiqueta?.label || `Microfone ${i}`,
        etiqueta: etiqueta?.label
      })
    }
    
    res.json({ microfones })
  } catch (error: any) {
    console.error('Error getting microfones config:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obter configuração de indicadores
router.get('/indicadores', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const config = await db.collection('config-programacao').findOne({})
    
    const numeroIndicadores = config?.avIndicadores?.numeroIndicadores || 2
    const etiquetas = config?.avIndicadores?.etiquetasIndicador || CONFIGURACOES_PADRAO.avIndicadores.etiquetasIndicador
    
    const indicadores = []
    for (let i = 1; i <= numeroIndicadores; i++) {
      const etiqueta = etiquetas[i - 1]
      indicadores.push({
        id: `indicador_${i}`,
        tipo: `indicador_${i}` as any,
        nome: etiqueta?.label || `Indicador ${i}`,
        etiqueta: etiqueta?.label
      })
    }
    
    res.json({ indicadores })
  } catch (error: any) {
    console.error('Error getting indicadores config:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
