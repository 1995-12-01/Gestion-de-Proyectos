'use client'

import { useState, useCallback } from 'react'
import { useToast } from './use-toast'
import { Supplier, ProjectSupplier, SupplierCreate, SupplierUpdate, ProjectSupplierCreate } from '@/lib/validations'

interface UseSuppliersOptions {
  projectId?: string
}

interface UseSuppliersReturn {
  suppliers: Supplier[]
  projectSuppliers: ProjectSupplier[]
  isLoading: boolean
  error: string | null
  fetchSuppliers: () => Promise<void>
  fetchProjectSuppliers: () => Promise<void>
  createSupplier: (data: SupplierCreate) => Promise<Supplier | null>
  updateSupplier: (id: string, data: SupplierUpdate) => Promise<Supplier | null>
  deleteSupplier: (id: string) => Promise<boolean>
  assignSupplierToProject: (data: ProjectSupplierCreate) => Promise<ProjectSupplier | null>
  removeSupplierFromProject: (id: string) => Promise<boolean>
  getSupplierById: (id: string) => Supplier | undefined
}

export function useSuppliers({ projectId }: UseSuppliersOptions = {}): UseSuppliersReturn {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [projectSuppliers, setProjectSuppliers] = useState<ProjectSupplier[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/suppliers')
      if (!response.ok) throw new Error('Error al cargar proveedores')
      const data = await response.json()
      setSuppliers(data.suppliers)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  const fetchProjectSuppliers = useCallback(async () => {
    if (!projectId) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/projects/${projectId}/suppliers`)
      if (!response.ok) throw new Error('Error al cargar proveedores del proyecto')
      const data = await response.json()
      setProjectSuppliers(data.projectSuppliers)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [projectId, toast])

  const createSupplier = useCallback(async (data: SupplierCreate) => {
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Error al crear proveedor')
      const supplier = await response.json()
      toast({ title: 'Éxito', description: 'Proveedor creado correctamente', variant: 'success' })
      await fetchSuppliers()
      return supplier
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear proveedor'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return null
    }
  }, [fetchSuppliers, toast])

  const updateSupplier = useCallback(async (id: string, data: SupplierUpdate) => {
    try {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Error al actualizar proveedor')
      const supplier = await response.json()
      toast({ title: 'Éxito', description: 'Proveedor actualizado correctamente', variant: 'success' })
      await fetchSuppliers()
      return supplier
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar proveedor'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return null
    }
  }, [fetchSuppliers, toast])

  const deleteSupplier = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Error al eliminar proveedor')
      toast({ title: 'Éxito', description: 'Proveedor eliminado correctamente', variant: 'success' })
      await fetchSuppliers()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar proveedor'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return false
    }
  }, [fetchSuppliers, toast])

  const assignSupplierToProject = useCallback(async (data: ProjectSupplierCreate) => {
    try {
      const response = await fetch(`/api/projects/${data.projectId}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Error al asignar proveedor')
      const assignment = await response.json()
      toast({ title: 'Éxito', description: 'Proveedor asignado correctamente', variant: 'success' })
      await fetchProjectSuppliers()
      return assignment
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al asignar proveedor'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return null
    }
  }, [fetchProjectSuppliers, toast])

  const removeSupplierFromProject = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/project-suppliers/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Error al desasignar proveedor')
      toast({ title: 'Éxito', description: 'Proveedor desasignado correctamente', variant: 'success' })
      await fetchProjectSuppliers()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al desasignar proveedor'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return false
    }
  }, [fetchProjectSuppliers, toast])

  const getSupplierById = useCallback((id: string) => {
    return suppliers.find(s => s.id === id)
  }, [suppliers])

  return {
    suppliers,
    projectSuppliers,
    isLoading,
    error,
    fetchSuppliers,
    fetchProjectSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    assignSupplierToProject,
    removeSupplierFromProject,
    getSupplierById,
  }
}