'use client'

import { useState, useCallback } from 'react'
import { useToast } from './use-toast'
import { Project, ProjectType, ProjectStatus, ProjectFilter } from '@/lib/validations'

interface UseProjectsOptions {
  initialFilters?: Partial<ProjectFilter>
}

interface UseProjectsReturn {
  projects: Project[]
  isLoading: boolean
  error: string | null
  filters: ProjectFilter
  pagination: { page: number; limit: number; total: number; totalPages: number }
  fetchProjects: () => Promise<void>
  createProject: (data: any) => Promise<Project | null>
  updateProject: (id: string, data: any) => Promise<Project | null>
  deleteProject: (id: string) => Promise<boolean>
  changeStatus: (id: string, status: ProjectStatus) => Promise<boolean>
  setFilters: (filters: Partial<ProjectFilter>) => void
  setPage: (page: number) => void
}

export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<ProjectFilter>({
    page: 1,
    limit: 20,
    sort: 'createdAt',
    order: 'desc',
    ...options.initialFilters,
  } as ProjectFilter)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const { toast } = useToast()

  const fetchProjects = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value))
        }
      })

      const response = await fetch(`/api/projects?${params.toString()}`)
      if (!response.ok) throw new Error('Error al cargar proyectos')

      const data = await response.json()
      setProjects(data.projects)
      setPagination(data.pagination)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(message)
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }, [filters, toast])

  const createProject = useCallback(async (data: any) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Error al crear proyecto')
      const project = await response.json()
      toast({ title: 'Éxito', description: 'Proyecto creado correctamente', variant: 'success' })
      await fetchProjects()
      return project
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear proyecto'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return null
    }
  }, [fetchProjects, toast])

  const updateProject = useCallback(async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Error al actualizar proyecto')
      const project = await response.json()
      toast({ title: 'Éxito', description: 'Proyecto actualizado correctamente', variant: 'success' })
      await fetchProjects()
      return project
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar proyecto'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return null
    }
  }, [fetchProjects, toast])

  const deleteProject = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Error al eliminar proyecto')
      toast({ title: 'Éxito', description: 'Proyecto eliminado correctamente', variant: 'success' })
      await fetchProjects()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar proyecto'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return false
    }
  }, [fetchProjects, toast])

  const changeStatus = useCallback(async (id: string, status: ProjectStatus) => {
    try {
      const response = await fetch(`/api/projects/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('Error al cambiar estado')
      toast({ title: 'Éxito', description: 'Estado actualizado correctamente', variant: 'success' })
      await fetchProjects()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cambiar estado'
      toast({ title: 'Error', description: message, variant: 'destructive' })
      return false
    }
  }, [fetchProjects, toast])

  const setFilters = useCallback((newFilters: Partial<ProjectFilter>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters, page: 1 }))
  }, [])

  const setPage = useCallback((page: number) => {
    setFiltersState(prev => ({ ...prev, page }))
  }, [])

  return {
    projects,
    isLoading,
    error,
    filters,
    pagination,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    changeStatus,
    setFilters,
    setPage,
  }
}