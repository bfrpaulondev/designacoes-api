import { Router, Request, Response } from 'express'
import { getDb } from '../db.js'
import { ObjectId } from 'mongodb'

const router = Router()

// Listar todas as ausências
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const ausencias = await db.collection('ausencias')
      .find({})
      .sort({ criadoEm: -1 })
      .toArray()

    res.json({ ausencias })
  } catch (error: any) {
    console.error('Error listing ausencias:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obter ausências por publicador
router.get('/publicador/:publicadorId', async (req: Request, res: Response) => {
  try {
    const { publicadorId } = req.params
    const db = await getDb()
    
    const ausencias = await db.collection('ausencias')
      .find({ publicadorId })
      .sort({ criadoEm: -1 })
      .toArray()

    res.json({ ausencias })
  } catch (error: any) {
    console.error('Error getting ausencias by publicador:', error)
    res.status(500).json({ error: error.message })
  }
})

// Obter uma ausência por ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()
    
    let ausencia
    if (ObjectId.isValid(id)) {
      ausencia = await db.collection('ausencias').findOne({ _id: new ObjectId(id) })
    }
    if (!ausencia) {
      ausencia = await db.collection('ausencias').findOne({ id })
    }

    if (!ausencia) {
      return res.status(404).json({ error: 'Ausência não encontrada' })
    }

    res.json({ ausencia })
  } catch (error: any) {
    console.error('Error getting ausencia:', error)
    res.status(500).json({ error: error.message })
  }
})

// Verificar ausências ativas para uma data
router.post('/verificar', async (req: Request, res: Response) => {
  try {
    const { data, publicadorId, tipoDesignacao } = req.body
    
    if (!data) {
      return res.status(400).json({ error: 'Data é obrigatória' })
    }

    const db = await getDb()
    
    // Buscar todas as ausências
    const ausencias = await db.collection('ausencias').find({}).toArray()
    
    // Filtrar ausências ativas para a data
    const ausenciasAtivas = ausencias.filter((ausencia: any) => {
      // Se especificou publicador, filtrar por ele
      if (publicadorId && ausencia.publicadorId !== publicadorId) {
        return false
      }

      // Verificar se a data está dentro do período de ausência
      switch (ausencia.tipo) {
        case 'periodo':
          if (ausencia.dataInicio && ausencia.dataFim) {
            const dataCheck = new Date(data + 'T12:00:00').getTime()
            const inicio = new Date(ausencia.dataInicio + 'T12:00:00').getTime()
            const fim = new Date(ausencia.dataFim + 'T12:00:00').getTime()
            return dataCheck >= inicio && dataCheck <= fim
          }
          return false
          
        case 'dias_especificos':
          return ausencia.diasEspecificos?.includes(data)
          
        case 'recorrente':
          if (!ausencia.diasSemana?.length) return false
          
          // Mapear dia da semana
          const dias: string[] = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
          const dataObj = new Date(data + 'T12:00:00')
          const diaSemana = dias[dataObj.getDay()]
          
          if (!ausencia.diasSemana.includes(diaSemana)) return false
          
          // Verificar período de recorrência
          const dataCheck = new Date(data + 'T12:00:00').getTime()
          const dentroInicio = !ausencia.recorrenciaInicio || 
            dataCheck >= new Date(ausencia.recorrenciaInicio + 'T12:00:00').getTime()
          const dentroFim = !ausencia.recorrenciaFim || 
            dataCheck <= new Date(ausencia.recorrenciaFim + 'T12:00:00').getTime()
          
          return dentroInicio && dentroFim
          
        default:
          return false
      }
    })

    // Se especificou tipo de designação, filtrar ainda mais
    let resultado = ausenciasAtivas
    if (tipoDesignacao) {
      resultado = ausenciasAtivas.filter((ausencia: any) => {
        // Se afeta "todas", inclui
        if (ausencia.tiposDesignacao?.includes('todas')) return true
        
        // Mapear tipos específicos
        const mapeamento: Record<string, string[]> = {
          'presidente': ['presidente', 'reuniao_meio_semana', 'reuniao_fim_semana'],
          'presidente_auxiliar': ['presidente', 'reuniao_meio_semana'],
          'oracao_inicial': ['oracao', 'reuniao_meio_semana', 'reuniao_fim_semana'],
          'oracao_final': ['oracao', 'reuniao_meio_semana', 'reuniao_fim_semana'],
          'leitor': ['leitor', 'reuniao_meio_semana'],
          'leitor_ebc': ['leitor', 'reuniao_meio_semana'],
          'leitor_sentinela': ['leitor', 'reuniao_fim_semana'],
          'microfone_1': ['microfone', 'av_indicadores'],
          'microfone_2': ['microfone', 'av_indicadores'],
          'microfone_3': ['microfone', 'av_indicadores'],
          'indicador_1': ['indicador', 'av_indicadores'],
          'indicador_2': ['indicador', 'av_indicadores'],
          'som': ['som', 'av_indicadores'],
          'video': ['som', 'av_indicadores'],
          'plataforma': ['plataforma', 'av_indicadores'],
          'grupo_limpeza_a': ['limpeza'],
          'grupo_limpeza_b': ['limpeza'],
          'grupo_limpeza_c': ['limpeza'],
          'grupo_limpeza_d': ['limpeza'],
          'grupo_limpeza_e': ['limpeza'],
        }
        
        const tiposRelacionados = mapeamento[tipoDesignacao] || []
        return ausencia.tiposDesignacao?.some((t: string) => tiposRelacionados.includes(t))
      })
    }

    res.json({ 
      ausenciasAtivas: resultado,
      total: resultado.length,
      publicadoresAusentes: resultado.map((a: any) => ({
        publicadorId: a.publicadorId,
        publicadorNome: a.publicadorNome,
        motivo: a.notas || `Ausência do tipo ${a.tipo}`
      }))
    })
  } catch (error: any) {
    console.error('Error verifying ausencias:', error)
    res.status(500).json({ error: error.message })
  }
})

// Criar nova ausência
router.post('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const data = req.body

    // Validações básicas
    if (!data.publicadorId) {
      return res.status(400).json({ error: 'ID do publicador é obrigatório' })
    }
    if (!data.tipo) {
      return res.status(400).json({ error: 'Tipo de ausência é obrigatório' })
    }

    // Buscar nome do publicador
    const publicador = await db.collection('publicadores').findOne({ id: data.publicadorId })
    const publicadorNome = publicador?.nome || publicador?.nomeCompleto || data.publicadorNome || ''

    const ausencia = {
      id: new ObjectId().toString(),
      publicadorId: data.publicadorId,
      publicadorNome,
      tipo: data.tipo,
      
      // Campos para período
      dataInicio: data.dataInicio || null,
      dataFim: data.dataFim || null,
      
      // Campos para dias específicos
      diasEspecificos: data.diasEspecificos || [],
      
      // Campos para recorrente
      diasSemana: data.diasSemana || [],
      recorrenciaInicio: data.recorrenciaInicio || null,
      recorrenciaFim: data.recorrenciaFim || null,
      
      // Tipos de designação afetados
      tiposDesignacao: data.tiposDesignacao || ['todas'],
      
      // Notas
      notas: data.notas || '',
      
      // Metadata
      criadoEm: new Date(),
      atualizadoEm: new Date()
    }

    const result = await db.collection('ausencias').insertOne(ausencia)
    
    res.status(201).json({ 
      ausencia: { ...ausencia, _id: result.insertedId } 
    })
  } catch (error: any) {
    console.error('Error creating ausencia:', error)
    res.status(500).json({ error: error.message })
  }
})

// Atualizar ausência
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()
    const data = req.body

    const updateData: any = {
      ...data,
      atualizadoEm: new Date()
    }

    // Se atualizou o publicador, buscar o nome
    if (data.publicadorId) {
      const publicador = await db.collection('publicadores').findOne({ id: data.publicadorId })
      if (publicador) {
        updateData.publicadorNome = publicador.nome || publicador.nomeCompleto
      }
    }

    const result = await db.collection('ausencias').updateOne(
      { id },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Ausência não encontrada' })
    }

    const updated = await db.collection('ausencias').findOne({ id })
    res.json({ ausencia: updated })
  } catch (error: any) {
    console.error('Error updating ausencia:', error)
    res.status(500).json({ error: error.message })
  }
})

// Excluir ausência
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()

    const result = await db.collection('ausencias').deleteOne({ id })
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Ausência não encontrada' })
    }
    
    res.json({ message: 'Ausência excluída com sucesso' })
  } catch (error: any) {
    console.error('Error deleting ausencia:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
