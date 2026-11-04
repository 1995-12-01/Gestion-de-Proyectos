import { UserRole, ProjectStatus, ProjectType } from '@prisma/client'

// Definición de permisos por rol
export const PERMISSIONS = {
  // Proyectos
  PROJECT_CREATE: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],
  PROJECT_READ: ['ADMIN', 'PROJECT_MANAGER', 'SUPPLIER', 'AUDITOR'] as UserRole[],
  PROJECT_UPDATE: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],
  PROJECT_DELETE: ['ADMIN'] as UserRole[],
  PROJECT_APPROVE: ['ADMIN'] as UserRole[],
  PROJECT_CHANGE_STATUS: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],

  // Fases y Desembolsos
  PHASE_CREATE: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],
  PHASE_UPDATE: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],
  DISBURSEMENT_CREATE: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],
  DISBURSEMENT_APPROVE: ['ADMIN'] as UserRole[],

  // Presupuesto y Rubros
  BUDGET_CREATE: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],
  BUDGET_UPDATE: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],
  BUDGET_ITEM_CREATE: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],
  BUDGET_ITEM_UPDATE: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],

  // Cronograma
  SCHEDULE_CREATE: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],
  SCHEDULE_UPDATE: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],
  SCHEDULE_READ: ['ADMIN', 'PROJECT_MANAGER', 'SUPPLIER', 'AUDITOR'] as UserRole[],

  // Entregables
  DELIVERABLE_CREATE: ['ADMIN', 'PROJECT_MANAGER', 'SUPPLIER'] as UserRole[],
  DELIVERABLE_UPDATE: ['ADMIN', 'PROJECT_MANAGER', 'SUPPLIER'] as UserRole[],
  DELIVERABLE_REVIEW: ['ADMIN', 'PROJECT_MANAGER', 'AUDITOR'] as UserRole[],
  DELIVERABLE_APPROVE: ['ADMIN', 'PROJECT_MANAGER', 'AUDITOR'] as UserRole[],

  // Proveedores
  SUPPLIER_CREATE: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],
  SUPPLIER_UPDATE: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],
  SUPPLIER_READ: ['ADMIN', 'PROJECT_MANAGER', 'AUDITOR'] as UserRole[],
  SUPPLIER_ASSIGN: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],

  // Facturas
  INVOICE_CREATE: ['ADMIN', 'PROJECT_MANAGER', 'SUPPLIER'] as UserRole[],
  INVOICE_APPROVE: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],
  INVOICE_PAY: ['ADMIN'] as UserRole[],

  // Documentos
  DOCUMENT_UPLOAD: ['ADMIN', 'PROJECT_MANAGER', 'SUPPLIER'] as UserRole[],
  DOCUMENT_DELETE: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],

  // Reportes y Auditoría
  REPORTS_VIEW: ['ADMIN', 'PROJECT_MANAGER', 'AUDITOR'] as UserRole[],
  AUDIT_LOG_VIEW: ['ADMIN', 'AUDITOR'] as UserRole[],
  DASHBOARD_VIEW: ['ADMIN', 'PROJECT_MANAGER', 'AUDITOR'] as UserRole[],

  // Usuarios y Configuración
  USER_MANAGE: ['ADMIN'] as UserRole[],
  SYSTEM_CONFIG: ['ADMIN'] as UserRole[],
} as const

// Verificar si un rol tiene un permiso
export function hasPermission(role: UserRole, permission: keyof typeof PERMISSIONS): boolean {
  return PERMISSIONS[permission].includes(role)
}

// Verificar múltiples permisos (OR)
export function hasAnyPermission(role: UserRole, permissions: (keyof typeof PERMISSIONS)[]): boolean {
  return permissions.some(p => hasPermission(role, p))
}

// Verificar múltiples permisos (AND)
export function hasAllPermissions(role: UserRole, permissions: (keyof typeof PERMISSIONS)[]): boolean {
  return permissions.every(p => hasPermission(role, p))
}

// Permisos basados en ownership (propietario del proyecto)
export function canManageProject(
  userRole: UserRole,
  userId: string,
  projectManagerId: string,
  projectCreatorId: string
): boolean {
  if (userRole === 'ADMIN') return true
  if (userRole === 'PROJECT_MANAGER') {
    return userId === projectManagerId || userId === projectCreatorId
  }
  return false
}

export function canViewProject(
  userRole: UserRole,
  userId: string,
  projectManagerId: string,
  projectCreatorId: string,
  projectSuppliers: string[]
): boolean {
  if (['ADMIN', 'AUDITOR'].includes(userRole)) return true
  if (userRole === 'PROJECT_MANAGER') {
    return userId === projectManagerId || userId === projectCreatorId
  }
  if (userRole === 'SUPPLIER') {
    return projectSuppliers.includes(userId)
  }
  return false
}

// Transiciones de estado válidas por rol
export const STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED', 'DRAFT'],
  APPROVED: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: ['DRAFT'],
}

export function canTransitionStatus(
  currentStatus: ProjectStatus,
  newStatus: ProjectStatus,
  userRole: UserRole
): boolean {
  if (userRole === 'ADMIN') return true
  const allowed = STATUS_TRANSITIONS[currentStatus] || []
  return allowed.includes(newStatus)
}

// Configuración de campos visibles por rol
export const FIELD_VISIBILITY = {
  // Campos financieros sensibles
  FINANCIAL_FIELDS: ['ADMIN', 'PROJECT_MANAGER', 'AUDITOR'] as UserRole[],
  // Información de proveedores
  SUPPLIER_INFO: ['ADMIN', 'PROJECT_MANAGER'] as UserRole[],
  // Auditoría
  AUDIT_FIELDS: ['ADMIN', 'AUDITOR'] as UserRole[],
}

export function canViewField(userRole: UserRole, fieldCategory: keyof typeof FIELD_VISIBILITY): boolean {
  return FIELD_VISIBILITY[fieldCategory].includes(userRole)
}

// Rutas permitidas por rol
export const ALLOWED_ROUTES: Record<UserRole, string[]> = {
  ADMIN: ['*'], // Acceso total
  PROJECT_MANAGER: [
    '/dashboard',
    '/projects',
    '/projects/*',
    '/schedule',
    '/deliverables',
    '/budget',
    '/suppliers',
    '/reports',
    '/documents',
    '/profile',
  ],
  SUPPLIER: [
    '/dashboard',
    '/projects',
    '/projects/*',
    '/schedule',
    '/deliverables',
    '/deliverables/*',
    '/invoices',
    '/documents',
    '/profile',
  ],
  AUDITOR: [
    '/dashboard',
    '/projects',
    '/projects/*',
    '/schedule',
    '/deliverables',
    '/budget',
    '/suppliers',
    '/reports',
    '/audit',
    '/documents',
    '/profile',
  ],
}

export function canAccessRoute(userRole: UserRole, route: string): boolean {
  const allowed = ALLOWED_ROUTES[userRole]
  if (allowed.includes('*')) return true
  return allowed.some(pattern => {
    if (pattern.endsWith('*')) {
      return route.startsWith(pattern.slice(0, -1))
    }
    return route === pattern
  })
}