import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { ProjectStatus, ProjectType, UserRole } from '@prisma/client'
import { ArrowRight, Briefcase, CircleDollarSign, FolderKanban, Plus, Users } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { SignOutButton } from '@/components/sign-out-button'

export const dynamic = 'force-dynamic'

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

const statusStyles: Record<ProjectStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  ON_HOLD: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-slate-100 text-slate-600',
  REJECTED: 'bg-red-100 text-red-800',
}

const typeLabels: Record<ProjectType, string> = {
  AUTHORIZED_PLAN: 'Plan autorizado',
  RENOVATION: 'Remodelación',
}

const formatCurrency = (amount: number, currency: 'GTQ' | 'USD') =>
  new Intl.NumberFormat('es-GT', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)

const date = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
        <section className="w-full max-w-xl rounded-2xl border bg-white p-8 shadow-sm sm:p-10">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FolderKanban aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Gestión de infraestructura</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Proyectos bajo control</h1>
          <p className="mt-3 text-muted-foreground">
            Inicia sesión para consultar el avance, presupuesto y estado de tus proyectos.
          </p>
          <Link
            href="/auth/login"
            className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Iniciar sesión <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </main>
    )
  }

  const projectScope =
    session.user.role === UserRole.ADMIN || session.user.role === UserRole.AUDITOR
      ? {}
      : {
          OR: [
            { managerId: session.user.id },
            { creatorId: session.user.id },
            { projectSuppliers: { some: { supplier: { userId: session.user.id } } } },
          ],
        }

  const [projectCount, activeCount, budgetTotals, projects] = await Promise.all([
    prisma.project.count({ where: projectScope }),
    prisma.project.count({
      where: {
        ...projectScope,
        status: { in: [ProjectStatus.APPROVED, ProjectStatus.IN_PROGRESS] },
      },
    }),
    prisma.project.groupBy({
      by: ['currency'],
      where: projectScope,
      _sum: { totalBudget: true },
    }),
    prisma.project.findMany({
      where: projectScope,
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        status: true,
        currency: true,
        totalBudget: true,
        updatedAt: true,
        manager: { select: { name: true } },
      },
    }),
  ])

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FolderKanban className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold">Gestión de Proyectos</p>
              <p className="text-xs text-muted-foreground">Infraestructura</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/projects"
              className="inline-flex h-9 items-center gap-2 rounded-md border bg-white px-3 text-sm font-medium hover:bg-slate-50"
            >
              <Briefcase className="h-4 w-4" aria-hidden="true" />
              Proyectos
            </Link>
            {session.user.role === UserRole.ADMIN && (
              <>
                <Link
                  href="/admin/users"
                  className="inline-flex h-9 items-center gap-2 rounded-md border bg-white px-3 text-sm font-medium hover:bg-slate-50"
                >
                  <Users className="h-4 w-4" aria-hidden="true" />
                  Usuarios
                </Link>
                <Link
                  href="/admin/budget-lines"
                  className="inline-flex h-9 items-center gap-2 rounded-md border bg-white px-3 text-sm font-medium hover:bg-slate-50"
                >
                  Líneas base
                </Link>
              </>
            )}
            <div className="text-right">
              <p className="text-sm font-medium">{session.user.name || session.user.email}</p>
              <p className="text-xs text-muted-foreground">{session.user.role.replaceAll('_', ' ')}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-primary">Resumen general</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Panel de proyectos</h1>
            <p className="mt-2 text-muted-foreground">Consulta el estado y presupuesto de tus proyectos.</p>
          </div>
          <span className="inline-flex h-10 items-center gap-2 self-start rounded-md border bg-white px-4 text-sm text-muted-foreground sm:self-auto">
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            Vista de seguimiento
          </span>
        </div>

        <section aria-label="Indicadores de proyectos" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Proyectos visibles</p>
              <FolderKanban className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <p className="mt-4 text-3xl font-bold">{projectCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">En tu ámbito de acceso</p>
          </article>
          <article className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Activos</p>
              <Briefcase className="h-5 w-5 text-blue-600" aria-hidden="true" />
            </div>
            <p className="mt-4 text-3xl font-bold">{activeCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">Aprobados o en progreso</p>
          </article>
          <article className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Presupuesto total</p>
              <CircleDollarSign className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            </div>
            <p className="mt-4 text-2xl font-bold">
              {budgetTotals.length
                ? budgetTotals.map(({ currency, _sum }) => formatCurrency(Number(_sum.totalBudget ?? 0), currency)).join(' · ')
                : 'GTQ 0'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Totales por moneda de proyecto</p>
          </article>
        </section>

        <section className="mt-8 overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold">Proyectos recientes</h2>
              <p className="mt-1 text-sm text-muted-foreground">Últimos proyectos actualizados.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {projects.length} de {projectCount}
            </span>
          </div>
          {projects.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-muted-foreground">
                <Plus className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-semibold">Aún no hay proyectos para mostrar</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Cuando tengas proyectos asignados, aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-6 py-3 font-medium">Proyecto</th>
                    <th scope="col" className="px-6 py-3 font-medium">Tipo</th>
                    <th scope="col" className="px-6 py-3 font-medium">Responsable</th>
                    <th scope="col" className="px-6 py-3 font-medium">Presupuesto</th>
                    <th scope="col" className="px-6 py-3 font-medium">Estado</th>
                    <th scope="col" className="px-6 py-3 font-medium">Actualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.map(project => (
                    <tr key={project.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <p className="font-medium">{project.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{project.code}</p>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{typeLabels[project.type]}</td>
                      <td className="px-6 py-4 text-muted-foreground">{project.manager.name || 'Sin nombre'}</td>
                      <td className="px-6 py-4 font-medium">
                        {formatCurrency(Number(project.totalBudget), project.currency)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[project.status]}`}>
                          {statusLabels[project.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{date.format(project.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Los datos mostrados dependen de los permisos de tu cuenta.
        </p>
      </div>
    </main>
  )
}
