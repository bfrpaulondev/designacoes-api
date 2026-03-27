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

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err.message)
  res.status(500).json({ error: err.message })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
