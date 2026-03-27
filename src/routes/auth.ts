import { Router, Request, Response } from 'express'
import { getDb } from '../db.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User, Role } from '../types.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key'

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' })
    }

    const db = await getDb()
    const user = await db.collection<User>('users').findOne({ email })

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    // Verificar se a conta está ativa
    if (!user.isActive) {
      return res.status(403).json({ error: 'Conta inativa. Entre em contato com o administrador.' })
    }

    // Verificar se a conta está bloqueada
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingTime = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000)
      return res.status(403).json({ 
        error: 'Conta bloqueada',
        message: `Tente novamente em ${remainingTime} minutos`
      })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      // Incrementar tentativas falhas
      const failedAttempts = (user.failedLoginAttempts || 0) + 1
      const updateData: any = { failedLoginAttempts: failedAttempts }

      // Bloquear após 5 tentativas
      if (failedAttempts >= 5) {
        const lockUntil = new Date(Date.now() + 30 * 60 * 1000) // 30 minutos
        updateData.lockedUntil = lockUntil
        const updateQuery: any = user._id ? { _id: user._id } : { id: user.id }
        await db.collection('users').updateOne(
          updateQuery,
          { $set: updateData }
        )
        return res.status(403).json({ 
          error: 'Conta bloqueada',
          message: 'Muitas tentativas falhas. Tente novamente em 30 minutos.'
        })
      }

      const updateQuery: any = user._id ? { _id: user._id } : { id: user.id }
      await db.collection('users').updateOne(
        updateQuery,
        { $set: updateData }
      )

      return res.status(401).json({ 
        error: 'Credenciais inválidas',
        attemptsRemaining: 5 - failedAttempts
      })
    }

    // Reset tentativas falhas e atualizar último login
    const updateQuery: any = user._id ? { _id: user._id } : { id: user.id }
    await db.collection('users').updateOne(
      updateQuery,
      { 
        $set: { 
          failedLoginAttempts: 0, 
          lockedUntil: null,
          lastLogin: new Date() 
        } 
      }
    )

    // Buscar papel do usuário
    const role = await db.collection<Role>('roles').findOne({ id: user.role })

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleName: role?.name || user.role,
        privilegioServico: user.privilegioServico,
        designacoesEspeciais: user.designacoesEspeciais || []
      }
    })
  } catch (error: any) {
    console.error('Login error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Verify token
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string }

    const db = await getDb()
    const user = await db.collection<User>('users').findOne({ _id: decoded.id as any })

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' })
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Usuário inativo' })
    }

    // Buscar papel do usuário
    const role = await db.collection<Role>('roles').findOne({ id: user.role })

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleName: role?.name || user.role,
        privilegioServico: user.privilegioServico,
        designacoesEspeciais: user.designacoesEspeciais || [],
        preferences: user.preferences
      }
    })
  } catch (error: any) {
    res.status(401).json({ error: 'Token inválido' })
  }
})

// Alterar senha
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string }

    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' })
    }

    const db = await getDb()
    const user = await db.collection<User>('users').findOne({ _id: decoded.id as any })

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' })
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return res.status(400).json({ error: 'Senha atual incorreta' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    const updateQuery: any = user._id ? { _id: user._id } : { id: user.id }
    await db.collection('users').updateOne(
      updateQuery,
      { 
        $set: { 
          password: hashedPassword,
          passwordChangedAt: new Date(),
          updatedAt: new Date()
        } 
      }
    )

    res.json({ message: 'Senha alterada com sucesso' })
  } catch (error: any) {
    console.error('Change password error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Atualizar preferências do usuário
router.patch('/preferences', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string }

    const db = await getDb()
    const user = await db.collection<User>('users').findOne({ _id: decoded.id as any })

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' })
    }

    const { notifications, dashboard, language, theme, timezone } = req.body

    const currentPreferences = user.preferences || {}
    const currentNotifications = (currentPreferences as any).notifications || {}
    const currentDashboard = (currentPreferences as any).dashboard || {}
    
    const updatedPreferences = {
      ...currentPreferences,
      ...(language && { language }),
      ...(theme && { theme }),
      ...(timezone && { timezone }),
      ...(notifications && { notifications: { ...currentNotifications, ...notifications } }),
      ...(dashboard && { dashboard: { ...currentDashboard, ...dashboard } })
    }

    const updateQuery: any = user._id ? { _id: user._id } : { id: user.id }
    await db.collection('users').updateOne(
      updateQuery,
      { 
        $set: { 
          preferences: updatedPreferences,
          updatedAt: new Date()
        } 
      }
    )

    res.json({ 
      message: 'Preferências atualizadas',
      preferences: updatedPreferences 
    })
  } catch (error: any) {
    console.error('Update preferences error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Registrar primeiro usuário (super_admin) - apenas se não houver usuários
router.post('/setup', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    
    // Verificar se já existem usuários
    const existingUsers = await db.collection('users').countDocuments()
    if (existingUsers > 0) {
      return res.status(400).json({ error: 'Já existem usuários cadastrados' })
    }

    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, senha e nome são obrigatórios' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user: any = {
      _id: new (await import('mongodb')).ObjectId().toString(),
      email,
      password: hashedPassword,
      name,
      role: 'super_admin',
      privilegioServico: 'nenhum',
      designacoesEspeciais: [],
      customPermissions: [],
      restrictions: [],
      managedGroups: [],
      isActive: true,
      failedLoginAttempts: 0,
      preferences: {
        language: 'pt',
        timezone: 'Europe/Lisbon',
        theme: 'auto',
        notifications: {
          email: true,
          sms: false,
          whatsapp: false,
          newAssignment: true,
          assignmentReminder: true,
          absenceApproved: true,
          weeklySchedule: true,
          reminderDays: 2
        },
        dashboard: {
          defaultView: 'week',
          showWeekend: true,
          showMidweek: true,
          showCleaning: true,
          showPublicWitnessing: true
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.collection('users').insertOne(user)

    // Criar roles padrão se não existirem
    await createDefaultRoles(db)

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'Usuário administrador criado com sucesso',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error: any) {
    console.error('Setup error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Função para criar roles padrão
async function createDefaultRoles(db: any) {
  const rolesCount = await db.collection('roles').countDocuments()
  
  if (rolesCount > 0) return

  const defaultRoles = [
    {
      id: 'super_admin',
      name: 'Super Administrador',
      description: 'Acesso total ao sistema, pode gerenciar todos os aspectos',
      level: 100,
      permissions: [
        { resource: 'publicadores', action: 'manage' },
        { resource: 'designacoes', action: 'manage' },
        { resource: 'ausencias', action: 'manage' },
        { resource: 'semanas', action: 'manage' },
        { resource: 'etiquetas', action: 'manage' },
        { resource: 'configuracoes', action: 'manage' },
        { resource: 'usuarios', action: 'manage' },
        { resource: 'privilegios', action: 'manage' },
        { resource: 'relatorios', action: 'manage' },
        { resource: 'notificacoes', action: 'manage' },
        { resource: 'limpeza', action: 'manage' },
        { resource: 'testemunho_publico', action: 'manage' },
        { resource: 'av_indicadores', action: 'manage' }
      ],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'admin',
      name: 'Administrador',
      description: 'Administrador da congregação com acesso amplo ao sistema',
      level: 90,
      permissions: [
        { resource: 'publicadores', action: 'manage' },
        { resource: 'designacoes', action: 'manage' },
        { resource: 'ausencias', action: 'manage' },
        { resource: 'semanas', action: 'manage' },
        { resource: 'etiquetas', action: 'manage' },
        { resource: 'configuracoes', action: 'manage' },
        { resource: 'usuarios', action: 'read' },
        { resource: 'privilegios', action: 'read' },
        { resource: 'relatorios', action: 'manage' },
        { resource: 'notificacoes', action: 'manage' },
        { resource: 'limpeza', action: 'manage' },
        { resource: 'testemunho_publico', action: 'manage' },
        { resource: 'av_indicadores', action: 'manage' }
      ],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'anciao',
      name: 'Ancião',
      description: 'Ancião (presbítero) com acesso a funções administrativas da congregação',
      level: 70,
      permissions: [
        { resource: 'publicadores', action: 'read' },
        { resource: 'publicadores', action: 'update' },
        { resource: 'designacoes', action: 'read' },
        { resource: 'designacoes', action: 'create' },
        { resource: 'designacoes', action: 'update' },
        { resource: 'ausencias', action: 'read' },
        { resource: 'ausencias', action: 'approve' },
        { resource: 'semanas', action: 'read' },
        { resource: 'semanas', action: 'update' },
        { resource: 'relatorios', action: 'read' },
        { resource: 'relatorios', action: 'export' }
      ],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'servo_ministerial',
      name: 'Servo Ministerial',
      description: 'Servo ministerial (diácono) com acesso a funções de apoio',
      level: 50,
      permissions: [
        { resource: 'publicadores', action: 'read' },
        { resource: 'designacoes', action: 'read' },
        { resource: 'designacoes', action: 'create' },
        { resource: 'designacoes', action: 'update' },
        { resource: 'ausencias', action: 'read' },
        { resource: 'semanas', action: 'read' },
        { resource: 'relatorios', action: 'read' }
      ],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'publicador',
      name: 'Publicador',
      description: 'Publicador batizado com acesso básico ao sistema',
      level: 30,
      permissions: [
        { resource: 'designacoes', action: 'view_own' },
        { resource: 'designacoes', action: 'read' },
        { resource: 'ausencias', action: 'create' },
        { resource: 'ausencias', action: 'view_own' },
        { resource: 'ausencias', action: 'edit_own' },
        { resource: 'semanas', action: 'read' }
      ],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'publicador_nao_batizado',
      name: 'Publicador Não Batizado',
      description: 'Publicador não batizado com acesso limitado',
      level: 20,
      permissions: [
        { resource: 'designacoes', action: 'view_own' },
        { resource: 'ausencias', action: 'view_own' },
        { resource: 'ausencias', action: 'edit_own' },
        { resource: 'semanas', action: 'read' }
      ],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'convidado',
      name: 'Convidado',
      description: 'Acesso de visualização apenas',
      level: 10,
      permissions: [
        { resource: 'semanas', action: 'read' }
      ],
      isSystem: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]

  await db.collection('roles').insertMany(defaultRoles)
}

export default router
