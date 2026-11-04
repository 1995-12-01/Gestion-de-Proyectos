'use client'

import { useState, useCallback } from 'react'
import { useToast } from './use-toast'
import { BudgetLine, BudgetItem, BudgetLineCreate, BudgetLineUpdate, BudgetItemCreate } from '@/lib/validations'

interface UseBudgetOptions {
  projectId: string
}

interface UseBudgetReturn {
  budgetLines: BudgetLine[]
  isLoading: boolean
  error: string | null
  summary: { total: number; committed: number; executed: number; pending: number; progress: number }
  fetchBudget: () => Promise<void>
  createBudgetLine: (data: BudgetLineCreate) => Promise<BudgetLine | null>
  updateBudgetLine: (id: string, data: BudgetLineUpdate) => Promise<BudgetLine | null>
  deleteBudgetLine: (id: string) => Promise<boolean>
  createBudgetItem: (data: BudgetItemCreate) => Promise<BudgetItem | null>
  fetchBudgetItems: (budgetLineId: string) => Promise<BudgetItem[]>
}

export function useBudget({ projectId }: UseBudgetOptions): UseBudgetReturn {
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState({ total: 0, committed: 0, executed: 0, pending: 0, progress: 0 })
  const { toast } = useToast()

  const fetchBudget = useCallback(async () => {
    if (!projectId) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/budget`)
      if (!response.ok) throw new Error('Error al cargar presupuesto')
      const data = await response.json()
      setBudgetLines(data.budgetLines)
      setSummary(data.summary)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [projectId, toast])

  const createBudgetLine = useCallback(async (data: BudgetLineCreate) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Error al crear rubro')
      const budgetLine = await response.json()
      toast({ title: 'Éxito', description: 'Rubro creado correctamente', variant: 'success' })
      await fetchBudget()
      return budgetLine
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear rubro'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return null
    }
  }, [projectId, fetchBudget, toast])

  const updateBudgetLine = useCallback(async (id: string, data: BudgetLineUpdate) => {
    try {
      const response = await fetch(`/api/budget-lines/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Error al actualizar rubro')
      const budgetLine = await response.json()
      toast({ title: 'Éxito', description: 'Rubro actualizado correctamente', variant: 'success' })
      await fetchBudget()
      return budgetLine
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar rubro'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return null
    }
  }, [fetchBudget, toast])

  const deleteBudgetLine = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/budget-lines/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Error al eliminar rubro')
      toast({ title: 'Éxito', description: 'Rubro eliminado correctamente', variant: 'success' })
      await fetchBudget()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar rubro'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return false
    }
  }, [fetchBudget, toast])

  const createBudgetItem = useCallback(async (data: BudgetItemCreate) => {
    try {
      const response = await fetch('/api/budget-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Error al crear item')
      const item = await response.json()
      toast({ title: 'Éxito', description: 'Item creado correctamente', variant: 'success' })
      await fetchBudget()
      return item
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear item'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return null
    }
  }, [fetchBudget, toast])

  const fetchBudgetItems = useCallback(async (budgetLineId: string) => {
    try {
      const response = await fetch(`/api/budget-lines/${budgetLineId}/items`)
      if (!response.ok) throw new Error('Error al cargar items')
      return await response.json()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar items'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return []
    }
  }, [toast])

  return {
    budgetLines,
    isLoading,
    error,
    summary,
    fetchBudget,
    createBudgetLine,
    updateBudgetLine,
    deleteBudgetLine,
    createBudgetItem,
    fetchBudgetItems,
  }
}