import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'
import { getDb } from '../db.js'
import { User, Role, Permission, Resource, Action, UserRole } from '../types.js'

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key'

// Estender a interface Request para incluir o usuário
declare global {
  namespace Express {
    interface Request {
      user?: User
      userRole?: Role
    }
  }
}

/**
 * Middleware para verificar se o usuário está autenticado
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string }

    const db = await getDb()
    
    // Tentar encontrar por _id como ObjectId ou como string
    let user
    if (ObjectId.isValid(decoded.id)) {
      user = await db.collection<User>('users').findOne({ _id: new ObjectId(decoded.id) })
    }
    if (!user) {
      user = await db.collection<User>('users').findOne({ _id: decoded.id as any })
    }

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' })
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Usuário inativo' })
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return res.status(403).json({ error: 'Conta temporariamente bloqueada' })
    }

    // Buscar o papel/role do usuário
    const role = await db.collection<Role>('roles').findOne({ id: user.role })
    
    req.user = user
    req.userRole = role || undefined
    
    next()
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' })
    }
    return res.status(401).json({ error: 'Token inválido' })
  }
}

/**
 * Verifica se o usuário tem uma permissão específica
 */
function hasPermission(
  user: User, 
  role: Role | undefined, 
  resource: Resource, 
  action: Action
): boolean {
  // Super admin tem todas as permissões
  if (user.role === 'super_admin') {
    return true
  }

  // Coletar todas as permissões (do papel + customizadas)
  const allPermissions: Permission[] = [
    ...(role?.permissions || []),
    ...(user.customPermissions || [])
  ]

  // Verificar se tem a permissão específica ou a permissão 'manage'
  return allPermissions.some(p => 
    p.resource === resource && (p.action === action || p.action === 'manage')
  )
}

/**
 * Verifica se há restrições que bloqueiam a ação
 */
function hasRestriction(
  user: User,
  resource: Resource,
  action: Action
): boolean {
  const now = new Date()
  
  return user.restrictions?.some(r => {
    // Verificar se a restrição expirou
    if (r.expiresAt && new Date(r.expiresAt) < now) {
      return false
    }

    // Restrição baseada em recurso
    if (r.type === 'resource_based' && r.resource === resource) {
      return true
    }

    // Restrição baseada em ação
    if (r.type === 'action_based' && r.resource === resource && r.action === action) {
      return true
    }

    // Restrição baseada em tempo
    if (r.type === 'time_based' && r.startTime && r.endTime) {
      const currentTime = now.toTimeString().slice(0, 5)
      if (currentTime >= r.startTime && currentTime <= r.endTime) {
        return true
      }
    }

    return false
  }) || false
}

/**
 * Factory para criar middleware de autorização
 */
export function authorize(resource: Resource, action: Action) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user
      const role = req.userRole

      if (!user) {
        return res.status(401).json({ error: 'Usuário não autenticado' })
      }

      // Verificar se tem a permissão
      if (!hasPermission(user, role, resource, action)) {
        // Registrar tentativa de acesso negado
        await logAudit(user, 'access_denied', resource, {
          attemptedAction: action,
          path: req.path
        }, req)

        return res.status(403).json({ 
          error: 'Acesso negado',
          message: `Você não tem permissão para ${action} em ${resource}`
        })
      }

      // Verificar restrições
      if (hasRestriction(user, resource, action)) {
        await logAudit(user, 'restriction_applied', resource, {
          attemptedAction: action,
          path: req.path
        }, req)

        return res.status(403).json({ 
          error: 'Ação restrita',
          message: 'Você tem uma restrição ativa para esta ação'
        })
      }

      next()
    } catch (error: any) {
      console.error('Authorization error:', error)
      return res.status(500).json({ error: 'Erro na verificação de permissões' })
    }
  }
}

/**
 * Middleware para verificar se o usuário tem um papel mínimo
 */
export function requireRole(minimumRole: UserRole) {
  const roleHierarchy: Record<UserRole, number> = {
    'super_admin': 100,
    'admin': 90,
    'anciao': 70,
    'servo_ministerial': 50,
    'publicador': 30,
    'publicador_nao_batizado': 20,
    'convidado': 10
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user

      if (!user) {
        return res.status(401).json({ error: 'Usuário não autenticado' })
      }

      const userLevel = roleHierarchy[user.role] || 0
      const requiredLevel = roleHierarchy[minimumRole] || 0

      if (userLevel < requiredLevel) {
        return res.status(403).json({ 
          error: 'Papel insuficiente',
          message: `Esta ação requer o papel ${minimumRole} ou superior`
        })
      }

      next()
    } catch (error: any) {
      console.error('Role check error:', error)
      return res.status(500).json({ error: 'Erro na verificação de papel' })
    }
  }
}

/**
 * Middleware para verificar se o usuário está acessando seus próprios dados
 * ou tem permissão para acessar dados de outros
 */
export function authorizeOwnOrPermission(resource: Resource, action: Action, userIdParam: string = 'id') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user
      const role = req.userRole
      const targetId = req.params[userIdParam]

      if (!user) {
        return res.status(401).json({ error: 'Usuário não autenticado' })
      }

      // Se está acessando seus próprios dados
      if (targetId === user._id || targetId === user.publicadorId) {
        return next()
      }

      // Se está acessando dados de outro usuário, precisa de permissão
      if (!hasPermission(user, role, resource, action)) {
        return res.status(403).json({ 
          error: 'Acesso negado',
          message: 'Você não tem permissão para acessar dados de outros usuários'
        })
      }

      next()
    } catch (error: any) {
      console.error('Own/Permission check error:', error)
      return res.status(500).json({ error: 'Erro na verificação de permissões' })
    }
  }
}

/**
 * Middleware opcional - extrai o usuário se autenticado, mas não bloqueia
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return next()
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string }

    const db = await getDb()
    
    let user
    if (ObjectId.isValid(decoded.id)) {
      user = await db.collection<User>('users').findOne({ _id: new ObjectId(decoded.id) })
    }
    if (!user) {
      user = await db.collection<User>('users').findOne({ _id: decoded.id as any })
    }

    if (user && user.isActive) {
      const role = await db.collection<Role>('roles').findOne({ id: user.role })
      req.user = user
      req.userRole = role || undefined
    }

    next()
  } catch {
    // Ignora erros de token em auth opcional
    next()
  }
}

/**
 * Registra ação no log de auditoria
 */
async function logAudit(
  user: User,
  action: string,
  resource: Resource,
  details: Record<string, any>,
  req: Request
): Promise<void> {
  try {
    const db = await getDb()
    await db.collection('audit_logs').insertOne({
      id: new ObjectId().toString(),
      userId: user._id,
      userName: user.name,
      action,
      resource,
      details,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error logging audit:', error)
  }
}

/**
 * Função auxiliar para registrar ações auditadas
 */
export async function auditAction(
  req: Request,
  action: string,
  resource: Resource,
  resourceId?: string,
  details?: Record<string, any>
): Promise<void> {
  const user = req.user
  if (!user) return

  try {
    const db = await getDb()
    await db.collection('audit_logs').insertOne({
      id: new ObjectId().toString(),
      userId: user._id,
      userName: user.name,
      action,
      resource,
      resourceId,
      details: details || {},
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Error logging audit:', error)
  }
}

/**
 * Rate limiting por usuário
 */
const userRequestCounts = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user
    if (!user || (!user._id && !user.id)) return next()

    const now = Date.now()
    const key = user._id || user.id || ''
    const record = userRequestCounts.get(key)

    if (!record || now > record.resetTime) {
      userRequestCounts.set(key, { count: 1, resetTime: now + windowMs })
      return next()
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({ 
        error: 'Muitas requisições',
        message: 'Aguarde um momento antes de tentar novamente'
      })
    }

    record.count++
    next()
  }
}
