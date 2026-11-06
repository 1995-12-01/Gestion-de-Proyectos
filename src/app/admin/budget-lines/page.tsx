import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { ArrowLeft } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { BudgetBaseLineManager } from './manager'

export const dynamic = 'force-dynamic'

export default async function BudgetBaseLinesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/auth/login')
  if (session.user.role !== UserRole.ADMIN) redirect('/')

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al panel
        </Link>
        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium text-primary">Administración</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Líneas presupuestarias base</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Administra el catálogo reutilizable. Las asignaciones y montos se configuran dentro de cada proyecto.
          </p>
          <BudgetBaseLineManager />
        </section>
      </div>
    </main>
  )
}
