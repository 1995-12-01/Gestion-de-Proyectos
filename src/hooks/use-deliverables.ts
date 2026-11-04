'use client'

import { useState, useCallback } from 'react'
import { useToast } from './use-toast'
import { Deliverable, DeliverableCreate, DeliverableUpdate, DeliverableReview, DeliverableStatus } from '@/lib/validations'

interface UseDeliverablesOptions {
  projectId: string
  scheduleItemId?: string
}

interface UseDeliverablesReturn {
  deliverables: Deliverable[]
  isLoading: boolean
  error: string | null
  fetchDeliverables: () => Promise<void>
  createDeliverable: (data: DeliverableCreate) => Promise<Deliverable | null>
  updateDeliverable: (id: string, data: DeliverableUpdate) => Promise<Deliverable | null>
  deleteDeliverable: (id: string) => Promise<boolean>
  submitDeliverable: (id: string, files: string[]) => Promise<boolean>
  reviewDeliverable: (id: string, review: DeliverableReview) => Promise<boolean>
  getByStatus: (status: DeliverableStatus) => Deliverable[]
}

export function useDeliverables({ projectId, scheduleItemId }: UseDeliverablesOptions): UseDeliverablesReturn {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchDeliverables = useCallback(async () => {
    if (!projectId) return
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (scheduleItemId) params.append('scheduleItemId', scheduleItemId)
      const response = await fetch(`/api/projects/${projectId}/deliverables?${params.toString()}`)
      if (!response.ok) throw new Error('Error al cargar entregables')
      const data = await response.json()
      setDeliverables(data.deliverables)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [projectId, scheduleItemId, toast])

  const createDeliverable = useCallback(async (data: DeliverableCreate) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/deliverables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Error al crear entregable')
      const deliverable = await response.json()
      toast({ title: 'Éxito', description: 'Entregable creado correctamente', variant: 'success' })
      await fetchDeliverables()
      return deliverable
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear entregable'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return null
    }
  }, [projectId, fetchDeliverables, toast])

  const updateDeliverable = useCallback(async (id: string, data: DeliverableUpdate) => {
    try {
      const response = await fetch(`/api/deliverables/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Error al actualizar entregable')
      const deliverable = await response.json()
      toast({ title: 'Éxito', description: 'Entregable actualizado correctamente', variant: 'success' })
      await fetchDeliverables()
      return deliverable
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar entregable'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return null
    }
  }, [fetchDeliverables, toast])

  const deleteDeliverable = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/deliverables/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Error al eliminar entregable')
      toast({ title: 'Éxito', description: 'Entregable eliminado correctamente', variant: 'success' })
      await fetchDeliverables()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar entregable'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return false
    }
  }, [fetchDeliverables, toast])

  const submitDeliverable = useCallback(async (id: string, files: string[]) => {
    try {
      const response = await fetch(`/api/deliverables/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files }),
      })
      if (!response.ok) throw new Error('Error al enviar entregable')
      toast({ title: 'Éxito', description: 'Entregable enviado para revisión', variant: 'success' })
      await fetchDeliverables()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar entregable'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return false
    }
  }, [fetchDeliverables, toast])

  const reviewDeliverable = useCallback(async (id: string, review: DeliverableReview) => {
    try {
      const response = await fetch(`/api/deliverables/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(review),
      })
      if (!response.ok) throw new Error('Error al revisar entregable')
      toast({
        title: 'Éxito',
        description: `Entregable ${review.status === 'APPROVED' ? 'aprobado' : review.status === 'REJECTED' ? 'rechazado' : 'devuelto para corrección'}`,
        variant: 'success'
      })
      await fetchDeliverables()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al revisar entregable'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return false
    }
  }, [fetchDeliverables, toast])

  const getByStatus = useCallback((status: DeliverableStatus) => {
    return deliverables.filter(d => d.status === status)
  }, [deliverables])

  return {
    deliverables,
    isLoading,
    error,
    fetchDeliverables,
    createDeliverable,
    updateDeliverable,
    deleteDeliverable,
    submitDeliverable,
    reviewDeliverable,
    getByStatus,
  }
}