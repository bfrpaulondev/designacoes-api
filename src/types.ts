// ============================================
// SISTEMA DE PRIVILÉGIOS E PERMISSÕES
// ============================================

/**
 * Tipos de papel/role no sistema
 * Hierarquia: super_admin > admin > ancião > servo_ministerial > publicador > convidado
 */
export type UserRole = 
  | 'super_admin'      // Acesso total ao sistema
  | 'admin'            // Administrador da congregação
  | 'anciao'           // Ancião (presbítero)
  | 'servo_ministerial' // Servo ministerial (diácono)
  | 'publicador'       // Publicador batizado
  | 'publicador_nao_batizado' // Publicador não batizado
  | 'convidado'        // Acesso limitado/visualização

/**
 * Recursos do sistema que podem ter permissões
 */
export type Resource = 
  | 'publicadores'
  | 'designacoes'
  | 'ausencias'
  | 'semanas'
  | 'etiquetas'
  | 'configuracoes'
  | 'usuarios'
  | 'privilegios'
  | 'relatorios'
  | 'notificacoes'
  | 'limpeza'
  | 'testemunho_publico'
  | 'av_indicadores'

/**
 * Ações disponíveis para cada recurso
 */
export type Action = 
  | 'create'    // Criar novo registro
  | 'read'      // Visualizar
  | 'update'    // Atualizar/editar
  | 'delete'    // Excluir
  | 'export'    // Exportar dados
  | 'import'    // Importar dados
  | 'manage'    // Gerenciar (permissão total sobre o recurso)
  | 'assign'    // Atribuir a outros
  | 'approve'   // Aprovar solicitações
  | 'view_own'  // Ver apenas próprios dados
  | 'edit_own'  // Editar apenas próprios dados

/**
 * Definição de uma permissão específica
 */
export interface Permission {
  resource: Resource
  action: Action
  conditions?: PermissionCondition[]
}

/**
 * Condições para permissões (ex: apenas próprio grupo, apenas próprios dados)
 */
export interface PermissionCondition {
  type: 'own_data' | 'own_group' | 'specific_ids' | 'time_range' | 'status'
  value: any
}

/**
 * Papel com permissões definidas
 */
export interface Role {
  _id?: string
  id: string
  name: string
  description: string
  level: number // Nível hierárquico (maior = mais privilégios)
  permissions: Permission[]
  inheritsFrom?: string // ID de outro papel para herdar permissões
  isSystem: boolean // Se é um papel do sistema (não pode ser excluído)
  createdAt: Date
  updatedAt: Date
}

/**
 * Privilégio de serviço na congregação
 */
export type PrivilegioServico = 
  | 'nenhum'
  | 'pioneiro_auxiliar'
  | 'pioneiro_regular'
  | 'pioneiro_especial'
  | 'missionario'
  | 'servo_ministerial'
  | 'anciao'
  | 'superintendente_grupo'
  | 'dirigente_estudo'
  | 'leitor'
  | 'presidente_reuniao'
  | 'orador'
  | 'coordenador_av'
  | 'operador_som'
  | 'operador_video'
  | 'indicador'
  | 'microfonista'
  | 'plataforma'
  | 'zoom_host'
  | 'coordenador_limpeza'
  | 'hospitalidade'

/**
 * Designações especiais que um usuário pode ter
 */
export type DesignacaoEspecial =
  | 'coordenador_designacoes'
  | 'secretario'
  | 'tesoureiro'
  | 'secretario_auxiliar'
  | 'tesoureiro_auxiliar'
  | 'coordenador_testemunho_publico'
  | 'supervisor_grupo_campo'

/**
 * Usuário do sistema com permissões detalhadas
 */
export interface User {
  _id?: string
  id?: string
  email: string
  password: string
  name: string
  
  // Papel principal no sistema
  role: UserRole
  
  // Privilégios de serviço
  privilegioServico?: PrivilegioServico
  designacoesEspeciais?: DesignacaoEspecial[]
  
  // Permissões customizadas (além das do papel)
  customPermissions?: Permission[]
  
  // Restrições específicas
  restrictions?: UserRestriction[]
  
  // Grupos que o usuário gerencia (se aplicável)
  managedGroups?: string[]
  
  // Metadados
  publicadorId?: string // Link com o cadastro de publicador
  isActive?: boolean
  lastLogin?: Date
  passwordChangedAt?: Date
  failedLoginAttempts?: number
  lockedUntil?: Date
  
  // Preferências do usuário
  preferences?: UserPreferences
  
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Restrições aplicadas a um usuário
 */
export interface UserRestriction {
  type: 'time_based' | 'resource_based' | 'action_based' | 'group_based'
  resource?: Resource
  action?: Action
  groupId?: string
  startTime?: string
  endTime?: string
  reason?: string
  appliedBy?: string
  appliedAt: Date
  expiresAt?: Date
}

/**
 * Preferências do usuário
 */
export interface UserPreferences {
  language: 'pt' | 'en' | 'es'
  timezone: string
  theme: 'light' | 'dark' | 'auto'
  notifications: NotificationPreferences
  dashboard: DashboardPreferences
}

export interface NotificationPreferences {
  email: boolean
  sms: boolean
  whatsapp: boolean
  newAssignment: boolean
  assignmentReminder: boolean
  absenceApproved: boolean
  weeklySchedule: boolean
  reminderDays: number
}

export interface DashboardPreferences {
  defaultView: 'week' | 'month' | 'list'
  showWeekend: boolean
  showMidweek: boolean
  showCleaning: boolean
  showPublicWitnessing: boolean
}

/**
 * Log de auditoria de ações
 */
export interface AuditLog {
  _id?: string
  id: string
  userId: string
  userName: string
  action: string
  resource: Resource
  resourceId?: string
  details: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: Date
}

/**
 * Solicitação de permissão/role
 */
export interface PermissionRequest {
  _id?: string
  id: string
  requestedBy: string
  requestedRole?: UserRole
  requestedPermissions?: Permission[]
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: Date
  reviewNotes?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================
// QUALIFICAÇÕES PARA DESIGNAÇÕES
// ============================================

/**
 * Tipos de qualificações que um publicador pode ter
 * Define quais tipos de designações cada um pode receber
 */
export type TipoQualificacao =
  // Reunião Fim de Semana
  | 'presidente_fim_semana'
  | 'oracao'
  | 'dirigente_sentinela'
  | 'leitor_sentinela'
  | 'orador'
  | 'interprete'
  | 'hospitalidade'
  
  // Reunião Meio de Semana
  | 'presidente_meio_semana'
  | 'presidente_auxiliar'
  | 'tesouros'
  | 'perolas_espirituais'
  | 'leitura_biblia'
  | 'ministerio_iniciar'
  | 'ministerio_cultivar'
  | 'ministerio_discipulos'
  | 'estudo_biblico'
  | 'leitor_ebc'
  | 'orador_servico'
  
  // AV e Indicadores
  | 'operador_som'
  | 'operador_video'
  | 'microfonista'
  | 'indicador'
  | 'plataforma'
  | 'zoom_host'
  
  // Limpeza
  | 'coordenador_limpeza'
  | 'membro_limpeza'
  
  // Testemunho Público
  | 'testemunho_publico'
  | 'dirigente_grupo_campo'

/**
 * Nível de proficiência em uma qualificação
 */
export type NivelProficiencia = 
  | 'aprendiz'     // Em treinamento, precisa supervisão
  | 'qualificado'  // Pode fazer sem supervisão
  | 'experiente'   // Pode treinar outros
  | 'especialista' // Altamente experiente, pode coordenar

/**
 * Status da qualificação
 */
export type StatusQualificacao = 
  | 'ativo'        // Pode ser designado
  | 'inativo'      // Temporariamente indisponível
  | 'em_treinamento' // Ainda aprendendo
  | 'restrito'     // Com restrições temporárias

/**
 * Qualificação de um publicador
 */
export interface QualificacaoPublicador {
  tipo: TipoQualificacao
  nivel: NivelProficiencia
  status: StatusQualificacao
  dataInicio?: Date          // Quando começou a ter essa qualificação
  dataAprovacao?: Date       // Quando foi aprovado como qualificado
  aprovadoPor?: string       // ID do ancião que aprovou
  observacoes?: string       // Notas sobre a qualificação
  ultimaDesignacao?: Date    // Última vez que foi designado
  totalDesignacoes?: number  // Quantas vezes já fez
}

/**
 * Categoria de qualificação para agrupamento
 */
export interface CategoriaQualificacao {
  id: string
  nome: string
  descricao: string
  icone?: string
  tipos: TipoQualificacao[]
  ordem: number
}

export interface Publicador {
  _id?: string
  id: string
  nome: string
  nomeCompleto: string
  nomePrimeiro: string
  nomeUltimo: string
  email?: string
  telemovel?: string
  genero: 'masculino' | 'feminino'
  tipoPublicador: string
  privilegioServico: string
  grupoCampo?: string
  grupoLimpeza?: string
  cidade?: string
  morada?: string
  latitude?: number
  longitude?: number
  status: string
  etiquetas: string[]
  restricoes: any[]
  observacoes?: string
  
  // Qualificações para designações
  qualificacoes?: QualificacaoPublicador[]
  
  createdAt: Date
  updatedAt: Date
}

export interface Etiqueta {
  _id?: string
  id: string
  nome: string
  icone: string
  cor: string
  descricao?: string
  ordem: number
  ativo: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Semana {
  _id?: string
  id: string
  dataInicio: Date
  dataFim: Date
  observacoes?: string
  status: 'rascunho' | 'publicado'
  createdAt: Date
  updatedAt: Date
}

export interface Config {
  _id?: string
  nomeCongregacao: string
  enderecoSalao: string
  telefoneSalao: string
  emailCongregacao: string
  updatedAt: Date
}

// ============================================
// AUSÊNCIAS
// ============================================

export type TipoAusencia = 'periodo' | 'dias_especificos' | 'recorrente'

export type DiaSemana = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo'

export type TipoDesignacaoAusencia = 
  | 'todas' 
  | 'reuniao_meio_semana' 
  | 'reuniao_fim_semana' 
  | 'testemunho_publico'
  | 'leitor'
  | 'oracao'
  | 'presidente'
  | 'indicador'
  | 'microfone'
  | 'som'
  | 'plataforma'
  | 'limpeza'

export interface Ausencia {
  _id?: string
  id: string
  publicadorId: string
  publicadorNome: string
  
  // Tipo de ausência
  tipo: TipoAusencia
  
  // Para período contínuo
  dataInicio?: string // formato: YYYY-MM-DD
  dataFim?: string // formato: YYYY-MM-DD
  
  // Para dias específicos (array de datas)
  diasEspecificos?: string[] // array de datas YYYY-MM-DD
  
  // Para recorrente
  diasSemana?: DiaSemana[] // dias da semana que repete
  recorrenciaInicio?: string
  recorrenciaFim?: string
  
  // Tipos de designação afetados
  tiposDesignacao: TipoDesignacaoAusencia[]
  
  // Notas
  notas?: string
  
  // Metadata
  criadoEm: Date
  atualizadoEm: Date
}

// ============================================
// DESIGNAÇÕES
// ============================================

export type CategoriaDesignacao = 
  | 'fim_semana'
  | 'meio_semana'
  | 'av_indicadores'
  | 'limpeza'
  | 'testemunho_publico'
  | 'hospitalidade'
  | 'oradores'

export type TipoDesignacaoFimSemana = 
  | 'presidente'
  | 'oracao_inicial'
  | 'oracao_final'
  | 'dirigente_sentinela'
  | 'leitor_sentinela'
  | 'interprete'
  | 'orador'
  | 'hospitalidade'

export type TipoDesignacaoMeioSemana = 
  | 'presidente'
  | 'presidente_auxiliar'
  | 'oracao_inicial'
  | 'oracao_final'
  | 'tesouros'
  | 'perolas_espirituais'
  | 'leitura_biblia'
  | 'ministerio_iniciar'
  | 'ministerio_cultivar'
  | 'ministerio_discipulos'
  | 'estudo_biblico'
  | 'leitor_ebc'
  | 'orador_servico'

export type TipoDesignacaoAV = 
  | 'som'
  | 'video'
  | 'microfone_1'
  | 'microfone_2'
  | 'microfone_3'
  | 'indicador_1'
  | 'indicador_2'
  | 'plataforma'
  | 'zoom'

export type TipoDesignacaoLimpeza = 
  | 'grupo_limpeza_a'
  | 'grupo_limpeza_b'
  | 'grupo_limpeza_c'
  | 'grupo_limpeza_d'
  | 'grupo_limpeza_e'

export type TipoDesignacaoTestemunho = 
  | 'testemunho_sabado_manha'
  | 'testemunho_sabado_tarde'
  | 'testemunho_domingo_manha'
  | 'testemunho_domingo_tarde'

export type TipoDesignacao = 
  | TipoDesignacaoFimSemana 
  | TipoDesignacaoMeioSemana 
  | TipoDesignacaoAV 
  | TipoDesignacaoLimpeza 
  | TipoDesignacaoTestemunho
  | 'hospitalidade'
  | 'orador'

export type StatusDesignacao = 
  | 'pendente'
  | 'agendado'
  | 'confirmado'
  | 'realizado'
  | 'cancelado'
  | 'substituido'
  | 'ausente'

export interface Designacao {
  _id?: string
  id: string
  publicadorId: string
  publicadorNome: string
  tipo: TipoDesignacao
  categoria: CategoriaDesignacao
  data: string // YYYY-MM-DD
  semanaId?: string
  status: StatusDesignacao
  confirmadoEm?: string
  confirmadoPor?: string
  observacoes?: string
  
  // Campos específicos para meio de semana
  sala?: 'principal' | 'auxiliar_1' | 'auxiliar_2'
  ajudanteId?: string
  ajudanteNome?: string
  
  // Campos específicos para fim de semana
  discursoTema?: string
  discursoNumero?: string
  oradorCongregacao?: string
  
  // Campos específicos para AV
  etiqueta?: string
  
  // Campos específicos para limpeza
  grupoId?: string
  grupoNome?: string
  
  // Campos específicos para testemunho público
  horaInicio?: string
  horaFim?: string
  local?: string
  companheiroId?: string
  companheiroNome?: string
  
  criadoEm: Date
  atualizadoEm: Date
}

// ============================================
// CONFIGURAÇÕES DE PROGRAMAÇÃO
// ============================================

export interface EtiquetaConfig {
  id: string
  label: string
  ativo: boolean
}

export interface ConfigFimSemana {
  ativarHospitalidade: boolean
  organizarHospitalidadePorGrupo: boolean
  mostrarLeitorSentinela: boolean
  mostrarInterprete: boolean
  dirigenteSentinela: string
  nomeCongregacao: string
  contatoCoordenadorDiscursos: string
  outroOradorNome: string
  outroOradorCongregacao: string
  outroOradorTituloDiscurso: string
  esconderOradoresFora: boolean
  designarOradorOrcadorFinal: boolean
  nomeSuperintendenteCircuito: string
  tituloDiscursoPublicoSC: string
  tituloDiscursoServicoSC: string
  canticoFinalVisitaSC: number
  formatoDataImpressao: 'weekof' | 'dayof'
  modeloEmailLembrete: string
}

export interface ConfigMeioSemana {
  temaDiscursoServico: string
  canticoFinalVisitaSCMeio: number
  numeroClassesAuxiliares: number
  formatoDataImpressao: 'weekof' | 'dayof'
  gerarFormularioS89: boolean
}

export interface ConfigAVIndicadores {
  numeroMicrofones: number
  numeroIndicadores: number
  numeroAssistentesZoom: number
  numeroDesignacoesPalco: number
  numeroDesignacoesSom: number
  numeroDesignacoesVideo: number
  etiquetasVideo: EtiquetaConfig[]
  etiquetasAudio: EtiquetaConfig[]
  etiquetasMicrofone: EtiquetaConfig[]
  etiquetasPalco: EtiquetaConfig[]
  etiquetasIndicador: EtiquetaConfig[]
  etiquetasZoom: EtiquetaConfig[]
  lapelasIndicador: EtiquetaConfig[]
  programacaoAVSemanal: boolean
}

export interface ConfigLimpeza {
  numeroGruposLimpeza: number
  etiquetasLimpeza: EtiquetaConfig[]
  avisarTodosMembrosGrupo: boolean
}

export interface ConfigTestemunhoPublico {
  ativarAgendamentoLivre: boolean
  permitirProgramarOutros: boolean
  comportamentoAutoPreenchimento: 'genero_familia' | 'todos'
  permitirDefinirDisponibilidade: boolean
}

export interface ConfigAusencias {
  notificarCoordenador: boolean
  notificarPublicador: boolean
  diasAntecedenciaNotificacao: number
  permitirAusenciaRecorrente: boolean
  maxDiasAusenciaContinua: number
  requerAprovacao: boolean
  bloquearDesignacoesAutomaticas: boolean
  mostrarAusentesNaEscala: boolean
  tiposAusenciaPermitidos: ('periodo' | 'dias_especificos' | 'recorrente')[]
  motivosPreDefinidos: string[]
}

export interface ConfigDesignacoes {
  periodoMinimoEntreDesignacoes: number
  maxDesignacoesConsecutivas: number
  evitarMesmaPessoaSemanaSeguinte: boolean
  priorizarPioneiros: boolean
  priorizarSemDesignacao: boolean
  diasUrgencia: number
  balancearPorGenero: boolean
  balancearPorGrupo: boolean
  requerConfirmacao: boolean
  diasLimiteConfirmacao: number
  enviarLembreteAutomatico: boolean
}

export interface ConfigNotificacoes {
  emailAtivo: boolean
  smsAtivo: boolean
  whatsappAtivo: boolean
  notificarNovaDesignacao: boolean
  notificarAlteracaoDesignacao: boolean
  notificarLembrete: boolean
  notificarAusenciaAprovada: boolean
  templateNovaDesignacao: string
  templateLembreteDesignacao: string
  templateAusencia: string
  emailRemetente: string
  nomeRemetente: string
  horaEnvioLembretes: string
  diasAntecedenciaLembrete: number
}

export interface ConfigHorarios {
  diaMeioSemana: 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta'
  horaInicioMeioSemana: string
  horaFimMeioSemana: string
  diaFimSemana: 'sabado' | 'domingo'
  horaInicioFimSemana: string
  horaFimFimSemana: string
  horariosTestemunhoPublico: {
    dia: 'sabado' | 'domingo'
    horaInicio: string
    horaFim: string
  }[]
}

export interface ConfigPermissoes {
  anciãos: {
    editarDesignacoes: boolean
    editarAusencias: boolean
    verRelatorios: boolean
    exportarDados: boolean
  }
  servosMinisteriais: {
    editarDesignacoes: boolean
    editarAusencias: boolean
    verRelatorios: boolean
    exportarDados: boolean
  }
  publicadores: {
    verPropriaEscala: boolean
    editarPropriaDisponibilidade: boolean
    verOutrasEscalas: boolean
  }
}

export interface ConfiguracoesProgramacao {
  _id?: string
  id: string
  nome: string
  versao: string
  
  fimSemana: ConfigFimSemana
  meioSemana: ConfigMeioSemana
  avIndicadores: ConfigAVIndicadores
  limpeza: ConfigLimpeza
  testemunhoPublico: ConfigTestemunhoPublico
  
  ausencias: ConfigAusencias
  designacoes: ConfigDesignacoes
  notificacoes: ConfigNotificacoes
  horarios: ConfigHorarios
  permissoes: ConfigPermissoes
  
  atualizadoEm: Date
  atualizadoPor: string
}
