import { Router, Request, Response } from 'express'
import { getDb } from '../db.js'
import { ObjectId } from 'mongodb'
import { authenticate, authorize, requireRole, auditAction } from '../middleware/auth.js'
import { Role, User, Permission, UserRole, PermissionRequest, AuditLog } from '../types.js'

const router = Router()

// Aplicar autenticação em todas as rotas
router.use(authenticate)

// ============================================
// ROLES / PAPEIS
// ============================================

/**
 * Listar todos os papéis disponíveis
 */
router.get('/roles', authorize('privilegios', 'read'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const roles = await db.collection<Role>('roles')
      .find({})
      .sort({ level: -1 })
      .toArray()

    res.json({ roles })
  } catch (error: any) {
    console.error('Error listing roles:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Obter um papel específico com permissões detalhadas
 */
router.get('/roles/:id', authorize('privilegios', 'read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()

    const role = await db.collection<Role>('roles').findOne({ id })
    if (!role) {
      return res.status(404).json({ error: 'Papel não encontrado' })
    }

    // Se herda de outro papel, buscar as permissões herdadas
    let inheritedPermissions: Permission[] = []
    if (role.inheritsFrom) {
      const parentRole = await db.collection<Role>('roles').findOne({ id: role.inheritsFrom })
      if (parentRole) {
        inheritedPermissions = parentRole.permissions
      }
    }

    res.json({ 
      role,
      effectivePermissions: [...inheritedPermissions, ...role.permissions]
    })
  } catch (error: any) {
    console.error('Error getting role:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Criar novo papel (apenas super_admin e admin)
 */
router.post('/roles', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const { name, description, level, permissions, inheritsFrom } = req.body

    if (!name || !permissions) {
      return res.status(400).json({ error: 'Nome e permissões são obrigatórios' })
    }

    // Verificar se já existe um papel com este nome
    const existing = await db.collection<Role>('roles').findOne({ name })
    if (existing) {
      return res.status(400).json({ error: 'Já existe um papel com este nome' })
    }

    const role: Role = {
      id: new ObjectId().toString(),
      name,
      description: description || '',
      level: level || 10,
      permissions,
      inheritsFrom,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.collection('roles').insertOne(role as any)
    
    await auditAction(req, 'create', 'privilegios', role.id, { roleName: name })

    res.status(201).json({ role })
  } catch (error: any) {
    console.error('Error creating role:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Atualizar papel existente
 */
router.put('/roles/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()
    const { name, description, level, permissions, inheritsFrom } = req.body

    const existingRole = await db.collection<Role>('roles').findOne({ id })
    if (!existingRole) {
      return res.status(404).json({ error: 'Papel não encontrado' })
    }

    // Não permitir modificar papéis do sistema
    if (existingRole.isSystem) {
      return res.status(400).json({ error: 'Papéis do sistema não podem ser modificados' })
    }

    const updateData: Partial<Role> = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(level !== undefined && { level }),
      ...(permissions && { permissions }),
      ...(inheritsFrom !== undefined && { inheritsFrom }),
      updatedAt: new Date()
    }

    await db.collection('roles').updateOne(
      { id },
      { $set: updateData }
    )

    const updated = await db.collection<Role>('roles').findOne({ id })
    
    await auditAction(req, 'update', 'privilegios', id, { changes: updateData })

    res.json({ role: updated })
  } catch (error: any) {
    console.error('Error updating role:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Excluir papel
 */
router.delete('/roles/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()

    const role = await db.collection<Role>('roles').findOne({ id })
    if (!role) {
      return res.status(404).json({ error: 'Papel não encontrado' })
    }

    if (role.isSystem) {
      return res.status(400).json({ error: 'Papéis do sistema não podem ser excluídos' })
    }

    // Verificar se há usuários com este papel
    const usersWithRole = await db.collection('users').countDocuments({ role: id })
    if (usersWithRole > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir',
        message: `Existem ${usersWithRole} usuários com este papel. Altere o papel deles primeiro.`
      })
    }

    await db.collection('roles').deleteOne({ id })
    
    await auditAction(req, 'delete', 'privilegios', id, { roleName: role.name })

    res.json({ message: 'Papel excluído com sucesso' })
  } catch (error: any) {
    console.error('Error deleting role:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// USUÁRIOS E PERMISSÕES
// ============================================

/**
 * Listar usuários com seus papéis e permissões
 */
router.get('/usuarios', authorize('usuarios', 'read'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const { role, isActive, search } = req.query

    const query: any = {}
    if (role) query.role = role
    if (isActive !== undefined) query.isActive = isActive === 'true'
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    const users = await db.collection('users')
      .find(query, { projection: { password: 0 } })
      .sort({ name: 1 })
      .toArray()

    // Buscar nomes dos papéis
    const roles = await db.collection('roles').find({}).toArray()
    const roleMap = new Map(roles.map((r: any) => [r.id, r.name]))

    const usersWithRoles = users.map((u: any) => ({
      ...u,
      roleName: roleMap.get(u.role) || u.role
    }))

    res.json({ users: usersWithRoles })
  } catch (error: any) {
    console.error('Error listing users:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Obter detalhes de um usuário com todas as permissões efetivas
 */
router.get('/usuarios/:id', authorize('usuarios', 'read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const db = await getDb()

    let user = null
    if (ObjectId.isValid(id)) {
      user = await db.collection('users').findOne(
        { _id: new ObjectId(id) },
        { projection: { password: 0 } }
      )
    }
    if (!user) {
      user = await db.collection('users').findOne(
        { id },
        { projection: { password: 0 } }
      )
    }

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    // Buscar papel e permissões
    const role = await db.collection<Role>('roles').findOne({ id: user.role })
    
    res.json({ 
      user,
      role,
      effectivePermissions: [
        ...(role?.permissions || []),
        ...(user.customPermissions || [])
      ]
    })
  } catch (error: any) {
    console.error('Error getting user:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Atualizar papel de um usuário
 */
router.patch('/usuarios/:id/role', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { role: newRole } = req.body
    const db = await getDb()

    if (!newRole) {
      return res.status(400).json({ error: 'Novo papel é obrigatório' })
    }

    // Verificar se o papel existe
    const roleExists = await db.collection('roles').findOne({ id: newRole })
    if (!roleExists) {
      return res.status(400).json({ error: 'Papel não encontrado' })
    }

    const user = await db.collection('users').findOne({ _id: new ObjectId(id) })
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    const oldRole = user.role

    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { role: newRole, updatedAt: new Date() } }
    )

    await auditAction(req, 'change_role', 'usuarios', id, { 
      oldRole, 
      newRole 
    })

    res.json({ message: 'Papel atualizado com sucesso' })
  } catch (error: any) {
    console.error('Error updating user role:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Adicionar permissões customizadas a um usuário
 */
router.post('/usuarios/:id/permissions', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { permissions } = req.body
    const db = await getDb()

    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissões inválidas' })
    }

    // Try to find by ObjectId or string id
    let user: any = null
    if (ObjectId.isValid(id)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(id) })
    }
    if (!user) {
      user = await db.collection('users').findOne({ id })
    }
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    const existingPermissions = user.customPermissions || []
    const newPermissions = [...existingPermissions, ...permissions]

    // Update using the same query that found the user
    const updateQuery = user._id ? { _id: new ObjectId(user._id) } : { id }
    await db.collection('users').updateOne(
      updateQuery,
      { $set: { customPermissions: newPermissions, updatedAt: new Date() } }
    )

    await auditAction(req, 'add_permissions', 'usuarios', id, { 
      addedPermissions: permissions 
    })

    res.json({ message: 'Permissões adicionadas com sucesso' })
  } catch (error: any) {
    console.error('Error adding permissions:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Remover permissões customizadas de um usuário
 */
router.delete('/usuarios/:id/permissions', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { permissions } = req.body
    const db = await getDb()

    // Try to find by ObjectId or string id
    let user: any = null
    if (ObjectId.isValid(id)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(id) })
    }
    if (!user) {
      user = await db.collection('users').findOne({ id })
    }
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    const existingPermissions = user.customPermissions || []
    const filteredPermissions = existingPermissions.filter((p: Permission) => 
      !permissions.some((rp: Permission) => rp.resource === p.resource && rp.action === p.action)
    )

    // Update using the same query that found the user
    const updateQuery = user._id ? { _id: new ObjectId(user._id) } : { id }
    await db.collection('users').updateOne(
      updateQuery,
      { $set: { customPermissions: filteredPermissions, updatedAt: new Date() } }
    )

    await auditAction(req, 'remove_permissions', 'usuarios', id, { 
      removedPermissions: permissions 
    })

    res.json({ message: 'Permissões removidas com sucesso' })
  } catch (error: any) {
    console.error('Error removing permissions:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Adicionar restrição a um usuário
 */
router.post('/usuarios/:id/restrictions', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const restriction = req.body
    const db = await getDb()

    // Try to find by ObjectId or string id
    let user: any = null
    if (ObjectId.isValid(id)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(id) })
    }
    if (!user) {
      user = await db.collection('users').findOne({ id })
    }
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    const newRestriction = {
      ...restriction,
      appliedBy: req.user!._id || req.user!.id,
      appliedAt: new Date()
    }

    // Update using the same query that found the user
    const updateQuery = user._id ? { _id: new ObjectId(user._id) } : { id }
    await db.collection('users').updateOne(
      updateQuery,
      { 
        $push: { restrictions: newRestriction },
        $set: { updatedAt: new Date() }
      }
    )

    await auditAction(req, 'add_restriction', 'usuarios', id, { restriction: newRestriction })

    res.json({ message: 'Restrição adicionada com sucesso' })
  } catch (error: any) {
    console.error('Error adding restriction:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Remover restrição de um usuário
 */
router.delete('/usuarios/:id/restrictions/:index', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id, index } = req.params
    const db = await getDb()

    // Try to find by ObjectId or string id
    let user: any = null
    if (ObjectId.isValid(id)) {
      user = await db.collection('users').findOne({ _id: new ObjectId(id) })
    }
    if (!user) {
      user = await db.collection('users').findOne({ id })
    }
    
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    const restrictions = user.restrictions || []
    const removedRestriction = restrictions[parseInt(index)]
    restrictions.splice(parseInt(index), 1)

    // Update using the same query that found the user
    const updateQuery = user._id ? { _id: new ObjectId(user._id) } : { id }
    await db.collection('users').updateOne(
      updateQuery,
      { 
        $set: { 
          restrictions,
          updatedAt: new Date() 
        }
      }
    )

    await auditAction(req, 'remove_restriction', 'usuarios', id, { removedRestriction })

    res.json({ message: 'Restrição removida com sucesso' })
  } catch (error: any) {
    console.error('Error removing restriction:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// SOLICITAÇÕES DE PERMISSÃO
// ============================================

/**
 * Listar solicitações de permissão
 */
router.get('/solicitacoes', authorize('privilegios', 'read'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const { status } = req.query

    const query: any = {}
    if (status) query.status = status

    const solicitacoes = await db.collection<PermissionRequest>('permission_requests')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray()

    res.json({ solicitacoes })
  } catch (error: any) {
    console.error('Error listing permission requests:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Criar solicitação de permissão
 */
router.post('/solicitacoes', async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const { requestedRole, requestedPermissions, reason } = req.body

    if (!reason) {
      return res.status(400).json({ error: 'Motivo é obrigatório' })
    }

    const solicitacao: PermissionRequest = {
      id: new ObjectId().toString(),
      requestedBy: req.user!._id || req.user!.id || '',
      requestedRole,
      requestedPermissions,
      reason,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.collection('permission_requests').insertOne(solicitacao as any)

    await auditAction(req, 'request_permission', 'privilegios', solicitacao.id, { 
      requestedRole, 
      reason 
    })

    res.status(201).json({ solicitacao })
  } catch (error: any) {
    console.error('Error creating permission request:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Aprovar/Rejeitar solicitação de permissão
 */
router.patch('/solicitacoes/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status, reviewNotes } = req.body as { status: string; reviewNotes?: string }
    const db = await getDb()

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' })
    }

    const solicitacao = await db.collection<PermissionRequest>('permission_requests').findOne({ id })
    if (!solicitacao) {
      return res.status(404).json({ error: 'Solicitação não encontrada' })
    }

    if (solicitacao.status !== 'pending') {
      return res.status(400).json({ error: 'Esta solicitação já foi processada' })
    }

    await db.collection('permission_requests').updateOne(
      { id },
      { 
        $set: { 
          status, 
          reviewedBy: req.user!._id,
          reviewedAt: new Date(),
          reviewNotes,
          updatedAt: new Date()
        }
      }
    )

    // Se aprovado, aplicar as permissões
    if (status === 'approved') {
      if (solicitacao.requestedRole) {
        await db.collection('users').updateOne(
          { _id: solicitacao.requestedBy } as any,
          { $set: { role: solicitacao.requestedRole, updatedAt: new Date() } }
        )
      } else if (solicitacao.requestedPermissions) {
        await db.collection('users').updateOne(
          { _id: solicitacao.requestedBy } as any,
          { 
            $push: { customPermissions: { $each: solicitacao.requestedPermissions } } as any,
            $set: { updatedAt: new Date() }
          }
        )
      }
    }

    await auditAction(req, `permission_${status}`, 'privilegios', id, { reviewNotes })

    res.json({ message: `Solicitação ${status === 'approved' ? 'aprovada' : 'rejeitada'}` })
  } catch (error: any) {
    console.error('Error processing permission request:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// LOGS DE AUDITORIA
// ============================================

/**
 * Listar logs de auditoria
 */
router.get('/audit', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const { userId, action, resource, startDate, endDate, limit } = req.query

    const query: any = {}
    if (userId) query.userId = userId
    if (action) query.action = action
    if (resource) query.resource = resource
    if (startDate || endDate) {
      query.timestamp = {}
      const startDateStr = Array.isArray(startDate) ? startDate[0] : startDate
      const endDateStr = Array.isArray(endDate) ? endDate[0] : endDate
      if (startDateStr) query.timestamp.$gte = new Date(startDateStr.toString())
      if (endDateStr) query.timestamp.$lte = new Date(endDateStr.toString())
    }

    const limitStr = Array.isArray(limit) ? limit[0] : limit
    const limitNum = limitStr ? parseInt(limitStr.toString()) : 100

    const logs = await db.collection<AuditLog>('audit_logs')
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limitNum)
      .toArray()

    res.json({ logs })
  } catch (error: any) {
    console.error('Error listing audit logs:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Obter estatísticas de auditoria
 */
router.get('/audit/stats', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const db = await getDb()
    const { startDate, endDate } = req.query

    const matchStage: any = {}
    if (startDate || endDate) {
      matchStage.timestamp = {}
      const startDateStr = Array.isArray(startDate) ? startDate[0] : startDate
      const endDateStr = Array.isArray(endDate) ? endDate[0] : endDate
      if (startDateStr) matchStage.timestamp.$gte = new Date(startDateStr.toString())
      if (endDateStr) matchStage.timestamp.$lte = new Date(endDateStr.toString())
    }

    const [byAction, byResource, byUser] = await Promise.all([
      db.collection('audit_logs').aggregate([
        { $match: matchStage },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray(),
      db.collection('audit_logs').aggregate([
        { $match: matchStage },
        { $group: { _id: '$resource', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray(),
      db.collection('audit_logs').aggregate([
        { $match: matchStage },
        { $group: { _id: '$userName', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]).toArray()
    ])

    res.json({ byAction, byResource, byUser })
  } catch (error: any) {
    console.error('Error getting audit stats:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// VERIFICAÇÃO DE PERMISSÕES
// ============================================

/**
 * Verificar se o usuário atual tem uma permissão específica
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const { resource, action } = req.body
    const user = req.user
    const role = req.userRole

    if (!user) {
      return res.status(401).json({ hasPermission: false })
    }

    // Super admin tem todas as permissões
    if (user.role === 'super_admin') {
      return res.json({ hasPermission: true })
    }

    const allPermissions = [
      ...(role?.permissions || []),
      ...(user.customPermissions || [])
    ]

    const hasPermission = allPermissions.some(p => 
      (p.resource === resource && (p.action === action || p.action === 'manage'))
    )

    res.json({ hasPermission })
  } catch (error: any) {
    console.error('Error checking permission:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Obter todas as permissões do usuário atual
 */
router.get('/minhas-permissoes', async (req: Request, res: Response) => {
  try {
    const user = req.user
    const role = req.userRole

    if (!user) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    res.json({
      role: {
        id: role?.id,
        name: role?.name,
        level: role?.level
      },
      permissions: [
        ...(role?.permissions || []),
        ...(user.customPermissions || [])
      ],
      restrictions: user.restrictions || [],
      managedGroups: user.managedGroups || []
    })
  } catch (error: any) {
    console.error('Error getting user permissions:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
