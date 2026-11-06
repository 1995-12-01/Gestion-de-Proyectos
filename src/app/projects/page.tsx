import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { UserRole } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { ProjectManager } from './project-manager'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/auth/login')
  if (
    session.user.role !== UserRole.ADMIN &&
    session.user.role !== UserRole.PROJECT_MANAGER &&
    session.user.role !== UserRole.AUDITOR
  ) redirect('/')

  return (
    <ProjectManager
      canCreate={session.user.role === UserRole.ADMIN || session.user.role === UserRole.PROJECT_MANAGER}
    />
  )
}
