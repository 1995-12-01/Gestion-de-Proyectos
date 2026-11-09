'use client'

import { Fragment, FormEvent, useEffect, useState } from 'react'
import { BudgetItemType } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type BaseSubrubric = {
  id: string
  code: string
  name: string
  description: string | null
  isActive: boolean
}

type BaseLine = {
  id: string
  code: string
  name: string
  description: string | null
  type: BudgetItemType
  order: number
  isActive: boolean
  subrubrics: BaseSubrubric[]
}

const types: { value: BudgetItemType; label: string }[] = [
  { value: 'LABOR', label: 'Mano de obra' },
  { value: 'MATERIALS', label: 'Materiales' },
  { value: 'EQUIPMENT', label: 'Equipos' },
  { value: 'SUBCONTRACTING', label: 'Subcontratación' },
  { value: 'OVERHEAD', label: 'Gastos generales' },
  { value: 'CONTINGENCY', label: 'Contingencia' },
  { value: 'OTHER', label: 'Otros' },
]

export function BudgetBaseLineManager() {
  const [lines, setLines] = useState<BaseLine[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingSubrubricId, setEditingSubrubricId] = useState<string | null>(null)

  async function loadLines() {
    setError('')
    try {
      const response = await fetch('/api/budget-base-lines')
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo cargar el catálogo.')
      setLines(result.budgetBaseLines)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el catálogo.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadLines()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const form = event.currentTarget
    const values = new FormData(form)
    try {
      const response = await fetch('/api/budget-base-lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: values.get('code'),
          name: values.get('name'),
          description: values.get('description') || undefined,
          type: values.get('type'),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo crear la línea.')
      form.reset()
      await loadLines()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo crear la línea.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function toggleActive(line: BaseLine) {
    setError('')
    try {
      const response = await fetch(`/api/budget-base-lines/${line.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !line.isActive }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo actualizar la línea.')
      setLines(current => current.map(item => item.id === line.id ? result : item))
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'No se pudo actualizar la línea.')
    }
  }

  async function updateLine(event: FormEvent<HTMLFormElement>, line: BaseLine) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    try {
      const response = await fetch(`/api/budget-base-lines/${line.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.get('code'),
          name: formData.get('name'),
          description: formData.get('description') || undefined,
          type: formData.get('type'),
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo actualizar la línea.')
      setEditingId(null)
      await loadLines()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar la línea.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function createSubrubric(event: FormEvent<HTMLFormElement>, line: BaseLine) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const form = event.currentTarget
    const values = new FormData(form)
    try {
      const response = await fetch(`/api/budget-base-lines/${line.id}/subrubrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.get('name'),
          description: values.get('description') || undefined,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo crear el subrubro.')
      form.reset()
      await loadLines()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo crear el subrubro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function updateSubrubric(event: FormEvent<HTMLFormElement>, line: BaseLine, subrubric: BaseSubrubric) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    const values = new FormData(event.currentTarget)
    try {
      const response = await fetch(`/api/budget-base-lines/${line.id}/subrubrics/${subrubric.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.get('name'),
          description: values.get('description') || undefined,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo actualizar el subrubro.')
      setEditingSubrubricId(null)
      await loadLines()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el subrubro.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function toggleSubrubric(line: BaseLine, subrubric: BaseSubrubric) {
    setError('')
    try {
      const response = await fetch(`/api/budget-base-lines/${line.id}/subrubrics/${subrubric.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !subrubric.isActive }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No se pudo actualizar el subrubro.')
      await loadLines()
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'No se pudo actualizar el subrubro.')
    }
  }

  return (
    <div className="mt-7 space-y-8">
      <form className="grid gap-4 rounded-lg border p-4 sm:grid-cols-2" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="code">Código</Label>
          <Input id="code" name="code" placeholder="OBRA-CIVIL" maxLength={30} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" minLength={2} maxLength={200} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Categoría</Label>
          <select id="type" name="type" className="h-10 w-full rounded-md border bg-white px-3 text-sm">
            {types.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descripción (opcional)</Label>
          <Input id="description" name="description" maxLength={1000} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" loading={isSubmitting}>Agregar al catálogo</Button>
        </div>
      </form>

      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {isLoading ? <p className="text-sm text-muted-foreground">Cargando catálogo…</p> : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Línea base</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lines.map(line => (
                <Fragment key={line.id}>
                  <tr>
                    <td className="px-4 py-3">{line.code}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{line.name}</p>
                      {line.description && <p className="text-xs text-muted-foreground">{line.description}</p>}
                    </td>
                    <td className="px-4 py-3">{types.find(type => type.value === line.type)?.label}</td>
                    <td className="px-4 py-3">{line.isActive ? 'Activa' : 'Inactiva'}</td>
                    <td className="flex gap-2 px-4 py-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(editingId === line.id ? null : line.id)}>
                        {editingId === line.id ? 'Cancelar' : 'Editar'}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => void toggleActive(line)}>
                        {line.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                    </td>
                  </tr>
                  {editingId === line.id && (
                    <tr>
                      <td colSpan={5} className="bg-slate-50 p-4">
                        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={event => void updateLine(event, line)}>
                          <div className="space-y-1">
                            <Label htmlFor={`edit-code-${line.id}`}>Código</Label>
                            <Input id={`edit-code-${line.id}`} name="code" defaultValue={line.code} required />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`edit-name-${line.id}`}>Nombre</Label>
                            <Input id={`edit-name-${line.id}`} name="name" defaultValue={line.name} required />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`edit-type-${line.id}`}>Categoría</Label>
                            <select id={`edit-type-${line.id}`} name="type" defaultValue={line.type} className="h-10 w-full rounded-md border bg-white px-3 text-sm">
                              {types.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`edit-description-${line.id}`}>Descripción</Label>
                            <Input id={`edit-description-${line.id}`} name="description" defaultValue={line.description ?? ''} />
                          </div>
                          <Button type="submit" loading={isSubmitting} className="sm:col-span-2 lg:col-span-4">Guardar cambios</Button>
                        </form>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={5} className="bg-slate-50/70 px-4 py-4">
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-sm font-semibold">Subrubros predeterminados</h3>
                          <p className="text-xs text-muted-foreground">
                            Se copiarán a los proyectos nuevos que usen esta línea base.
                          </p>
                        </div>
                        {line.subrubrics.length > 0 && (
                          <div className="divide-y rounded-md border bg-white">
                            {line.subrubrics.map(subrubric => (
                              <div key={subrubric.id} className="flex flex-col justify-between gap-3 p-3 sm:flex-row sm:items-center">
                                {editingSubrubricId === subrubric.id ? (
                                  <form
                                    className="grid flex-1 gap-3 sm:grid-cols-2"
                                    onSubmit={event => void updateSubrubric(event, line, subrubric)}
                                  >
                                    <Input name="name" defaultValue={subrubric.name} minLength={2} maxLength={200} required aria-label="Nombre del subrubro" />
                                    <Input name="description" defaultValue={subrubric.description ?? ''} maxLength={1000} aria-label="Descripción del subrubro" />
                                    <div className="flex gap-2 sm:col-span-2">
                                      <Button type="submit" size="sm" loading={isSubmitting}>Guardar</Button>
                                      <Button type="button" size="sm" variant="outline" onClick={() => setEditingSubrubricId(null)}>Cancelar</Button>
                                    </div>
                                  </form>
                                ) : (
                                  <>
                                    <div>
                                      <p className="text-sm font-medium">{subrubric.code} · {subrubric.name}</p>
                                      {subrubric.description && <p className="text-xs text-muted-foreground">{subrubric.description}</p>}
                                      <p className="text-xs text-muted-foreground">{subrubric.isActive ? 'Activo' : 'Inactivo'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button type="button" variant="outline" size="sm" onClick={() => setEditingSubrubricId(subrubric.id)}>Editar</Button>
                                      <Button type="button" variant="outline" size="sm" onClick={() => void toggleSubrubric(line, subrubric)}>
                                        {subrubric.isActive ? 'Desactivar' : 'Activar'}
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <form
                          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                          onSubmit={event => void createSubrubric(event, line)}
                        >
                          <Input name="name" minLength={2} maxLength={200} required placeholder="Nombre del subrubro" aria-label="Nuevo subrubro" />
                          <Input name="description" maxLength={1000} placeholder="Descripción (opcional)" aria-label="Descripción del nuevo subrubro" />
                          <Button type="submit" size="sm" loading={isSubmitting}>Agregar subrubro</Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              ))}
              {lines.length === 0 && (
                <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>Aún no hay líneas base.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
