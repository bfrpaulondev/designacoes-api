export interface User {
  _id: string
  email: string
  password: string
  name: string
  role: 'admin' | 'editor' | 'viewer'
  createdAt: Date
  updatedAt: Date
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
