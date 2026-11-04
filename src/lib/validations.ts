import { z } from 'zod'
import { ProjectType, ProjectStatus, BudgetItemType, PhaseStatus, DisbursementStatus, DeliverableStatus, ScheduleItemType, SupplierStatus, UserRole } from '@prisma/client'
import type {
  BudgetItem as BudgetItemModel,
  BudgetLine as BudgetLineModel,
  Deliverable as DeliverableModel,
  Project as ProjectModel,
  ProjectSupplier as ProjectSupplierModel,
  ScheduleItem as ScheduleItemModel,
  Supplier as SupplierModel,
} from '@prisma/client'

export { DeliverableStatus, ProjectStatus, ProjectType }

// ============================================
// ESQUEMAS BASE
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
})

export type PaginationParams = z.infer<typeof paginationSchema>

// ============================================
// USUARIOS
// ============================================

export const userCreateSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nombre muy corto').max(100).optional(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role: z.nativeEnum(UserRole).default(UserRole.PROJECT_MANAGER),
  phone: z.string().optional(),
  department: z.string().optional(),
})

export const userUpdateSchema = userCreateSchema.partial().omit({ password: true }).extend({
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
})

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type UserCreate = z.infer<typeof userCreateSchema>
export type UserUpdate = z.infer<typeof userUpdateSchema>
export type UserLogin = z.infer<typeof userLoginSchema>

// ============================================
// PROYECTOS
// ============================================

export const projectCreateSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres').max(200),
  description: z.string().optional(),
  type: z.nativeEnum(ProjectType),

  // Fechas
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  estimatedDuration: z.coerce.number().int().positive().optional(),

  // Presupuesto
  totalBudget: z.coerce.number().nonnegative().default(0),

  // Plan empresarial
  fiscalYear: z.coerce.number().int().min(2020).max(2050).optional(),
  authorizedAmount: z.coerce.number().nonnegative().optional(),
  authorizationNumber: z.string().optional(),
  authorizationDate: z.coerce.date().optional(),

  // Remodelación
  proposalNumber: z.string().optional(),
  proposalDate: z.coerce.date().optional(),
  proposalAmount: z.coerce.number().nonnegative().optional(),

  // Ubicación
  location: z.string().optional(),
  address: z.string().optional(),
  coordinates: z.string().optional(),

  // Asignación
  managerId: z.string().cuid(),
})

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  status: z.nativeEnum(ProjectStatus).optional(),
  executedBudget: z.coerce.number().nonnegative().optional(),
  committedBudget: z.coerce.number().nonnegative().optional(),
})

export const projectFilterSchema = paginationSchema.extend({
  type: z.nativeEnum(ProjectType).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  managerId: z.string().cuid().optional(),
  fiscalYear: z.coerce.number().int().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})

export type ProjectCreate = z.infer<typeof projectCreateSchema>
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>
export type ProjectFilter = z.infer<typeof projectFilterSchema>
export type Project = ProjectModel

// ============================================
// LÍNEAS PRESUPUESTARIAS (RUBROS)
// ============================================

export const budgetLineCreateSchema = z.object({
  projectId: z.string().cuid(),
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  type: z.nativeEnum(BudgetItemType),
  parentId: z.string().cuid().optional(),
  budgetedAmount: z.coerce.number().nonnegative().default(0),
  unit: z.string().optional(),
  quantity: z.coerce.number().nonnegative().optional(),
  unitPrice: z.coerce.number().nonnegative().optional(),
  order: z.coerce.number().int().default(0),
})

export const budgetLineUpdateSchema = budgetLineCreateSchema.partial().extend({
  committedAmount: z.coerce.number().nonnegative().optional(),
  executedAmount: z.coerce.number().nonnegative().optional(),
  pendingAmount: z.coerce.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
})

export type BudgetLineCreate = z.infer<typeof budgetLineCreateSchema>
export type BudgetLineUpdate = z.infer<typeof budgetLineUpdateSchema>
export type BudgetLine = BudgetLineModel & {
  children?: BudgetLine[]
  items?: BudgetItem[]
}

// ============================================
// ITEMS DE PRESUPUESTO (DETALLE)
// ============================================

export const budgetItemCreateSchema = z.object({
  budgetLineId: z.string().cuid(),
  supplierId: z.string().cuid().optional(),
  description: z.string().min(2).max(500),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
  totalPrice: z.coerce.number().nonnegative(),
  status: z.string().default('PENDING'),
  orderDate: z.coerce.date().optional(),
  deliveryDate: z.coerce.date().optional(),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.coerce.date().optional(),
  notes: z.string().optional(),
})

export type BudgetItemCreate = z.infer<typeof budgetItemCreateSchema>
export type BudgetItem = BudgetItemModel & {
  supplier?: SupplierModel | null
}

// ============================================
// FASES DEL PROYECTO
// ============================================

export const phaseCreateSchema = z.object({
  projectId: z.string().cuid(),
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  order: z.coerce.number().int().default(0),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  authorizedAmount: z.coerce.number().nonnegative().optional(),
  assigneeId: z.string().cuid().optional(),
})

export const phaseUpdateSchema = phaseCreateSchema.partial().extend({
  status: z.nativeEnum(PhaseStatus).optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
  disbursedAmount: z.coerce.number().nonnegative().optional(),
  disbursementNumber: z.coerce.number().int().optional(),
})

export type PhaseCreate = z.infer<typeof phaseCreateSchema>
export type PhaseUpdate = z.infer<typeof phaseUpdateSchema>

// ============================================
// DESEMBOLSOS
// ============================================

export const disbursementCreateSchema = z.object({
  phaseId: z.string().cuid(),
  number: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  description: z.string().optional(),
  documents: z.array(z.string().url()).default([]),
})

export const disbursementUpdateSchema = z.object({
  status: z.nativeEnum(DisbursementStatus).optional(),
  approvedDate: z.coerce.date().optional(),
  paidDate: z.coerce.date().optional(),
  approvedBy: z.string().cuid().optional(),
  notes: z.string().optional(),
})

export type DisbursementCreate = z.infer<typeof disbursementCreateSchema>
export type DisbursementUpdate = z.infer<typeof disbursementUpdateSchema>

// ============================================
// CRONOGRAMA
// ============================================

export const scheduleItemCreateSchema = z.object({
  projectId: z.string().cuid(),
  phaseId: z.string().cuid().optional(),
  parentId: z.string().cuid().optional(),
  name: z.string().min(2).max(300),
  description: z.string().optional(),
  type: z.nativeEnum(ScheduleItemType),
  plannedStart: z.coerce.date(),
  plannedEnd: z.coerce.date(),
  plannedDuration: z.coerce.number().int().positive(),
  dependencies: z.array(z.string().cuid()).default([]),
  assigneeId: z.string().cuid().optional(),
  supplierId: z.string().cuid().optional(),
  estimatedCost: z.coerce.number().nonnegative().optional(),
  isMilestone: z.boolean().default(false),
  isCriticalPath: z.boolean().default(false),
  order: z.coerce.number().int().default(0),
})

export const scheduleItemUpdateSchema = scheduleItemCreateSchema.partial().extend({
  actualStart: z.coerce.date().optional(),
  actualEnd: z.coerce.date().optional(),
  actualDuration: z.coerce.number().int().optional(),
  progress: z.coerce.number().min(0).max(100).default(0),
  status: z.string().default('NOT_STARTED'),
  actualCost: z.coerce.number().nonnegative().optional(),
})

export type ScheduleItemCreate = z.infer<typeof scheduleItemCreateSchema>
export type ScheduleItemUpdate = z.infer<typeof scheduleItemUpdateSchema>
export type ScheduleItem = ScheduleItemModel

// ============================================
// ENTREGABLES
// ============================================

export const deliverableCreateSchema = z.object({
  projectId: z.string().cuid(),
  scheduleItemId: z.string().cuid().optional(),
  name: z.string().min(2).max(300),
  description: z.string().optional(),
  type: z.string(),
  dueDate: z.coerce.date(),
  responsibleId: z.string().cuid().optional(),
  reviewerId: z.string().cuid().optional(),
  files: z.array(z.string().url()).default([]),
})

export const deliverableUpdateSchema = deliverableCreateSchema.partial().extend({
  status: z.nativeEnum(DeliverableStatus).optional(),
  submittedDate: z.coerce.date().optional(),
  reviewedDate: z.coerce.date().optional(),
  approvedDate: z.coerce.date().optional(),
  version: z.coerce.number().int().positive().default(1),
  comments: z.string().optional(),
  rejectionReason: z.string().optional(),
})

export const deliverableReviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'RESUBMITTED']),
  comments: z.string().optional(),
  rejectionReason: z.string().optional(),
})

export type DeliverableCreate = z.infer<typeof deliverableCreateSchema>
export type DeliverableUpdate = z.infer<typeof deliverableUpdateSchema>
export type DeliverableReview = z.infer<typeof deliverableReviewSchema>
export type Deliverable = DeliverableModel

// ============================================
// PROVEEDORES
// ============================================

export const supplierCreateSchema = z.object({
  companyName: z.string().min(2).max(200),
  taxId: z.string().min(5).max(20),
  contactName: z.string().min(2).max(100),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(9).max(20),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('España'),
  bankAccount: z.string().optional(),
  specialties: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  notes: z.string().optional(),
  userId: z.string().cuid().optional(),
})

export const supplierUpdateSchema = supplierCreateSchema.partial().extend({
  status: z.nativeEnum(SupplierStatus).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
})

export type SupplierCreate = z.infer<typeof supplierCreateSchema>
export type SupplierUpdate = z.infer<typeof supplierUpdateSchema>
export type Supplier = SupplierModel

// ============================================
// PROYECTO - PROVEEDOR
// ============================================

export const projectSupplierCreateSchema = z.object({
  projectId: z.string().cuid(),
  supplierId: z.string().cuid(),
  budgetLineId: z.string().cuid().optional(),
  role: z.string(),
  contractNumber: z.string().optional(),
  contractAmount: z.coerce.number().nonnegative().optional(),
  contractStart: z.coerce.date().optional(),
  contractEnd: z.coerce.date().optional(),
  notes: z.string().optional(),
})

export type ProjectSupplierCreate = z.infer<typeof projectSupplierCreateSchema>
export type ProjectSupplier = ProjectSupplierModel

// ============================================
// FACTURAS
// ============================================

export const invoiceCreateSchema = z.object({
  projectId: z.string().cuid(),
  supplierId: z.string().cuid(),
  number: z.string().min(1).max(50),
  date: z.coerce.date(),
  amount: z.coerce.number().positive(),
  taxAmount: z.coerce.number().nonnegative().default(0),
  totalAmount: z.coerce.number().positive(),
  dueDate: z.coerce.date().optional(),
  description: z.string().optional(),
  files: z.array(z.string().url()).default([]),
})

export const invoiceUpdateSchema = z.object({
  status: z.string().optional(),
  paidDate: z.coerce.date().optional(),
  approvedBy: z.string().cuid().optional(),
  approvedDate: z.coerce.date().optional(),
})

export type InvoiceCreate = z.infer<typeof invoiceCreateSchema>
export type InvoiceUpdate = z.infer<typeof invoiceUpdateSchema>

// ============================================
// DOCUMENTOS
// ============================================

export const documentCreateSchema = z.object({
  projectId: z.string().cuid(),
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  category: z.string(),
  fileUrl: z.string().url(),
  fileSize: z.coerce.number().int().positive().optional(),
  mimeType: z.string().optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
})

export type DocumentCreate = z.infer<typeof documentCreateSchema>

// ============================================
// CONFIGURACIÓN DEL SISTEMA
// ============================================

export const systemConfigSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.any(),
  description: z.string().optional(),
})

export type SystemConfig = z.infer<typeof systemConfigSchema>