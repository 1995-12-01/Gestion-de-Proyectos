import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined, currency = 'EUR'): string {
  if (amount === null || amount === undefined) return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatNumber(num: number | string | null | undefined, decimals = 0): string {
  if (num === null || num === undefined) return '—'
  const n = typeof num === 'string' ? parseFloat(num) : num
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function formatPercentage(value: number | string | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `${num.toFixed(decimals)}%`
}

export function formatDate(date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `Hace ${Math.abs(diffDays)} día${Math.abs(diffDays) !== 1 ? 's' : ''}`
  } else if (diffDays === 0) {
    return 'Hoy'
  } else if (diffDays === 1) {
    return 'Mañana'
  } else if (diffDays <= 7) {
    return `En ${diffDays} días`
  } else {
    return formatDate(d)
  }
}

export function generateProjectCode(type: 'AUTHORIZED_PLAN' | 'RENOVATION', year: number, sequence: number): string {
  const prefix = type === 'AUTHORIZED_PLAN' ? 'PAE' : 'PRM'
  return `${prefix}-${year}-${sequence.toString().padStart(4, '0')}`
}

export function generateBudgetCode(parentCode: string | null, level: number, index: number): string {
  if (!parentCode || level === 0) {
    return `RUB-${index.toString().padStart(3, '0')}`
  }
  return `${parentCode}.${index.toString().padStart(2, '0')}`
}

export function generateScheduleCode(parentCode: string | null, level: number, index: number): string {
  if (!parentCode || level === 0) {
    return `${index}`
  }
  return `${parentCode}.${index}`
}

export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

export function calculateBudgetExecution(executed: number, budgeted: number): number {
  if (budgeted === 0) return 0
  return Math.round((executed / budgeted) * 100)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'status-draft',
    PENDING_APPROVAL: 'status-pending',
    APPROVED: 'status-approved',
    IN_PROGRESS: 'status-progress',
    ON_HOLD: 'status-on-hold',
    COMPLETED: 'status-completed',
    CANCELLED: 'status-cancelled',
    REJECTED: 'status-rejected',
    PENDING: 'status-pending',
    NOT_STARTED: 'status-draft',
    IN_REVIEW: 'status-pending',
    RESUBMITTED: 'status-pending',
  }
  return colors[status] || 'status-draft'
}

export function getProjectTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    AUTHORIZED_PLAN: 'Plan Empresarial',
    RENOVATION: 'Remodelación',
  }
  return labels[type] || type
}

export function getProjectTypeColor(type: string): string {
  const colors: Record<string, string> = {
    AUTHORIZED_PLAN: 'project-type-authorized',
    RENOVATION: 'project-type-renovation',
  }
  return colors[type] || 'project-type-authorized'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.slice(0, length).trim() + '...'
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function parseJsonSafe<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function bytesToSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}