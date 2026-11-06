'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, CalendarDays, CircleDollarSign, FolderKanban, Plus } from 'lucide-react'
import { ProjectCurrency } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Subrubric = { id: string; code: string; name: string; description: string | null; type: string; budgetedAmount: number }
type BaseLine = Subrubric & { children: Subrubric[] }
type ScheduleRow = {
  id: string
  code: string
  name: string
  plannedStart: string
  plannedEnd: string
  progress: number
  budgetLine: { id: string; name: string; code: string } | null
  assignee: { id: string; name: string | null; email: string } | null
}
type Responsible = { id: string; name: string | null; email: string; role: string }
type ProjectData = {
  id: string
  code: string
  name: string
  description: string | null
  status: string
  currency: ProjectCurrency
  totalBudget: number
  manager: { id: string; name: string | null; email: string }
  budgetLines: BaseLine[]
  scheduleItems: ScheduleRow[]
}

function money(amount: number, currency: ProjectCurrency) {
  return new Intl.NumberFormat('es-GT', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
}

function dateInput(value: string) {
  return new Date(value).toISOString().slice(0, 10)
}

export function ProjectWorkspace({ project: initialProject, canManage }: { project: ProjectData; canManage: boolean }) {
  const [project, setProject] = useState(initialProject)
  const [activeTab, setActiveTab] = useState<'budget' | 'schedule'>('budget')
  const [responsibles, setResponsibles] = useState<Responsible[]>([])
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!canManage) return
    let active = true
    fetch('/api/users')
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'No se pudieron cargar los responsables.')
        if (active) setResponsibles(result.users)
      })
      .catch(loadError => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los responsables.')
      })
    return () => { active = false }
  }, [])

  async function refreshProject() {
    const [budgetResponse, scheduleResponse] = await Promise.all([
      fetch(`/api/projects/${project.id}/budget`),
      fetch(`/api/projects/${project.id}/schedule`),
    ])
    const budgetData = await budgetResponse.json()
    const scheduleData = await scheduleResponse.json()
    if (!budgetResponse.ok) throw new Error(budgetData.error || 'No se pudo actualizar el presupuesto.')
    if (!scheduleResponse.ok) throw new Error(scheduleData.error || 'No se pudo actualizar el cronograma.')
    setProject(current => ({
      ...current,
      budgetLines: budgetData.budgetLines.map((line: BaseLine) => ({
        ...line,
        budgetedAmount: Number(line.budgetedAmount),
        children: (line.children || []).map((child: Subrubric) => ({
          ...child,
          budgetedAmount: Number(child.budgetedAmount),
        })),
      })),
      totalBudget: Number(budgetData.summary.total),
      scheduleItems: scheduleData.scheduleItems,
    }))
  }

  async function createSubrubric(event: FormEvent<HTMLFormElement>, line: BaseLine) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const form = event.currentTarget
    const formData = new FormData(form)
    try {
      const response = await fetch(`/api/projects/${project.id}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: line.id,
          name: formData.get('name'),
          description: formData.get('description') || undefined,
          type: line.type,
          budgetedAmount: formData.get('budgetedAmount') || 0,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo agregar el subrubro.')
      form.reset()
      await refreshProject()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo agregar el subrubro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function createScheduleItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const form = event.currentTarget
    const formData = new FormData(form)
    const start = String(formData.get('plannedStart') || '')
    const end = String(formData.get('plannedEnd') || '')
    const days = start && end
      ? Math.floor((Date.parse(`${end}T00:00:00`) - Date.parse(`${start}T00:00:00`)) / 86400000) + 1
      : 0

    try {
      const response = await fetch(`/api/projects/${project.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          type: 'TASK',
          budgetLineId: formData.get('budgetLineId'),
          plannedStart: start,
          plannedEnd: end,
          plannedDuration: days,
          assigneeId: formData.get('assigneeId') || undefined,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo agregar la actividad.')
      form.reset()
      await refreshProject()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo agregar la actividad.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function updateBudgetAmount(event: FormEvent<HTMLFormElement>, lineId: string) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    try {
      const response = await fetch(`/api/budget-lines/${lineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetedAmount: formData.get('budgetedAmount') }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo actualizar el monto.')
      await refreshProject()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo actualizar el monto.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const subrubrics = project.budgetLines.flatMap(line => line.children.map(child => ({
    ...child,
    baseLineName: line.name,
  })))

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Proyectos
        </Link>
        <header className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <FolderKanban aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">{project.code} · {project.status.replaceAll('_', ' ')}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">{project.name}</h1>
                {project.description && <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{project.description}</p>}
                <p className="mt-2 text-xs text-muted-foreground">
                  Responsable: {project.manager.name || project.manager.email}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
                Presupuesto total
              </div>
              <p className="mt-1 text-xl font-bold">{money(project.totalBudget, project.currency)}</p>
            </div>
          </div>
        </header>

        <div className="mt-6 flex gap-2 border-b">
          <button type="button" onClick={() => setActiveTab('budget')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'budget' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>
            Presupuesto
          </button>
          <button type="button" onClick={() => setActiveTab('schedule')} className={`px-4 py-3 text-sm font-medium ${activeTab === 'schedule' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>
            Cronograma
          </button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {activeTab === 'budget' ? (
          <section className="mt-5 space-y-4">
            {project.budgetLines.map(line => (
              <article key={line.id} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-3 border-b p-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{line.code} · {line.type.replaceAll('_', ' ')}</p>
                    <h2 className="mt-1 font-semibold">{line.name}</h2>
                    {line.description && <p className="mt-1 text-sm text-muted-foreground">{line.description}</p>}
                  </div>
                  {canManage ? (
                    <form className="flex items-end gap-2" onSubmit={event => void updateBudgetAmount(event, line.id)}>
                      <div className="space-y-1">
                        <Label htmlFor={`base-amount-${line.id}`} className="text-xs">Monto ({project.currency})</Label>
                        <Input
                          key={`${line.id}-${line.budgetedAmount}`}
                          id={`base-amount-${line.id}`}
                          name="budgetedAmount"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={line.budgetedAmount}
                          className="w-40"
                          required
                        />
                      </div>
                      <Button type="submit" variant="outline" size="sm" loading={isSubmitting}>Guardar</Button>
                    </form>
                  ) : <p className="text-lg font-semibold">{money(line.budgetedAmount, project.currency)}</p>}
                </div>
                <div className="p-5">
                  {line.children.length ? (
                    <div className="divide-y rounded-lg border">
                      {line.children.map(child => (
                        <div key={child.id} className="flex items-center justify-between gap-4 p-3">
                          <div>
                            <p className="text-xs text-muted-foreground">{child.code}</p>
                            <p className="font-medium">{child.name}</p>
                            {child.description && <p className="text-xs text-muted-foreground">{child.description}</p>}
                          </div>
                          {canManage ? (
                            <form className="flex items-end gap-2" onSubmit={event => void updateBudgetAmount(event, child.id)}>
                              <div className="space-y-1">
                                <Label htmlFor={`child-amount-${child.id}`} className="text-xs">Monto ({project.currency})</Label>
                                <Input
                                  key={`${child.id}-${child.budgetedAmount}`}
                                  id={`child-amount-${child.id}`}
                                  name="budgetedAmount"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  defaultValue={child.budgetedAmount}
                                  className="w-36"
                                  required
                                />
                              </div>
                              <Button type="submit" variant="outline" size="sm" loading={isSubmitting}>Guardar</Button>
                            </form>
                          ) : <p className="whitespace-nowrap text-sm font-medium">{money(child.budgetedAmount, project.currency)}</p>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground">Aún no hay subrubros.</p>}

                  {canManage && (
                    <form
                      className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_160px_auto]"
                      onSubmit={event => void createSubrubric(event, line)}
                    >
                      <div className="space-y-1">
                        <Label htmlFor={`subrubric-${line.id}`}>Nuevo subrubro</Label>
                        <Input id={`subrubric-${line.id}`} name="name" minLength={2} maxLength={200} required placeholder="Nombre" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`description-${line.id}`}>Descripción</Label>
                        <Input id={`description-${line.id}`} name="description" placeholder="Opcional" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`amount-${line.id}`}>Monto ({project.currency})</Label>
                        <Input id={`amount-${line.id}`} name="budgetedAmount" type="number" min="0" step="0.01" defaultValue="0" />
                      </div>
                      <div className="flex items-end">
                        <Button type="submit" size="sm" loading={isSubmitting}>
                          <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Agregar
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </article>
            ))}
            {!project.budgetLines.length && (
              <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">
                El proyecto no tiene líneas base asignadas.
              </div>
            )}
          </section>
        ) : (
          <section className="mt-5 space-y-5">
            {canManage && (
              <form className="grid gap-4 rounded-xl border bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5" onSubmit={event => void createScheduleItem(event)}>
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="schedule-name">Actividad</Label>
                  <Input id="schedule-name" name="name" minLength={2} maxLength={300} required placeholder="Nombre de la actividad" />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="budgetLineId">Subrubro relacionado</Label>
                  <select id="budgetLineId" name="budgetLineId" required disabled={!subrubrics.length} className="h-10 w-full rounded-md border bg-white px-3 text-sm">
                    <option value="">Selecciona un subrubro</option>
                    {subrubrics.map(line => (
                      <option key={line.id} value={line.id}>{line.baseLineName} · {line.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigneeId">Responsable</Label>
                  <select id="assigneeId" name="assigneeId" className="h-10 w-full rounded-md border bg-white px-3 text-sm">
                    <option value="">Sin asignar</option>
                    {responsibles.map(user => (
                      <option key={user.id} value={user.id}>{user.name || user.email}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plannedStart">Fecha de inicio</Label>
                  <Input id="plannedStart" name="plannedStart" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plannedEnd">Fecha de fin</Label>
                  <Input id="plannedEnd" name="plannedEnd" type="date" required />
                </div>
                <div className="flex items-end">
                  <Button type="submit" loading={isSubmitting} disabled={!subrubrics.length}>
                    <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Agregar actividad
                  </Button>
                </div>
                {!subrubrics.length && (
                  <p className="text-sm text-amber-700 sm:col-span-2 lg:col-span-5">
                    Primero agrega subrubros en la pestaña Presupuesto.
                  </p>
                )}
              </form>
            )}

            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
              {project.scheduleItems.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 font-medium">Actividad</th>
                        <th className="px-5 py-3 font-medium">Subrubro</th>
                        <th className="px-5 py-3 font-medium">Inicio</th>
                        <th className="px-5 py-3 font-medium">Fin</th>
                        <th className="px-5 py-3 font-medium">Responsable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {project.scheduleItems.map(item => (
                        <tr key={item.id}>
                          <td className="px-5 py-4">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.code}</p>
                          </td>
                          <td className="px-5 py-4">{item.budgetLine?.name || 'Sin subrubro'}</td>
                          <td className="px-5 py-4">{dateInput(item.plannedStart)}</td>
                          <td className="px-5 py-4">{dateInput(item.plannedEnd)}</td>
                          <td className="px-5 py-4">{item.assignee?.name || item.assignee?.email || 'Sin asignar'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <CalendarDays className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
                  <h2 className="mt-3 font-semibold">Cronograma vacío</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Agrega actividades vinculadas a los subrubros del proyecto.</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
