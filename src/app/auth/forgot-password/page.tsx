'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { ArrowLeft, FolderKanban } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    setIsSubmitting(true)

    try {
      const formData = new FormData(event.currentTarget)
      const response = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.get('email') }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'No se pudo solicitar la recuperación.')
        return
      }
      setMessage(result.message)
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
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Recuperar contraseña</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Te enviaremos un enlace para elegir una contraseña nueva.
        </p>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-11 w-full rounded-md border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>

        <Link href="/auth/login" className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver a iniciar sesión
        </Link>
      </section>
    </main>
  )
}
