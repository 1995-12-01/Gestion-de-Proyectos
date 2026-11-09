'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { BrandLogo } from '@/components/brand-logo'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const formData = new FormData(event.currentTarget)
      const result = await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        redirect: false,
      })

      if (result?.error) {
        setError('Correo o contraseña incorrectos.')
        return
      }

      window.location.assign('/')
    } catch {
      setError('No fue posible iniciar sesión. Inténtalo de nuevo más tarde.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <BrandLogo className="mb-6 h-10 w-auto" />
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Gestión de infraestructura</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Iniciar sesión</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ingresa con las credenciales de tu cuenta.</p>

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
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-11 w-full rounded-md border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <Link href="/auth/forgot-password" className="mt-5 block text-center text-sm text-primary hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link href="/" className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground">
          Volver al inicio
        </Link>
      </section>
    </main>
  )
}
