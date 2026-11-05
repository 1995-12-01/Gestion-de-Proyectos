'use client'

import { FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const roles = [
  { value: 'PROJECT_MANAGER', label: 'Responsable de proyectos' },
  { value: 'SUPPLIER', label: 'Proveedor' },
  { value: 'AUDITOR', label: 'Auditor' },
  { value: 'ADMIN', label: 'Administrador' },
]

export function CreateUserForm() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)
    const form = event.currentTarget

    try {
      const formData = new FormData(form)
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          name: formData.get('name') || undefined,
          password: formData.get('password'),
          role: formData.get('role'),
        }),
      })
      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'No se pudo crear el usuario.')
        return
      }

      form.reset()
      setSuccess(`Se creó la cuenta para ${result.email}. Comparte la contraseña de forma segura.`)
    } catch {
      setError('No fue posible comunicarse con el servidor. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" minLength={2} maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña inicial</Label>
        <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
        <p className="text-xs text-muted-foreground">Debe tener al menos 8 caracteres.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Rol</Label>
        <select
          id="role"
          name="role"
          defaultValue="PROJECT_MANAGER"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {roles.map(role => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
      </div>
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Crear usuario
      </Button>
    </form>
  )
}
