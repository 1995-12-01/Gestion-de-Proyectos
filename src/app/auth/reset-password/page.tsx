'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, FolderKanban } from 'lucide-react'

export default function ResetPasswordPage() {
  const [accessToken, setAccessToken] = useState('')
  const [isCheckingLink, setIsCheckingLink] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1))
    const token = params.get('access_token')
    const type = params.get('type')

    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    if (token && type === 'recovery') {
      setAccessToken(token)
    } else {
      setError('El enlace venció, no es válido o ya fue utilizado. Solicita uno nuevo.')
    }
    setIsCheckingLink(false)
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, password }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'No se pudo actualizar la contraseña.')
        return
      }
      setSuccess(true)
      setAccessToken('')
    } catch {
      setError('No fue posible comunicarse con el servidor. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <FolderKanban aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Gestión de infraestructura</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Elegir contraseña nueva</h1>

        {isCheckingLink ? (
          <p className="mt-4 text-sm text-muted-foreground">Verificando el enlace…</p>
        ) : success ? (
          <>
            <p role="status" className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              Tu contraseña se actualizó. Ya puedes iniciar sesión.
            </p>
            <Link href="/auth/login" className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
              Ir a iniciar sesión
            </Link>
          </>
        ) : accessToken ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Elige una contraseña de al menos 8 caracteres.</p>
            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Nueva contraseña</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="h-11 w-full rounded-md border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar contraseña</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="h-11 w-full rounded-md border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Actualizando…' : 'Guardar contraseña'}
              </button>
            </form>
          </>
        ) : (
          <>
            {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Link href="/auth/forgot-password" className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
              Solicitar otro enlace
            </Link>
          </>
        )}

        {!success && (
          <Link href="/auth/login" className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a iniciar sesión
          </Link>
        )}
      </section>
    </main>
  )
}
