'use client'

import { useState, useCallback } from 'react'
import { useToast } from './use-toast'
import { ScheduleItem, ScheduleItemCreate, ScheduleItemUpdate } from '@/lib/validations'

interface UseScheduleOptions {
  projectId: string
  phaseId?: string
}

interface UseScheduleReturn {
  scheduleItems: ScheduleItem[]
  isLoading: boolean
  error: string | null
  fetchSchedule: () => Promise<void>
  createScheduleItem: (data: ScheduleItemCreate) => Promise<ScheduleItem | null>
  updateScheduleItem: (id: string, data: ScheduleItemUpdate) => Promise<ScheduleItem | null>
  deleteScheduleItem: (id: string) => Promise<boolean>
  updateProgress: (id: string, progress: number) => Promise<boolean>
  getGanttData: () => Promise<any>
}

export function useSchedule({ projectId, phaseId }: UseScheduleOptions): UseScheduleReturn {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchSchedule = useCallback(async () => {
    if (!projectId) return
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (phaseId) params.append('phaseId', phaseId)
      const response = await fetch(`/api/projects/${projectId}/schedule?${params.toString()}`)
      if (!response.ok) throw new Error('Error al cargar cronograma')
      const data = await response.json()
      setScheduleItems(data.scheduleItems)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [projectId, phaseId, toast])

  const createScheduleItem = useCallback(async (data: ScheduleItemCreate) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Error al crear actividad')
      const item = await response.json()
      toast({ title: 'Éxito', description: 'Actividad creada correctamente', variant: 'success' })
      await fetchSchedule()
      return item
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear actividad'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return null
    }
  }, [projectId, fetchSchedule, toast])

  const updateScheduleItem = useCallback(async (id: string, data: ScheduleItemUpdate) => {
    try {
      const response = await fetch(`/api/schedule-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Error al actualizar actividad')
      const item = await response.json()
      toast({ title: 'Éxito', description: 'Actividad actualizada correctamente', variant: 'success' })
      await fetchSchedule()
      return item
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar actividad'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return null
    }
  }, [fetchSchedule, toast])

  const deleteScheduleItem = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/schedule-items/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Error al eliminar actividad')
      toast({ title: 'Éxito', description: 'Actividad eliminada correctamente', variant: 'success' })
      await fetchSchedule()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar actividad'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return false
    }
  }, [fetchSchedule, toast])

  const updateProgress = useCallback(async (id: string, progress: number) => {
    try {
      const response = await fetch(`/api/schedule-items/${id}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
      })
      if (!response.ok) throw new Error('Error al actualizar progreso')
      toast({ title: 'Éxito', description: 'Progreso actualizado correctamente', variant: 'success' })
      await fetchSchedule()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar progreso'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return false
    }
  }, [fetchSchedule, toast])

  const getGanttData = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/schedule/gantt`)
      if (!response.ok) throw new Error('Error al obtener datos de Gantt')
      return await response.json()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al obtener datos de Gantt'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return null
    }
  }, [projectId, toast])

  return {
    scheduleItems,
    isLoading,
    error,
    fetchSchedule,
    createScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,
    updateProgress,
    getGanttData,
  }
}