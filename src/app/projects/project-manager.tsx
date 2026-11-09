'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, FolderKanban, Plus } from 'lucide-react'
import { ProjectCurrency, ProjectStatus, ProjectType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SignOutButton } from '@/components/sign-out-button'
import { BrandLogo } from '@/components/brand-logo'

type ProjectRow = {
  id: string
  code: string
  name: string
  type: ProjectType
  status: ProjectStatus
  totalBudget: string | number
  currency: ProjectCurrency
  updatedAt: string
  manager: { id: string; name: string | null; email: string }
}

type BaseLine = {
  id: string
  code: string
  name: string
  type: string
  subrubrics: { id: string; name: string }[]
}

const typeLabels: Record<ProjectType, string> = {
  AUTHORIZED_PLAN: 'Plan autorizado',
  RENOVATION: 'Remodelación',
}
const statusLabels: Record<ProjectStatus, string> = {
  DRAFT: 'Borrador',
  PENDING_APPROVAL: 'Pendiente de aprobación',
  APPROVED: 'Aprobado',
  IN_PROGRESS: 'En progreso',
  ON_HOLD: 'En pausa',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  REJECTED: 'Rechazado',
}

function money(amount: number | string, currency: ProjectCurrency) {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount))
}

export function ProjectManager({ canCreate }: { canCreate: boolean }) {
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [baseLines, setBaseLines] = useState<BaseLine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [allocations, setAllocations] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [projectResponse, linesResponse] = await Promise.all([
          fetch('/api/projects?limit=100&sort=updatedAt&order=desc'),
          fetch('/api/budget-base-lines'),
        ])
        const projectResult = await projectResponse.json()
        const linesResult = await linesResponse.json()
        if (!projectResponse.ok) throw new Error(projectResult.error || 'No se pudieron cargar los proyectos.')
        if (!linesResponse.ok) throw new Error(linesResult.error || 'No se pudo cargar el catálogo de presupuesto.')
        if (active) {
          setProjects(projectResult.projects)
          setBaseLines(linesResult.budgetBaseLines.filter((line: BaseLine & { isActive: boolean }) => line.isActive))
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Error al cargar proyectos.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    const selectedBaseLines = Object.entries(allocations)
      .filter(([, amount]) => amount !== '')
      .map(([baseLineId, budgetedAmount]) => ({ baseLineId, budgetedAmount }))
    const payload = {
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      type: formData.get('type'),
      currency: formData.get('currency'),
      startDate: formData.get('startDate') || undefined,
      endDate: formData.get('endDate') || undefined,
      fiscalYear: formData.get('fiscalYear') || undefined,
      location: formData.get('location') || undefined,
      address: formData.get('address') || undefined,
      baseBudgetLines: selectedBaseLines,
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo crear el proyecto.')
      window.location.assign(`/projects/${result.id}`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo crear el proyecto.')
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Panel principal
          </Link>
          <BrandLogo className="hidden h-10 w-auto sm:block" />
          <SignOutButton />
        </div>
        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-primary">Gestión de proyectos</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Proyectos</h1>
            <p className="mt-2 text-muted-foreground">Crea proyectos y administra sus líneas de presupuesto y cronograma.</p>
          </div>
          {canCreate && (
            <Button type="button" onClick={() => setShowForm(value => !value)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {showForm ? 'Cerrar formulario' : 'Agregar proyecto'}
            </Button>
          )}
        </div>

        {showForm && (
          <form className="mt-6 space-y-6 rounded-xl border bg-white p-6 shadow-sm" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Nombre del proyecto</Label>
                <Input id="name" name="name" minLength={3} maxLength={200} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <select id="type" name="type" className="h-10 w-full rounded-md border bg-white px-3 text-sm">
                  <option value="AUTHORIZED_PLAN">Plan autorizado</option>
                  <option value="RENOVATION">Remodelación</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moneda del proyecto</Label>
                <select id="currency" name="currency" className="h-10 w-full rounded-md border bg-white px-3 text-sm">
                  <option value="GTQ">Quetzales (GTQ)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiscalYear">Año fiscal (opcional)</Label>
                <Input id="fiscalYear" name="fiscalYear" type="number" min={2020} max={2050} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Ubicación</Label>
                <Input id="location" name="location" maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha de inicio</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha de fin</Label>
                <Input id="endDate" name="endDate" type="date" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Dirección (opcional)</Label>
                <Input id="address" name="address" maxLength={500} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <textarea id="description" name="description" rows={3} className="w-full rounded-md border bg-white px-3 py-2 text-sm" />
              </div>
            </div>

            <div>
              <h2 className="font-semibold">Líneas presupuestarias base</h2>
              <p className="mt-1 text-sm text-muted-foreground">Selecciona las líneas y asigna un monto en la moneda del proyecto.</p>
              <p className="mt-1 text-xs text-muted-foreground">Los subrubros activos del catálogo se copiarán automáticamente al proyecto.</p>
              {baseLines.length ? (
                <div className="mt-3 divide-y rounded-lg border">
                  {baseLines.map(line => (
                    <label key={line.id} className="grid items-center gap-3 p-3 sm:grid-cols-[1fr_180px]">
                      <span>
                        <span className="font-medium">{line.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{line.code}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {line.subrubrics.length} subrubro{line.subrubrics.length === 1 ? '' : 's'}
                        </span>
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Monto (opcional)"
                        value={allocations[line.id] ?? ''}
                        onChange={event => setAllocations(current => ({ ...current, [line.id]: event.target.value }))}
                        aria-label={`Monto para ${line.name}`}
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                  No hay líneas activas en el catálogo. Un administrador puede agregarlas desde “Líneas base”.
                </p>
              )}
            </div>
            {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button type="submit" loading={isSubmitting}>Crear proyecto</Button>
          </form>
        )}

        {error && !showForm && <p role="alert" className="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <section className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
          {isLoading ? <p className="p-8 text-sm text-muted-foreground">Cargando proyectos…</p> : projects.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Proyecto</th>
                    <th className="px-5 py-3 font-medium">Tipo</th>
                    <th className="px-5 py-3 font-medium">Responsable</th>
                    <th className="px-5 py-3 font-medium">Presupuesto</th>
                    <th className="px-5 py-3 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.map(project => (
                    <tr key={project.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <Link className="font-medium text-primary hover:underline" href={`/projects/${project.id}`}>{project.name}</Link>
                        <p className="mt-1 text-xs text-muted-foreground">{project.code}</p>
                      </td>
                      <td className="px-5 py-4">{typeLabels[project.type]}</td>
                      <td className="px-5 py-4">{project.manager.name || project.manager.email}</td>
                      <td className="px-5 py-4">{money(project.totalBudget, project.currency)}</td>
                      <td className="px-5 py-4">{statusLabels[project.status]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-14 text-center">
              <FolderKanban className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
              <h2 className="mt-4 font-semibold">Aún no hay proyectos</h2>
              <p className="mt-1 text-sm text-muted-foreground">Crea el primero con el botón “Agregar proyecto”.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
