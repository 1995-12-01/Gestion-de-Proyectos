import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { ArrowLeft, Users } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { CreateUserForm } from './user-form'
import { SignOutButton } from '@/components/sign-out-button'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/auth/login')
  if (session.user.role !== UserRole.ADMIN) redirect('/')

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al panel
          </Link>
          <SignOutButton />
        </div>

        <section className="mt-6 rounded-xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Users aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">Administración</p>
              <h1 className="text-2xl font-bold tracking-tight">Crear usuario</h1>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            La cuenta se creará en Supabase Auth y quedará vinculada a un perfil y rol de la aplicación.
          </p>
          <CreateUserForm />
        </section>
      </div>
    </main>
  )
}
