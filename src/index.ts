import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import publicadoresRoutes from './routes/publicadores.js'
import etiquetasRoutes from './routes/etiquetas.js'
import semanasRoutes from './routes/semanas.js'
import configRoutes from './routes/config.js'
import ausenciasRoutes from './routes/ausencias.js'
import designacoesRoutes from './routes/designacoes.js'
import configProgramacaoRoutes from './routes/config-programacao.js'
import privilegiosRoutes from './routes/privilegios.js'
import qualificacoesRoutes from './routes/qualificacoes.js'
import { closeConnection } from './db.js'

const app = express()
const PORT = process.env.PORT || 3001

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'https://designacoes-app.vercel.app'
]

app.use(cors({
  origin: corsOrigins,
  credentials: true
}))
app.use(express.json())

// Health check
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const { getDb } = await import('./db.js')
    const db = await getDb()
    await db.command({ ping: 1 })
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    })
  } catch (error: any) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    })
  }
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/publicadores', publicadoresRoutes)
app.use('/api/etiquetas', etiquetasRoutes)
app.use('/api/semanas', semanasRoutes)
app.use('/api/config', configRoutes)
app.use('/api/ausencias', ausenciasRoutes)
app.use('/api/designacoes', designacoesRoutes)
app.use('/api/config-programacao', configProgramacaoRoutes)
app.use('/api/privilegios', privilegiosRoutes)
app.use('/api/qualificacoes', qualificacoesRoutes)

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err.message)
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : err.message })
})

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  server.close(() => {
    closeConnection().then(() => {
      console.log('Database connection closed')
      process.exit(0)
    })
  })
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...')
  server.close(() => {
    closeConnection().then(() => {
      console.log('Database connection closed')
      process.exit(0)
    })
  })
})
